import secrets
from datetime import datetime, timedelta
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend import models
from backend.database import get_db

router = APIRouter(prefix="/outing", tags=["Outing Permission & Security System"])


# ---------------------------------------------------------
# Schemas
# ---------------------------------------------------------
class OutingRequestCreate(BaseModel):
    student_id: str = Field(..., description="Student ID or Roll Number", example="21CSE088")
    student_name: str = Field(..., description="Full Name", example="Rahul Kumar")
    roll_number: Optional[str] = Field(None, description="Roll Number", example="21CSE088")
    department: str = Field(..., description="Student Department (CSE, ECE, AIML, etc.)", example="CSE")
    outing_type: str = Field("Day Outing", description="Day Outing, Overnight, Emergency", example="Day Outing")
    destination: str = Field(..., description="Destination", example="City Center / Market")
    reason: str = Field(..., description="Reason for outing", example="Buying project components and books")
    departure_date: str = Field(..., description="YYYY-MM-DD", example="2026-11-08")
    departure_time: str = Field(..., description="HH:MM AM/PM", example="10:00 AM")
    expected_return_date: str = Field(..., description="YYYY-MM-DD", example="2026-11-08")
    expected_return_time: str = Field(..., description="HH:MM AM/PM", example="05:00 PM")

    model_config = ConfigDict(from_attributes=True)


class ParentActionRequest(BaseModel):
    action: str = Field(..., description="APPROVE or REJECT", example="APPROVE")
    remarks: Optional[str] = Field(None, description="Parent remarks or conditions", example="Permission granted. Return by 5 PM.")


class HODActionRequest(BaseModel):
    action: str = Field(..., description="APPROVE or REJECT", example="APPROVE")
    remarks: Optional[str] = Field(None, description="HOD remarks", example="Approved. Maintain college decorum.")


class GateScanRequest(BaseModel):
    qr_token: str = Field(..., description="Cryptographic QR token scanned from pass")
    guard_id: Optional[int] = Field(None, description="ID of guard performing the scan")
    gate_id: Optional[int] = Field(None, description="ID of gate where scan occurs")
    action_type: str = Field("AUTO", description="AUTO, EXIT, or RETURN")


class OutingPassResponse(BaseModel):
    id: int
    qr_token: str
    pass_status: str
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    actual_exit_at: Optional[datetime] = None
    actual_return_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class OutingRequestResponse(BaseModel):
    id: int
    request_no: str
    student_id: str
    student_name: str
    roll_number: Optional[str] = None
    department: str
    outing_type: str
    destination: str
    reason: str
    departure_date: str
    departure_time: str
    expected_return_date: str
    expected_return_time: str
    parent_status: str
    parent_remarks: Optional[str] = None
    parent_action_at: Optional[datetime] = None
    hod_status: str
    hod_remarks: Optional[str] = None
    hod_action_at: Optional[datetime] = None
    overall_status: str
    created_at: datetime
    pass_record: Optional[OutingPassResponse] = None

    model_config = ConfigDict(from_attributes=True)


class SecurityDashboardStats(BaseModel):
    total_approved_today: int
    students_currently_outside: int
    students_returned_today: int
    overdue_students: int
    total_active_gates: int
    total_active_guards: int


# ---------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------
def generate_request_no() -> str:
    now_str = datetime.utcnow().strftime("%Y%m%d")
    rand_suffix = secrets.token_hex(2).upper()
    return f"OUT-{now_str}-{rand_suffix}"


def generate_qr_token() -> str:
    return f"PASS_{secrets.token_urlsafe(32)}"


# ---------------------------------------------------------
# 1. Student Endpoints
# ---------------------------------------------------------
@router.post(
    "/student/request",
    response_model=OutingRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Student raises a new outing request",
)
def create_outing_request(data: OutingRequestCreate, db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(
        (models.Student.student_id == data.student_id) | (models.Student.roll_number == data.student_id)
    ).first()

    dept = data.department
    st_name = data.student_name
    roll = data.roll_number or data.student_id

    if student:
        dept = student.department or data.department
        st_name = student.name or data.student_name
        roll = student.roll_number or data.roll_number or data.student_id
        effective_student_id = student.student_id
    else:
        # Automatically register student in table if not already present
        new_student = models.Student(
            student_id=data.student_id,
            roll_number=roll,
            name=st_name,
            department=dept,
            class_name=f"{dept}-4A",
            parent_name="Parent of " + st_name,
            parent_phone="+919876543210",
        )
        db.add(new_student)
        db.commit()
        db.refresh(new_student)
        effective_student_id = new_student.student_id

    req = models.OutingRequest(
        request_no=generate_request_no(),
        student_id=effective_student_id,
        student_name=st_name,
        roll_number=roll,
        department=dept,
        outing_type=data.outing_type,
        destination=data.destination,
        reason=data.reason,
        departure_date=data.departure_date,
        departure_time=data.departure_time,
        expected_return_date=data.expected_return_date,
        expected_return_time=data.expected_return_time,
        parent_status="PENDING",
        hod_status="PENDING",
        overall_status="PENDING_PARENT",
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@router.get(
    "/student/my-requests",
    response_model=List[OutingRequestResponse],
    summary="Get all outing requests submitted by a student",
)
def get_my_outing_requests(student_id: str, db: Session = Depends(get_db)):
    requests = (
        db.query(models.OutingRequest)
        .filter(
            (models.OutingRequest.student_id == student_id)
            | (models.OutingRequest.roll_number == student_id)
        )
        .order_by(models.OutingRequest.created_at.desc())
        .all()
    )
    return requests


# ---------------------------------------------------------
# 2. Parent Endpoints
# ---------------------------------------------------------
@router.get(
    "/parent/requests",
    response_model=List[OutingRequestResponse],
    summary="Get requests pending or historical for parent approval",
)
def get_parent_requests(
    student_id: Optional[str] = None,
    parent_phone: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.OutingRequest)
    if student_id:
        query = query.filter(
            (models.OutingRequest.student_id == student_id)
            | (models.OutingRequest.roll_number == student_id)
        )
    if parent_phone:
        # Match student by parent_phone
        matching_students = db.query(models.Student.student_id).filter(
            models.Student.parent_phone == parent_phone
        ).all()
        ids = [s[0] for s in matching_students]
        if ids:
            query = query.filter(models.OutingRequest.student_id.in_(ids))

    return query.order_by(models.OutingRequest.created_at.desc()).all()


@router.post(
    "/parent/{request_id}/action",
    response_model=OutingRequestResponse,
    summary="Parent approves or rejects an outing request",
)
def parent_action(
    request_id: int,
    payload: ParentActionRequest,
    db: Session = Depends(get_db),
):
    req = db.query(models.OutingRequest).filter(models.OutingRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Outing request not found.")

    act = payload.action.strip().upper()
    if act not in ["APPROVE", "REJECT"]:
        raise HTTPException(status_code=400, detail="Action must be APPROVE or REJECT.")

    req.parent_action_at = datetime.utcnow()
    req.parent_remarks = payload.remarks

    if act == "APPROVE":
        req.parent_status = "APPROVED"
        req.overall_status = "PENDING_HOD"  # Automatically forwards to Respective HOD!
    else:
        req.parent_status = "REJECTED"
        req.overall_status = "REJECTED_BY_PARENT"

    db.commit()
    db.refresh(req)
    return req


# ---------------------------------------------------------
# 3. Respective HOD Endpoints
# ---------------------------------------------------------
@router.get(
    "/hod/requests",
    response_model=List[OutingRequestResponse],
    summary="Get outing requests scoped to the respective HOD's department",
)
def get_hod_requests(
    department: str = Query(..., description="HOD's department (e.g. CSE, ECE)"),
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
):
    # Notice: STRICT department scoping prevents other HODs from accessing this!
    query = db.query(models.OutingRequest).filter(
        func.lower(models.OutingRequest.department) == department.strip().lower()
    )

    if status_filter:
        query = query.filter(models.OutingRequest.overall_status == status_filter)
    else:
        # By default, prioritize PENDING_HOD requests (where parent has already approved)
        query = query.filter(models.OutingRequest.parent_status == "APPROVED")

    return query.order_by(models.OutingRequest.created_at.desc()).all()


@router.post(
    "/hod/{request_id}/action",
    response_model=OutingRequestResponse,
    summary="Respective HOD approves or rejects an outing request",
)
def hod_action(
    request_id: int,
    payload: HODActionRequest,
    db: Session = Depends(get_db),
):
    req = db.query(models.OutingRequest).filter(models.OutingRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Outing request not found.")

    if req.parent_status != "APPROVED":
        raise HTTPException(
            status_code=400,
            detail="Cannot action request: Parent has not yet approved this outing.",
        )

    act = payload.action.strip().upper()
    if act not in ["APPROVE", "REJECT"]:
        raise HTTPException(status_code=400, detail="Action must be APPROVE or REJECT.")

    req.hod_action_at = datetime.utcnow()
    req.hod_remarks = payload.remarks

    if act == "APPROVE":
        req.hod_status = "APPROVED"
        req.overall_status = "APPROVED"

        # Generate cryptographic Outing Pass and QR token
        existing_pass = db.query(models.OutingPass).filter(
            models.OutingPass.outing_request_id == req.id
        ).first()

        now = datetime.utcnow()
        if not existing_pass:
            new_pass = models.OutingPass(
                outing_request_id=req.id,
                qr_token=generate_qr_token(),
                valid_from=now,
                valid_until=now + timedelta(hours=24),
                pass_status="ISSUED",
            )
            db.add(new_pass)
        else:
            existing_pass.pass_status = "ISSUED"
    else:
        req.hod_status = "REJECTED"
        req.overall_status = "REJECTED_BY_HOD"

    db.commit()
    db.refresh(req)
    return req


# ---------------------------------------------------------
# 4. Security Admin Endpoints
# ---------------------------------------------------------
@router.get(
    "/security/admin/dashboard",
    response_model=SecurityDashboardStats,
    summary="Dashboard metrics for Security Admin",
)
def get_security_dashboard(db: Session = Depends(get_db)):
    total_approved = db.query(models.OutingRequest).filter(
        models.OutingRequest.overall_status.in_(["APPROVED", "EXITED", "RETURNED"])
    ).count()

    outside_count = db.query(models.OutingPass).filter(
        models.OutingPass.pass_status == "EXITED"
    ).count()

    returned_count = db.query(models.OutingPass).filter(
        models.OutingPass.pass_status == "RETURNED"
    ).count()

    overdue_count = db.query(models.OutingPass).filter(
        models.OutingPass.pass_status == "EXITED",
        models.OutingPass.valid_until < datetime.utcnow(),
    ).count()

    active_gates = db.query(models.SecurityGate).filter(models.SecurityGate.is_active == 1).count()
    active_guards = db.query(models.SecurityGuard).filter(models.SecurityGuard.is_active == 1).count()

    return SecurityDashboardStats(
        total_approved_today=total_approved,
        students_currently_outside=outside_count,
        students_returned_today=returned_count,
        overdue_students=overdue_count,
        total_active_gates=active_gates,
        total_active_guards=active_guards,
    )


@router.get(
    "/security/admin/approved-list",
    response_model=List[OutingRequestResponse],
    summary="All HOD-approved outings stream for Security Admin",
)
def get_security_approved_list(
    department: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.OutingRequest).filter(
        models.OutingRequest.overall_status.in_(["APPROVED", "EXITED", "RETURNED"])
    )

    if department and department != "All":
        query = query.filter(models.OutingRequest.department == department)
    if status_filter and status_filter != "All":
        query = query.filter(models.OutingRequest.overall_status == status_filter)

    return query.order_by(models.OutingRequest.created_at.desc()).all()


@router.get(
    "/security/gates",
    summary="List all security gates and their assigned guards",
)
def list_security_gates(db: Session = Depends(get_db)):
    gates = db.query(models.SecurityGate).all()
    guards = db.query(models.SecurityGuard).all()
    return {
        "gates": [
            {
                "id": g.id,
                "gate_name": g.gate_name,
                "location_code": g.location_code,
                "is_active": bool(g.is_active),
            }
            for g in gates
        ],
        "guards": [
            {
                "id": gd.id,
                "badge_number": gd.badge_number,
                "name": gd.name,
                "phone": gd.phone,
                "assigned_gate_id": gd.assigned_gate_id,
                "is_active": bool(gd.is_active),
            }
            for gd in guards
        ],
    }


# ---------------------------------------------------------
# 5. Security Gate Scanner Endpoints (The Physical Gate Verification)
# ---------------------------------------------------------
@router.post(
    "/security/gate/verify-scan",
    summary="Verify student QR code at security gate and record Exit/Return",
)
def verify_gate_scan(payload: GateScanRequest, db: Session = Depends(get_db)):
    # 1. Lookup Outing Pass
    outing_pass = (
        db.query(models.OutingPass)
        .filter(models.OutingPass.qr_token == payload.qr_token.strip())
        .first()
    )

    if not outing_pass:
        # Log failed scan
        db.add(
            models.GateScanLog(
                outing_pass_id=None,
                student_id="UNKNOWN",
                guard_id=payload.guard_id,
                gate_id=payload.gate_id,
                scan_type="UNKNOWN",
                scan_result="DENIED",
                remarks="Invalid or unverified QR token.",
            )
        )
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="INVALID_PASS: QR pass not recognized or forged.",
        )

    req = outing_pass.request
    guard = db.query(models.SecurityGuard).filter(models.SecurityGuard.id == payload.guard_id).first()
    gate = db.query(models.SecurityGate).filter(models.SecurityGate.id == payload.gate_id).first()

    guard_name = guard.name if guard else "Security Officer"
    gate_name = gate.gate_name if gate else "Main Gate"

    now = datetime.utcnow()

    # 2. Check if Parent & HOD approved
    if req.parent_status != "APPROVED" or req.hod_status != "APPROVED":
        db.add(
            models.GateScanLog(
                outing_pass_id=outing_pass.id,
                student_id=req.student_id,
                student_name=req.student_name,
                guard_id=payload.guard_id,
                guard_name=guard_name,
                gate_id=payload.gate_id,
                gate_name=gate_name,
                scan_type="VERIFY",
                scan_result="DENIED",
                remarks="Approvals incomplete (Parent or HOD not approved).",
            )
        )
        db.commit()
        return {
            "status": "DENIED",
            "message": "APPROVAL_INCOMPLETE: Outing has not received all required approvals.",
            "student_name": req.student_name,
            "department": req.department,
        }

    # 3. Determine if this scan is EXIT or RETURN
    # If the pass is currently ISSUED -> This is an EXIT scan.
    # If the pass is currently EXITED -> This is a RETURN scan.
    action = payload.action_type.upper()
    if action == "AUTO":
        if outing_pass.pass_status == "ISSUED":
            action = "EXIT"
        elif outing_pass.pass_status == "EXITED":
            action = "RETURN"
        elif outing_pass.pass_status == "RETURNED":
            return {
                "status": "ALREADY_COMPLETED",
                "message": "This outing pass was already used for exit and return.",
                "student_name": req.student_name,
                "department": req.department,
                "exit_time": outing_pass.actual_exit_at.isoformat() if outing_pass.actual_exit_at else None,
                "return_time": outing_pass.actual_return_at.isoformat() if outing_pass.actual_return_at else None,
            }

    # Process EXIT
    if action == "EXIT":
        if outing_pass.pass_status == "EXITED":
            return {
                "status": "ALREADY_EXITED",
                "message": "Student has already checked out through the gate.",
                "student_name": req.student_name,
                "department": req.department,
            }

        outing_pass.pass_status = "EXITED"
        outing_pass.actual_exit_at = now
        outing_pass.exit_guard_id = payload.guard_id
        outing_pass.exit_gate_id = payload.gate_id
        req.overall_status = "EXITED"

        db.add(
            models.GateScanLog(
                outing_pass_id=outing_pass.id,
                student_id=req.student_id,
                student_name=req.student_name,
                guard_id=payload.guard_id,
                guard_name=guard_name,
                gate_id=payload.gate_id,
                gate_name=gate_name,
                scan_type="EXIT",
                scan_result="ALLOWED",
                remarks="Authorized Exit approved by gate officer.",
            )
        )
        db.commit()

        return {
            "status": "ALLOWED_EXIT",
            "message": f"Exit Authorized at {gate_name} by {guard_name}.",
            "student_id": req.student_id,
            "student_name": req.student_name,
            "roll_number": req.roll_number,
            "department": req.department,
            "destination": req.destination,
            "expected_return": f"{req.expected_return_date} {req.expected_return_time}",
            "exit_timestamp": now.strftime("%Y-%m-%d %I:%M %p"),
        }

    # Process RETURN
    elif action == "RETURN":
        outing_pass.pass_status = "RETURNED"
        outing_pass.actual_return_at = now
        outing_pass.return_guard_id = payload.guard_id
        outing_pass.return_gate_id = payload.gate_id
        req.overall_status = "RETURNED"

        # Check if overdue
        is_overdue = False
        if outing_pass.valid_until and now > outing_pass.valid_until:
            is_overdue = True

        db.add(
            models.GateScanLog(
                outing_pass_id=outing_pass.id,
                student_id=req.student_id,
                student_name=req.student_name,
                guard_id=payload.guard_id,
                guard_name=guard_name,
                gate_id=payload.gate_id,
                gate_name=gate_name,
                scan_type="RETURN",
                scan_result="ALLOWED" if not is_overdue else "ALLOWED_OVERDUE",
                remarks="Student returned to campus." if not is_overdue else "Student returned OVERDUE past curfew.",
            )
        )
        db.commit()

        return {
            "status": "ALLOWED_RETURN",
            "message": f"Return Logged at {gate_name}. Student safely back on campus.",
            "student_id": req.student_id,
            "student_name": req.student_name,
            "department": req.department,
            "is_overdue": is_overdue,
            "return_timestamp": now.strftime("%Y-%m-%d %I:%M %p"),
        }

    raise HTTPException(status_code=400, detail="Invalid action type.")


@router.get(
    "/security/gate/logs",
    summary="Get recent gate scanning audit logs",
)
def get_gate_logs(limit: int = 25, db: Session = Depends(get_db)):
    logs = (
        db.query(models.GateScanLog)
        .order_by(models.GateScanLog.scan_timestamp.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": l.id,
            "student_id": l.student_id,
            "student_name": l.student_name,
            "gate_name": l.gate_name,
            "guard_name": l.guard_name,
            "scan_type": l.scan_type,
            "scan_result": l.scan_result,
            "timestamp": l.scan_timestamp.strftime("%Y-%m-%d %I:%M:%S %p"),
            "remarks": l.remarks,
        }
        for l in logs
    ]
