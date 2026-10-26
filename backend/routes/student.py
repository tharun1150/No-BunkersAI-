from datetime import date as dt_date, datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy.orm import Session

from backend import models
from backend.database import get_db

router = APIRouter(prefix="/students", tags=["Students & Attendance"])


# ---------------------------------------------------------
# Schemas / Data Classes for Student Operations
# ---------------------------------------------------------
class StudentBase(BaseModel):
    student_id: Optional[str] = Field(
        None, description="Unique student ID / identifier (defaults to roll_number or student_no if omitted)", example="STU1001"
    )
    roll_number: Optional[str] = Field(
        None, description="Student roll number", example="21CSE101"
    )
    student_no: Optional[str] = Field(
        None, description="Student contact/phone number or student number", example="9876543210"
    )
    name: str = Field(..., description="Full name of student", example="John Doe")
    class_name: Optional[str] = Field(
        None, alias="class", description="Grade, year, or class section", example="10-A"
    )
    department: Optional[str] = Field(
        None, description="Department (e.g., Computer Science, Mechanical)", example="Computer Science"
    )
    parent_name: Optional[str] = Field(
        None, description="Name of parent or guardian", example="Robert Doe"
    )
    parent_phone: Optional[str] = Field(
        None, description="Parent contact phone number", example="+1234567890"
    )

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def normalize_aliases(cls, data: Any):
        if isinstance(data, dict):
            # Accept rool_number or roll_no as aliases for roll_number
            if "rool_number" in data and "roll_number" not in data:
                data["roll_number"] = data["rool_number"]
            if "roll_no" in data and "roll_number" not in data:
                data["roll_number"] = data["roll_no"]
            if "student_phone" in data and "student_no" not in data:
                data["student_no"] = data["student_phone"]
        return data


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    roll_number: Optional[str] = Field(None, example="21CSE101")
    student_no: Optional[str] = Field(None, example="9876543210")
    name: Optional[str] = Field(None, example="Johnathan Doe")
    class_name: Optional[str] = Field(None, alias="class", example="10-B")
    department: Optional[str] = Field(None, example="Information Technology")
    parent_name: Optional[str] = Field(None, example="Robert Doe")
    parent_phone: Optional[str] = Field(None, example="+1987654321")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def normalize_aliases(cls, data: Any):
        if isinstance(data, dict):
            if "rool_number" in data and "roll_number" not in data:
                data["roll_number"] = data["rool_number"]
            if "roll_no" in data and "roll_number" not in data:
                data["roll_number"] = data["roll_no"]
            if "student_phone" in data and "student_no" not in data:
                data["student_no"] = data["student_phone"]
        return data


class StudentResponse(StudentBase):
    id: int
    student_id: str
    created_at: datetime

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


# ---------------------------------------------------------
# Schemas for Attendance Operations
# ---------------------------------------------------------
class StudentAttendanceMarkInput(BaseModel):
    status: str = Field(..., description="Present, Absent, or Late", example="Present")
    subject: Optional[str] = Field(None, example="Machine Learning")
    date: Optional[str] = Field(None, example="2026-10-25")
    time_slot: Optional[str] = Field(None, example="10:00 AM")
    faculty_name: Optional[str] = Field(None, example="Dr. Rajesh Kumar")
    remarks: Optional[str] = Field(None, example="Attended lecture")


class StudentAttendanceItem(BaseModel):
    student_id: str = Field(..., description="Roll number or student_id", example="21CSE088")
    status: str = Field(..., description="Present, Absent, or Late", example="Present")
    remarks: Optional[str] = Field(None, example=None)


class BulkAttendanceInput(BaseModel):
    subject: str = Field(..., example="Machine Learning")
    date: Optional[str] = Field(None, example="2026-10-25")
    time_slot: Optional[str] = Field(None, example="10:00 AM")
    faculty_name: Optional[str] = Field(None, example="Dr. Rajesh Kumar")
    section: Optional[str] = Field(None, example="CSE-4A")
    records: List[StudentAttendanceItem] = Field(..., description="List of student attendance entries")


class AttendanceRecordResponse(BaseModel):
    id: int
    student_id: str
    student_name: Optional[str] = None
    status: str
    subject: Optional[str] = None
    date: Optional[str] = None
    time_slot: Optional[str] = None
    faculty_name: Optional[str] = None
    section: Optional[str] = None
    remarks: Optional[str] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class StudentAttendanceSummary(BaseModel):
    student_id: str
    student_name: str
    roll_number: Optional[str] = None
    class_name: Optional[str] = None
    department: Optional[str] = None
    total_classes: int
    present: int
    absent: int
    late: int
    attendance_percentage: float
    status: str  # safe, warning, critical
    records: List[AttendanceRecordResponse]


# ---------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------
def normalize_status(raw_status: str) -> str:
    s = raw_status.strip().capitalize()
    if s in ["Present", "P"]:
        return "Present"
    elif s in ["Absent", "A"]:
        return "Absent"
    elif s in ["Late", "L"]:
        return "Late"
    return s


def find_student(identifier: str, db: Session) -> Optional[models.Student]:
    return (
        db.query(models.Student)
        .filter(
            (models.Student.student_id == identifier)
            | (models.Student.roll_number == identifier)
        )
        .first()
    )


# ---------------------------------------------------------
# Student Base CRUD Operations
# ---------------------------------------------------------

# 1. CREATE Student
@router.post(
    "/",
    response_model=StudentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new student with roll number, student no, class, and department",
)
def create_student(student_data: StudentCreate, db: Session = Depends(get_db)):
    assigned_id = (
        student_data.student_id
        or student_data.roll_number
        or student_data.student_no
    )
    if not assigned_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one of 'student_id', 'roll_number', or 'student_no' must be provided.",
        )

    # Check for existing student
    query = db.query(models.Student).filter(
        (models.Student.student_id == assigned_id)
        | (
            (models.Student.roll_number == student_data.roll_number)
            & (models.Student.roll_number.isnot(None))
        )
    )
    existing_student = query.first()
    if existing_student:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Student with identifier '{assigned_id}' already exists.",
        )

    new_student = models.Student(
        student_id=assigned_id,
        roll_number=student_data.roll_number or assigned_id,
        student_no=student_data.student_no,
        name=student_data.name,
        class_name=student_data.class_name,
        department=student_data.department,
        parent_name=student_data.parent_name,
        parent_phone=student_data.parent_phone,
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    return new_student


# 2. READ ALL Students
@router.get(
    "/",
    response_model=List[StudentResponse],
    summary="Get all students with optional filters",
)
def get_all_students(
    class_name: Optional[str] = None,
    department: Optional[str] = None,
    roll_number: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(models.Student)
    if class_name:
        query = query.filter(models.Student.class_name == class_name)
    if department:
        query = query.filter(models.Student.department == department)
    if roll_number:
        query = query.filter(models.Student.roll_number == roll_number)

    students = query.offset(skip).limit(limit).all()
    return students


# ---------------------------------------------------------
# Attendance Operations (Inside Student Router)
# ---------------------------------------------------------

# 3. Mark Bulk Attendance (Teacher/Faculty Session)
@router.post(
    "/attendance/bulk",
    summary="Teacher / Faculty session marking for entire class",
)
def mark_bulk_attendance(data: BulkAttendanceInput, db: Session = Depends(get_db)):
    record_date = data.date or dt_date.today().isoformat()
    total_saved = 0
    present_count = 0
    absent_count = 0
    late_count = 0

    for item in data.records:
        student = find_student(item.student_id, db)
        assigned_id = student.student_id if student else item.student_id
        stat = normalize_status(item.status)

        if stat == "Present":
            present_count += 1
        elif stat == "Absent":
            absent_count += 1
        elif stat == "Late":
            late_count += 1

        record = models.Attendance(
            student_id=assigned_id,
            status=stat,
            subject=data.subject,
            date=record_date,
            time_slot=data.time_slot,
            faculty_name=data.faculty_name,
            section=data.section or (student.class_name if student else None),
            remarks=item.remarks,
            timestamp=datetime.utcnow(),
        )
        db.add(record)
        total_saved += 1

    db.commit()

    return {
        "message": f"Successfully saved live attendance for {total_saved} students in '{data.subject}'.",
        "date": record_date,
        "subject": data.subject,
        "section": data.section,
        "faculty_name": data.faculty_name,
        "total_marked": total_saved,
        "present": present_count,
        "absent": absent_count,
        "late": late_count,
        "attendance_rate": f"{(present_count / max(total_saved, 1)) * 100:.1f}%",
    }


# 4. Live Attendance Feed
@router.get(
    "/attendance/live",
    response_model=List[AttendanceRecordResponse],
    summary="Get recent live attendance records across students",
)
def get_live_attendance(
    date: Optional[str] = None,
    subject: Optional[str] = None,
    section: Optional[str] = None,
    status_filter: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(models.Attendance)

    if date:
        query = query.filter(models.Attendance.date == date)
    if subject:
        query = query.filter(models.Attendance.subject == subject)
    if section:
        query = query.filter(models.Attendance.section == section)
    if status_filter:
        query = query.filter(models.Attendance.status == normalize_status(status_filter))

    records = query.order_by(models.Attendance.timestamp.desc()).limit(limit).all()

    student_ids = {r.student_id for r in records}
    students_map = {
        s.student_id: s.name
        for s in db.query(models.Student).filter(models.Student.student_id.in_(student_ids)).all()
    }

    return [
        AttendanceRecordResponse(
            id=r.id,
            student_id=r.student_id,
            student_name=students_map.get(r.student_id),
            status=r.status,
            subject=r.subject,
            date=r.date,
            time_slot=r.time_slot,
            faculty_name=r.faculty_name,
            section=r.section,
            remarks=r.remarks,
            timestamp=r.timestamp,
        )
        for r in records
    ]


# 5. Mark Attendance for a Specific Student
@router.post(
    "/{identifier}/attendance",
    status_code=status.HTTP_201_CREATED,
    summary="Mark attendance for a specific student",
)
def mark_student_attendance(
    identifier: str,
    att_data: StudentAttendanceMarkInput,
    db: Session = Depends(get_db),
):
    student = find_student(identifier, db)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with identifier '{identifier}' not found in database.",
        )

    rec_date = att_data.date or dt_date.today().isoformat()
    stat = normalize_status(att_data.status)

    record = models.Attendance(
        student_id=student.student_id,
        status=stat,
        subject=att_data.subject,
        date=rec_date,
        time_slot=att_data.time_slot,
        faculty_name=att_data.faculty_name,
        section=student.class_name,
        remarks=att_data.remarks,
        timestamp=datetime.utcnow(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "message": f"Attendance recorded as '{stat}' for {student.name}",
        "attendance_id": record.id,
        "student_id": student.student_id,
        "roll_number": student.roll_number,
        "status": record.status,
        "subject": record.subject,
        "date": record.date,
        "faculty_name": record.faculty_name,
        "timestamp": record.timestamp,
    }


# 6. Get Attendance Summary and Records for a Specific Student
@router.get(
    "/{identifier}/attendance",
    response_model=StudentAttendanceSummary,
    summary="Get attendance summary, percentage, and history for a student",
)
def get_student_attendance(identifier: str, db: Session = Depends(get_db)):
    student = find_student(identifier, db)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with identifier '{identifier}' not found in database.",
        )

    records = (
        db.query(models.Attendance)
        .filter(models.Attendance.student_id == student.student_id)
        .order_by(models.Attendance.timestamp.desc())
        .all()
    )

    total = len(records)
    present = sum(1 for r in records if r.status == "Present")
    absent = sum(1 for r in records if r.status == "Absent")
    late = sum(1 for r in records if r.status == "Late")
    pct = round((present / max(total, 1)) * 100, 1)

    record_responses = [
        AttendanceRecordResponse(
            id=r.id,
            student_id=r.student_id,
            student_name=student.name,
            status=r.status,
            subject=r.subject,
            date=r.date,
            time_slot=r.time_slot,
            faculty_name=r.faculty_name,
            section=r.section,
            remarks=r.remarks,
            timestamp=r.timestamp,
        )
        for r in records
    ]

    return StudentAttendanceSummary(
        student_id=student.student_id,
        student_name=student.name,
        roll_number=student.roll_number,
        class_name=student.class_name,
        department=student.department,
        total_classes=total,
        present=present,
        absent=absent,
        late=late,
        attendance_percentage=pct,
        status="safe" if pct >= 85 else "warning" if pct >= 75 else "critical",
        records=record_responses,
    )


# ---------------------------------------------------------
# Student Individual Details Operations
# ---------------------------------------------------------

# 7. READ ONE Student
@router.get(
    "/{identifier}",
    response_model=StudentResponse,
    summary="Get a student by student ID or roll number",
)
def get_student(identifier: str, db: Session = Depends(get_db)):
    student = find_student(identifier, db)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with identifier '{identifier}' not found.",
        )
    return student


# 8. UPDATE Student
@router.put(
    "/{identifier}",
    response_model=StudentResponse,
    summary="Update student details",
)
def update_student(
    identifier: str,
    update_data: StudentUpdate,
    db: Session = Depends(get_db),
):
    student = find_student(identifier, db)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with identifier '{identifier}' not found.",
        )

    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(student, field, value)

    db.commit()
    db.refresh(student)
    return student


# 9. DELETE Student
@router.delete(
    "/{identifier}",
    summary="Delete a student",
)
def delete_student(identifier: str, db: Session = Depends(get_db)):
    student = find_student(identifier, db)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with identifier '{identifier}' not found.",
        )

    # Delete related attendance records first
    db.query(models.Attendance).filter(models.Attendance.student_id == student.student_id).delete()
    db.delete(student)
    db.commit()
    return {
        "message": f"Student '{identifier}' deleted successfully.",
        "identifier": identifier,
    }
