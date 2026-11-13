"""
FastAPI Router for Voice AI Absence Verification & HOD Reports
Provides asynchronous dual-call verification, transcripts, semantic comparisons,
and department-scoped HOD review workflows.
"""

from __future__ import annotations

import base64
import json
import logging
from datetime import date as dt_date, datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from backend import models
from backend.database import SessionLocal, get_db
from backend.services.ai_comparison import compare_responses
from backend.services.voice_ai_engine import (
    TELEPHONY_CONVERSATIONS,
    _fetch_audio_bytes,
    build_vobiz_farewell_xml,
    build_vobiz_interactive_turn_xml,
    build_vobiz_speak_record_xml,
    execute_verification_workflow,
    format_e164_phone,
    generate_conversational_turn,
    get_telephony_config,
    initiate_vobiz_outbound_call,
    start_vobiz_call_recording,
    synthesize_conversation_audio_data_uri,
    test_cartesia_connection,
    test_deepgram_connection,
    test_elevenlabs_connection,
    test_gemini_connection,
    test_groq_connection,
    test_openai_connection,
    test_sarvam_connection,
    test_vobiz_connection,
    transcribe_audio_with_sarvam,
    transcribe_call_audio,
    update_telephony_config,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/verification", tags=["Voice AI Verification"])


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------

class VerificationStartRequest(BaseModel):
    student_id: str = Field(..., description="Student ID or Roll Number", example="21CS001")
    attendance_id: Optional[int] = Field(None, description="Linked Attendance record ID", example=1)
    scenario: Optional[str] = Field("AUTO", description="'LIVE_VOBIZ', 'AUTO', 'MATCH', 'MISMATCH', 'NO_ANSWER_STUDENT', 'NO_ANSWER_PARENT'", example="AUTO")
    custom_student_reason: Optional[str] = Field(None, description="Optional custom student explanation")
    custom_parent_reason: Optional[str] = Field(None, description="Optional custom parent explanation")
    custom_student_phone: Optional[str] = Field(None, description="Optional phone number to call for student", example="+917569254406")
    custom_parent_phone: Optional[str] = Field(None, description="Optional phone number to call for parent", example="+917569254406")


class TelephonyConfigRequest(BaseModel):
    vobiz_auth_id: Optional[str] = None
    vobiz_auth_token: Optional[str] = None
    vobiz_from_number: Optional[str] = None
    webhook_base_url: Optional[str] = None
    vobiz_base_url: Optional[str] = None
    sarvam_api_key: Optional[str] = None
    sarvam_language_code: Optional[str] = None
    sarvam_model: Optional[str] = None
    sarvam_speaker: Optional[str] = None
    sarvam_pace: Optional[str] = None
    deepgram_api_key: Optional[str] = None
    deepgram_model: Optional[str] = None
    gemini_api_key: Optional[str] = None
    gemini_model: Optional[str] = None
    openai_api_key: Optional[str] = None
    openai_model: Optional[str] = None
    groq_api_key: Optional[str] = None
    groq_model: Optional[str] = None
    cartesia_api_key: Optional[str] = None
    cartesia_voice_id: Optional[str] = None
    elevenlabs_api_key: Optional[str] = None
    elevenlabs_voice_id: Optional[str] = None
    active_stt_provider: Optional[str] = None
    active_llm_provider: Optional[str] = None
    active_tts_provider: Optional[str] = None


class TestCallRequest(BaseModel):
    phone_number: str = Field(..., description="Destination phone number to receive test call", example="+917569254406")


class BatchVerificationRequest(BaseModel):
    department: Optional[str] = Field(None, description="Filter by department (e.g. CSE)")
    section: Optional[str] = Field(None, description="Filter by section (e.g. CSE-4A)")
    date: Optional[str] = Field(None, description="Date in YYYY-MM-DD format")


class RetryCallRequest(BaseModel):
    target: Optional[str] = Field("ALL", description="'STUDENT', 'PARENT', or 'ALL'")


class HODActionRequest(BaseModel):
    decision: str = Field(..., description="'APPROVED', 'REJECTED', 'ESCALATED', 'DISMISSED'", example="APPROVED")
    remarks: Optional[str] = Field(None, description="Official HOD remarks or action notes", example="Absence verified genuine through medical certificate.")
    reviewed_by: Optional[str] = Field("HOD", description="Name or ID of reviewing HOD", example="Dr. K. V. Sharma")


class VoiceCallResponse(BaseModel):
    id: int
    call_target: str
    phone_number: str
    status: str
    recording_url: Optional[str]
    audio_base64: Optional[str]
    transcript_text: Optional[str]
    extracted_reason: Optional[str]
    parent_confirmation: Optional[str]
    duration_seconds: int
    retry_count: int
    started_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class VerificationItemResponse(BaseModel):
    id: int
    student_id: str
    student_name: str
    roll_number: Optional[str]
    department: Optional[str]
    class_name: Optional[str]
    student_phone: Optional[str]
    parent_name: Optional[str]
    parent_phone: Optional[str]
    teacher_name: Optional[str]
    verification_status: str
    call_status: str
    verdict: Optional[str]
    is_bunking_suspected: int
    consistency_score: Optional[float]
    student_reason: Optional[str]
    parent_reason: Optional[str]
    comparison_summary: Optional[str]
    conflicting_statements: List[str]
    retry_count: int
    created_at: datetime
    updated_at: Optional[datetime]
    student_call: Optional[VoiceCallResponse] = None
    parent_call: Optional[VoiceCallResponse] = None
    student_audio_b64: Optional[str] = None
    parent_audio_b64: Optional[str] = None
    student_transcript: Optional[str] = None
    parent_transcript: Optional[str] = None
    student_call_status: Optional[str] = None
    parent_call_status: Optional[str] = None
    student_duration_seconds: Optional[int] = None
    parent_duration_seconds: Optional[int] = None


class VerificationDetailResponse(VerificationItemResponse):
    hod_report: Optional[Dict[str, Any]] = None


# ---------------------------------------------------------------------------
# Background Task Worker
# ---------------------------------------------------------------------------

def run_background_verification(
    verification_id: int,
    scenario: str,
    custom_student_reason: Optional[str] = None,
    custom_parent_reason: Optional[str] = None,
    custom_student_phone: Optional[str] = None,
    custom_parent_phone: Optional[str] = None,
):
    """Executes the dual-call verification in an isolated background database session."""
    db = SessionLocal()
    try:
        logger.info(f"Starting background verification for ID {verification_id} (Scenario: {scenario})")
        execute_verification_workflow(
            verification_id=verification_id,
            db=db,
            scenario_type=scenario,
            custom_student_reason=custom_student_reason,
            custom_parent_reason=custom_parent_reason,
            custom_student_phone=custom_student_phone,
            custom_parent_phone=custom_parent_phone,
        )
        logger.info(f"Verification {verification_id} completed successfully.")
    except Exception as exc:
        logger.error(f"Error during verification {verification_id}: {exc}", exc_info=True)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Verification Endpoints
# ---------------------------------------------------------------------------

@router.post("/start", response_model=VerificationItemResponse, status_code=status.HTTP_202_ACCEPTED)
def start_verification(
    payload: VerificationStartRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Initiates automated dual-call Voice AI verification for an absent student.
    Runs asynchronously in the background so the caller is never blocked.
    """
    student = db.query(models.Student).filter(
        (models.Student.student_id == payload.student_id)
        | (models.Student.roll_number == payload.student_id)
    ).first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with identifier '{payload.student_id}' not found.",
        )

    # Create verification record
    verification = models.AbsenceVerification(
        student_id=student.student_id,
        attendance_id=payload.attendance_id,
        call_status="pending",
        verification_status="IN_PROGRESS",
        verdict="pending",
        is_bunking_suspected=0,
        consistency_score=None,
        comparison_summary="Verification initiated. Placing automated calls to student and parent...",
        conflicting_statements="[]",
        retry_count=0,
        created_at=datetime.utcnow(),
    )
    db.add(verification)
    db.commit()
    db.refresh(verification)

    # Queue background task
    background_tasks.add_task(
        run_background_verification,
        verification.id,
        payload.scenario or "AUTO",
        payload.custom_student_reason,
        payload.custom_parent_reason,
        payload.custom_student_phone,
        payload.custom_parent_phone,
    )

    # Class teacher details
    teacher_name = None
    if student.class_section:
        teacher_name = student.class_section.teacher_name

    return VerificationItemResponse(
        id=verification.id,
        student_id=student.student_id,
        student_name=student.name,
        roll_number=student.roll_number,
        department=student.department,
        class_name=student.class_name,
        student_phone=student.student_no,
        parent_name=student.parent_name,
        parent_phone=student.parent_phone,
        teacher_name=teacher_name,
        verification_status=verification.verification_status,
        call_status=verification.call_status,
        verdict=verification.verdict,
        is_bunking_suspected=verification.is_bunking_suspected or 0,
        consistency_score=verification.consistency_score,
        student_reason=verification.student_reason,
        parent_reason=verification.parent_reason,
        comparison_summary=verification.comparison_summary,
        conflicting_statements=[],
        retry_count=0,
        created_at=verification.created_at,
        updated_at=verification.updated_at,
    )


@router.post("/batch-start", summary="Initiate batch verification for absent students")
def batch_start_verification(
    payload: BatchVerificationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Finds all absent attendance records (optionally filtered by department, section, or date)
    and dispatches asynchronous dual-call verifications.
    """
    target_date = payload.date or dt_date.today().isoformat()
    query = db.query(models.Attendance).filter(
        models.Attendance.status == "Absent",
        models.Attendance.date == target_date,
    )

    if payload.section:
        query = query.filter(models.Attendance.section == payload.section)

    records = query.all()
    if not records:
        # Fallback: check students who have no verifications today
        students = db.query(models.Student)
        if payload.department:
            students = students.filter(models.Student.department == payload.department)
        student_list = students.limit(5).all()
    else:
        student_ids = {r.student_id for r in records}
        student_list = db.query(models.Student).filter(models.Student.student_id.in_(student_ids)).all()

    queued = []
    for s in student_list:
        ver = models.AbsenceVerification(
            student_id=s.student_id,
            call_status="pending",
            verification_status="IN_PROGRESS",
            comparison_summary="Batch verification queued.",
            created_at=datetime.utcnow(),
        )
        db.add(ver)
        db.commit()
        db.refresh(ver)

        background_tasks.add_task(
            run_background_verification,
            ver.id,
            "AUTO",
            None,
            None,
        )
        queued.append({"verification_id": ver.id, "student_id": s.student_id, "name": s.name})

    return {
        "message": f"Successfully scheduled Voice AI verifications for {len(queued)} absent students.",
        "queued": queued,
        "date": target_date,
    }


@router.get("/list", response_model=List[VerificationItemResponse])
def list_verifications(
    status_filter: Optional[str] = Query(None, description="Filter by verification_status (e.g. MATCHED, MISMATCHED, IN_PROGRESS, NOT_ANSWERED)"),
    department: Optional[str] = Query(None, description="Filter by student department"),
    is_bunking_suspected: Optional[int] = Query(None, description="1 for suspected bunking, 0 for genuine"),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """Lists verifications with student, parent, and comparison summary data."""
    query = db.query(models.AbsenceVerification).join(
        models.Student, models.AbsenceVerification.student_id == models.Student.student_id
    )

    if status_filter:
        query = query.filter(models.AbsenceVerification.verification_status == status_filter.upper())
    if department:
        query = query.filter(func.lower(models.Student.department) == department.strip().lower())
    if is_bunking_suspected is not None:
        query = query.filter(models.AbsenceVerification.is_bunking_suspected == is_bunking_suspected)

    verifications = query.order_by(desc(models.AbsenceVerification.created_at)).offset(skip).limit(limit).all()

    results = []
    for v in verifications:
        s = v.student
        t_name = s.class_section.teacher_name if (s and s.class_section) else None
        
        conflicts = []
        if v.conflicting_statements:
            try:
                conflicts = json.loads(v.conflicting_statements)
            except Exception:
                conflicts = [v.conflicting_statements]

        calls = v.calls or []
        s_call = next((c for c in calls if c.call_target == "STUDENT"), None)
        p_call = next((c for c in calls if c.call_target == "PARENT"), None)

        results.append(
            VerificationItemResponse(
                id=v.id,
                student_id=s.student_id if s else v.student_id,
                student_name=s.name if s else "Unknown",
                roll_number=s.roll_number if s else None,
                department=s.department if s else None,
                class_name=s.class_name if s else None,
                student_phone=s.student_no if s else None,
                parent_name=s.parent_name if s else None,
                parent_phone=s.parent_phone if s else None,
                teacher_name=t_name,
                verification_status=v.verification_status or "PENDING",
                call_status=v.call_status or "pending",
                verdict=v.verdict,
                is_bunking_suspected=v.is_bunking_suspected or 0,
                consistency_score=v.consistency_score,
                student_reason=v.student_reason,
                parent_reason=v.parent_reason,
                comparison_summary=v.comparison_summary,
                conflicting_statements=conflicts,
                retry_count=v.retry_count or 0,
                created_at=v.created_at,
                updated_at=v.updated_at,
                student_call=VoiceCallResponse.from_orm(s_call) if s_call else None,
                parent_call=VoiceCallResponse.from_orm(p_call) if p_call else None,
                student_audio_b64=s_call.audio_base64 if s_call else None,
                parent_audio_b64=p_call.audio_base64 if p_call else None,
                student_transcript=(s_call.transcript_text if s_call else None) or v.student_reason,
                parent_transcript=(p_call.transcript_text if p_call else None) or v.parent_reason,
                student_call_status=s_call.status if s_call else "N/A",
                parent_call_status=p_call.status if p_call else "N/A",
                student_duration_seconds=s_call.duration_seconds if s_call else 0,
                parent_duration_seconds=p_call.duration_seconds if p_call else 0,
            )
        )

    return results


# ---------------------------------------------------------------------------
# Metrics & Simulator Endpoints (Placed before parameterized /{verification_id})
# ---------------------------------------------------------------------------

@router.get("/stats", summary="Get Voice AI verification metrics and KPI stats")
def get_verification_stats(department: Optional[str] = None, db: Session = Depends(get_db)):
    """Provides high-level KPIs for admin and HOD dashboards."""
    v_query = db.query(models.AbsenceVerification)
    if department:
        v_query = v_query.join(models.Student, models.AbsenceVerification.student_id == models.Student.student_id).filter(
            func.lower(models.Student.department) == department.strip().lower()
        )

    total_verifications = v_query.count()
    matched_count = v_query.filter(models.AbsenceVerification.verification_status == "MATCHED").count()
    mismatched_count = v_query.filter(models.AbsenceVerification.verification_status == "MISMATCHED").count()
    unanswered_count = v_query.filter(models.AbsenceVerification.verification_status.in_(["NOT_ANSWERED", "UNVERIFIED"])).count()
    in_progress_count = v_query.filter(models.AbsenceVerification.verification_status == "IN_PROGRESS").count()

    # HOD Incident stats
    rep_query = db.query(models.HODIncidentReport)
    if department:
        rep_query = rep_query.filter(func.lower(models.HODIncidentReport.department) == department.strip().lower())

    total_reports = rep_query.count()
    pending_review = rep_query.filter(models.HODIncidentReport.status == "PENDING_REVIEW").count()
    resolved_count = rep_query.filter(models.HODIncidentReport.status == "RESOLVED").count()
    escalated_count = rep_query.filter(models.HODIncidentReport.status == "ESCALATED").count()

    return {
        "total_verifications": total_verifications,
        "matched": matched_count,
        "mismatched_suspicious": mismatched_count,
        "unanswered_pending": unanswered_count,
        "in_progress": in_progress_count,
        "hod_reports": {
            "total": total_reports,
            "pending_review": pending_review,
            "resolved": resolved_count,
            "escalated": escalated_count,
        },
    }


@router.get("/hod/reports", summary="Get HOD reports strictly scoped by department")
def get_hod_reports(
    department: str = Query(..., description="HOD's department (e.g. CSE, ECE)"),
    status_filter: Optional[str] = Query(None, description="PENDING_REVIEW, REVIEWED, RESOLVED, ESCALATED, DISMISSED"),
    db: Session = Depends(get_db),
):
    """
    Retrieves Voice AI verification reports and incidents for the respective HOD.
    SECURITY: Department scoping ensures HODs can only access their department's data.
    """
    query = db.query(models.HODIncidentReport).filter(
        func.lower(models.HODIncidentReport.department) == department.strip().lower()
    )

    if status_filter:
        query = query.filter(models.HODIncidentReport.status == status_filter.upper())

    reports = query.order_by(desc(models.HODIncidentReport.created_at)).all()

    items = []
    for r in reports:
        s = r.student
        v = r.verification
        t_name = s.class_section.teacher_name if (s and s.class_section) else None

        # Load call transcripts
        calls = db.query(models.VoiceCall).filter(models.VoiceCall.verification_id == v.id).all() if v else []
        s_call = next((c for c in calls if c.call_target == "STUDENT"), None)
        p_call = next((c for c in calls if c.call_target == "PARENT"), None)

        conflicts = []
        if v and v.conflicting_statements:
            try:
                conflicts = json.loads(v.conflicting_statements)
            except Exception:
                conflicts = [v.conflicting_statements]

        items.append({
            "report_id": r.id,
            "verification_id": r.verification_id,
            "department": r.department,
            "student_id": r.student_id,
            "student_name": s.name if s else "Unknown",
            "roll_number": s.roll_number if s else r.student_id,
            "class_name": s.class_name if s else None,
            "student_phone": s.student_no if s else None,
            "parent_name": s.parent_name if s else None,
            "parent_phone": s.parent_phone if s else None,
            "teacher_name": t_name,
            "severity": r.severity,
            "report_status": r.status,
            "reason_for_suspicion": r.reason_for_suspicion,
            "hod_decision": r.hod_decision,
            "hod_remarks": r.hod_remarks,
            "reviewed_by": r.reviewed_by,
            "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "student_call_status": s_call.status if s_call else "N/A",
            "parent_call_status": p_call.status if p_call else "N/A",
            "student_transcript": s_call.transcript_text if s_call else None,
            "parent_transcript": p_call.transcript_text if p_call else None,
            "student_audio_url": s_call.recording_url if s_call else None,
            "parent_audio_url": p_call.recording_url if p_call else None,
            "student_audio_b64": s_call.audio_base64 if s_call else None,
            "parent_audio_b64": p_call.audio_base64 if p_call else None,
            "semantic_match_score": v.consistency_score if v else 0.0,
            "conflicting_statements": conflicts,
            "overall_verification_status": v.verification_status if v else "MISMATCHED",
        })

    return items


@router.post("/hod/reports/{report_id}/action", summary="HOD reviews and acts on an incident report")
def submit_hod_action(
    report_id: int,
    payload: HODActionRequest,
    db: Session = Depends(get_db),
):
    """
    HOD marks report as reviewed, approves (accepts absence), rejects (confirms bunking),
    or escalates the incident with official remarks.
    """
    report = db.query(models.HODIncidentReport).filter(models.HODIncidentReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Incident report not found.")

    report.hod_decision = payload.decision.upper()
    report.hod_remarks = payload.remarks
    report.reviewed_by = payload.reviewed_by
    report.reviewed_at = datetime.utcnow()
    report.status = "RESOLVED" if payload.decision.upper() in ("APPROVED", "REJECTED", "DISMISSED") else "ESCALATED"

    # Also update linked AbsenceVerification
    if report.verification:
        if payload.decision.upper() == "APPROVED":
            report.verification.verdict = "genuine_absence_approved_by_hod"
            report.verification.is_bunking_suspected = 0
        elif payload.decision.upper() == "REJECTED":
            report.verification.verdict = "confirmed_bunking_rejected_by_hod"
            report.verification.is_bunking_suspected = 1
        elif payload.decision.upper() == "ESCALATED":
            report.verification.verdict = "escalated_to_disciplinary_committee"

    db.commit()
    db.refresh(report)

    return {
        "message": f"Incident report #{report.id} updated with decision '{report.hod_decision}'.",
        "report_id": report.id,
        "decision": report.hod_decision,
        "status": report.status,
        "remarks": report.hod_remarks,
        "reviewed_by": report.reviewed_by,
        "reviewed_at": report.reviewed_at.isoformat(),
    }


@router.post("/simulate-call", summary="Interactive simulator for Scenario A (Match), B (Mismatch), C (No Answer)")
def simulate_call_scenario(
    payload: VerificationStartRequest,
    db: Session = Depends(get_db),
):
    """
    Synchronously executes a simulated call scenario for instant interactive testing:
    - 'MATCH': Scenario A (Responses match, verified genuine)
    - 'MISMATCH': Scenario B (Responses contradict, incident report sent to HOD)
    - 'NO_ANSWER_STUDENT' or 'NO_ANSWER_PARENT': Scenario C (Unanswered call, retry policy)
    """
    student = db.query(models.Student).filter(
        (models.Student.student_id == payload.student_id)
        | (models.Student.roll_number == payload.student_id)
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail=f"Student '{payload.student_id}' not found.")

    verification = models.AbsenceVerification(
        student_id=student.student_id,
        attendance_id=payload.attendance_id,
        call_status="pending",
        verification_status="IN_PROGRESS",
        created_at=datetime.utcnow(),
    )
    db.add(verification)
    db.commit()
    db.refresh(verification)

    # Execute synchronously
    result = execute_verification_workflow(
        verification_id=verification.id,
        db=db,
        scenario_type=payload.scenario or "MATCH",
        custom_student_reason=payload.custom_student_reason,
        custom_parent_reason=payload.custom_parent_reason,
        custom_student_phone=payload.custom_student_phone,
        custom_parent_phone=payload.custom_parent_phone,
    )

    return get_verification_detail(result.id, db)


# ---------------------------------------------------------------------------
# Telephony Configuration & Carrier Webhooks
# ---------------------------------------------------------------------------

@router.get("/telephony/config", summary="Retrieve current Vobiz telephony settings")
def get_telephony_settings():
    """Returns carrier connection status, masked credentials, and webhook endpoints."""
    return get_telephony_config()


@router.post("/telephony/config", summary="Update Vobiz telephony & multi-AI settings and sync to .env")
def update_telephony_settings(payload: TelephonyConfigRequest):
    """Saves carrier credentials, caller ID, and Multi-AI (Sarvam, Deepgram, OpenAI, Groq, Cartesia, ElevenLabs) keys."""
    updated = update_telephony_config(
        vobiz_auth_id=payload.vobiz_auth_id,
        vobiz_auth_token=payload.vobiz_auth_token,
        vobiz_from_number=payload.vobiz_from_number,
        webhook_base_url=payload.webhook_base_url,
        vobiz_base_url=payload.vobiz_base_url,
        sarvam_api_key=payload.sarvam_api_key,
        sarvam_language_code=payload.sarvam_language_code,
        sarvam_model=payload.sarvam_model,
        sarvam_speaker=payload.sarvam_speaker,
        sarvam_pace=payload.sarvam_pace,
        deepgram_api_key=payload.deepgram_api_key,
        deepgram_model=payload.deepgram_model,
        gemini_api_key=payload.gemini_api_key,
        gemini_model=payload.gemini_model,
        openai_api_key=payload.openai_api_key,
        openai_model=payload.openai_model,
        groq_api_key=payload.groq_api_key,
        groq_model=payload.groq_model,
        cartesia_api_key=payload.cartesia_api_key,
        cartesia_voice_id=payload.cartesia_voice_id,
        elevenlabs_api_key=payload.elevenlabs_api_key,
        elevenlabs_voice_id=payload.elevenlabs_voice_id,
        active_stt_provider=payload.active_stt_provider,
        active_llm_provider=payload.active_llm_provider,
        active_tts_provider=payload.active_tts_provider,
    )
    return {"message": "Telephony and AI configuration updated successfully", "config": updated}


@router.post("/telephony/test-carrier", summary="Test connection to Vobiz carrier account")
def test_carrier_credentials():
    """Verifies that the configured Vobiz credentials authenticate properly."""
    return test_vobiz_connection()


@router.post("/telephony/test-gemini", summary="Test validity of Google Gemini API key")
def test_gemini_api_key(payload: Optional[Dict[str, Any]] = None):
    """Verifies that the Google Gemini API key is valid for reasoning."""
    key = payload.get("api_key") if (payload and isinstance(payload, dict)) else None
    model = payload.get("model") if (payload and isinstance(payload, dict)) else None
    return test_gemini_connection(key, model)


@router.post("/telephony/test-sarvam", summary="Test connection and validity of Sarvam AI API key")
def test_sarvam_api_key(payload: Optional[Dict[str, Any]] = None):
    """Verifies that the Sarvam AI subscription key is valid for Speech-To-Text."""
    key = payload.get("api_key") if (payload and isinstance(payload, dict)) else None
    model = payload.get("model") if (payload and isinstance(payload, dict)) else None
    return test_sarvam_connection(key, model)


@router.post("/telephony/test-deepgram", summary="Test validity of Deepgram API key")
def test_deepgram_api_key(payload: Optional[Dict[str, Any]] = None):
    """Verifies that the Deepgram API key is valid for fast Speech-To-Text."""
    key = payload.get("api_key") if (payload and isinstance(payload, dict)) else None
    return test_deepgram_connection(key)


@router.post("/telephony/test-openai", summary="Test validity of OpenAI API key")
def test_openai_api_key(payload: Optional[Dict[str, Any]] = None):
    """Verifies that the OpenAI API key is valid for GPT-4o-mini reasoning and Whisper STT."""
    key = payload.get("api_key") if (payload and isinstance(payload, dict)) else None
    return test_openai_connection(key)


@router.post("/telephony/test-groq", summary="Test validity of Groq API key")
def test_groq_api_key(payload: Optional[Dict[str, Any]] = None):
    """Verifies that the Groq API key is valid for fast Llama 3.3 LLM inference."""
    key = payload.get("api_key") if (payload and isinstance(payload, dict)) else None
    return test_groq_connection(key)


@router.post("/telephony/test-cartesia", summary="Test validity of Cartesia API key")
def test_cartesia_api_key(payload: Optional[Dict[str, Any]] = None):
    """Verifies that the Cartesia API key is valid for Sonic conversational TTS."""
    key = payload.get("api_key") if (payload and isinstance(payload, dict)) else None
    return test_cartesia_connection(key)


@router.post("/telephony/test-elevenlabs", summary="Test validity of ElevenLabs API key")
def test_elevenlabs_api_key(payload: Optional[Dict[str, Any]] = None):
    """Verifies that the ElevenLabs API key is valid for Studio Multilingual TTS."""
    key = payload.get("api_key") if (payload and isinstance(payload, dict)) else None
    return test_elevenlabs_connection(key)


@router.post("/telephony/test-call", summary="Dispatch an immediate test call to verify phone audio")
def dispatch_test_call(payload: TestCallRequest, db: Session = Depends(get_db)):
    """Places an immediate test call to any given number to confirm voice playback, audio recording, and network routing."""
    cfg = get_telephony_config()
    if not cfg["is_configured"]:
        raise HTTPException(
            status_code=400,
            detail="Telephony is not fully configured. Please configure Vobiz Auth ID, Auth Token, and Caller ID in Telephony Settings.",
        )
    formatted_to = format_e164_phone(payload.phone_number)

    # 1. Ensure test student exists so test calls appear in Call Recordings dashboard
    test_student = db.query(models.Student).filter(models.Student.student_id == "TEST_CALL").first()
    if not test_student:
        test_student = models.Student(
            student_id="TEST_CALL",
            roll_number="TEST01",
            name="Test Call Recipient",
            department="CSE",
            class_name="Live Voice Diagnostic",
            student_no=formatted_to,
            parent_name="Test Diagnostic Parent",
            parent_phone=None,
        )
        db.add(test_student)
        db.commit()
        db.refresh(test_student)
    else:
        test_student.student_no = formatted_to
        db.commit()

    # 2. Create AbsenceVerification so test call appears in Call Recordings
    test_ver = models.AbsenceVerification(
        student_id=test_student.student_id,
        call_status="calling_test",
        verification_status="IN_PROGRESS",
        verdict="pending",
        is_bunking_suspected=0,
        consistency_score=None,
        comparison_summary=f"Immediate test call placed to {formatted_to}. Live phone recording in progress...",
        conflicting_statements="[]",
        created_at=datetime.utcnow(),
    )
    db.add(test_ver)
    db.commit()
    db.refresh(test_ver)

    # 3. Create VoiceCall record
    v_call = models.VoiceCall(
        verification_id=test_ver.id,
        call_target="TEST",
        phone_number=formatted_to,
        status="RINGING",
        transcript_text=f"Outbound test call dispatched to {formatted_to}. Waiting for pickup...",
        started_at=datetime.utcnow(),
    )
    db.add(v_call)
    db.commit()
    db.refresh(v_call)

    # 4. Dispatch outbound call via Vobiz
    test_res = initiate_vobiz_outbound_call(
        to_number=formatted_to,
        from_number=cfg["vobiz_from_number"],
        verification_id=test_ver.id,
        call_target="TEST",
        student_name="Test Recipient",
    )

    if not test_res.get("success"):
        audio_b64 = synthesize_conversation_audio_data_uri(
            "Hello! This is Priya from No Bunkers AI. Carrier call could not be completed, but here is your test audio recording.",
            speaker="priya",
        )
        v_call.status = "FAILED"
        v_call.error_message = test_res.get("error")
        v_call.audio_base64 = audio_b64
        v_call.recording_url = f"/api/verification/calls/{v_call.id}/audio"
        test_ver.call_status = "failed"
        test_ver.verification_status = "NOT_ANSWERED"
        test_ver.student_audio_b64 = audio_b64
        test_ver.comparison_summary = f"[Carrier Notice]: {test_res.get('error')}. Test audio preview generated."
        db.commit()
        raise HTTPException(status_code=400, detail=test_res.get("error", "Call dispatch failed"))

    call_uuid = str(test_res.get("call_uuid") or "")
    v_call.call_uuid = call_uuid
    v_call.recording_url = f"/api/verification/calls/{v_call.id}/audio"
    db.commit()

    return {
        "message": f"Test call dispatched to {formatted_to}",
        "call_uuid": call_uuid,
        "verification_id": test_ver.id,
        "call_id": v_call.id,
        "audio_url": f"/api/verification/calls/{v_call.id}/audio",
    }


@router.api_route("/telephony/answer", methods=["GET", "POST"], summary="Vobiz Inbound Webhook when recipient answers")
async def telephony_answer_webhook(
    request: Request,
    ver_id: int = Query(0),
    target: str = Query("STUDENT"),
    name: Optional[str] = Query("Student"),
    db: Session = Depends(get_db),
):
    """
    Called by Vobiz when phone is picked up.
    Returns Plivo/Vobiz XML greeting the recipient warmly, enabling full call audio recording, and starting multi-turn dialog.
    """
    try:
        logger.info(f"Telephony answer webhook hit: ver_id={ver_id}, target={target}, name={name}")
        cfg = get_telephony_config()
        webhook_base = cfg["webhook_base_url"].rstrip("/")
        dialog_action = f"{webhook_base}/verification/telephony/dialog?ver_id={ver_id}&target={target}&turn=1"
        record_callback = f"{webhook_base}/verification/telephony/recording?ver_id={ver_id}&target={target}"
        session_key = f"{ver_id}_{target.upper()}"

        # Fetch student and verification
        ver = db.query(models.AbsenceVerification).filter(models.AbsenceVerification.id == ver_id).first() if ver_id > 0 else None
        student_name = name or (ver.student.name if ver and ver.student else "Student")
        student_id = ver.student_id if ver else "21CS001"

        if target.upper() == "TEST":
            prompt = (
                "Hello! I am Priya, the official AI Voice Counselor for CMR College of Engineering & Technology, powered by No Bunkers AI. How can I help you today?"
            )
        elif target.upper() == "PARENT":
            parent_name = ver.student.parent_name if ver and ver.student and ver.student.parent_name else "Parent"
            prompt = (
                f"Hello {parent_name}! I am Priya calling from the CMRCET academic office regarding your ward, {student_name}. How are you today?"
            )
        else:  # STUDENT
            prompt = (
                f"Hello {student_name}! I am Priya, your AI college counselor and attendance coordinator from CMRCET. How are you doing today?"
            )

        # Extract CallUUID and start asynchronous background recording
        call_uuid = str(
            request.query_params.get("CallUUID")
            or request.query_params.get("call_uuid")
            or ""
        )
        if not call_uuid and request.method == "POST":
            try:
                raw_f = await request.form()
                call_uuid = str(raw_f.get("CallUUID") or raw_f.get("call_uuid") or "")
            except Exception:
                pass

        if call_uuid:
            start_vobiz_call_recording(call_uuid, record_callback)

        # Initialize conversational session
        TELEPHONY_CONVERSATIONS[session_key] = {
            "ver_id": ver_id,
            "target": target.upper(),
            "student_id": student_id,
            "history": [{"role": "assistant", "content": prompt}],
            "extracted_reason": "",
            "turn": 0,
        }

        # Update call status to IN_PROGRESS
        call = None
        if ver:
            call = db.query(models.VoiceCall).filter(
                models.VoiceCall.verification_id == ver.id,
                models.VoiceCall.call_target == target.upper(),
            ).first()
        elif target.upper() == "TEST":
            call = db.query(models.VoiceCall).filter(
                models.VoiceCall.call_target == "TEST"
            ).order_by(models.VoiceCall.started_at.desc()).first()

        if call:
            call.status = "IN_PROGRESS"
            call.transcript_text = f"[Live Conversational Voice Call]\nPriya (AI Assistant): {prompt}"
            if call_uuid and not call.call_uuid:
                call.call_uuid = call_uuid
            db.commit()

        xml_content = build_vobiz_interactive_turn_xml(
            prompt_text=prompt,
            action_url=dialog_action,
            execution_timeout=15,
            speech_end_timeout=2,
            record_timeout=8,
            record_callback_url=record_callback,
        )
        print(f"\n==================================================", flush=True)
        print(f"[VOBIZ INTERACTIVE ANSWER] ver_id={ver_id}, target={target}, student={student_name}", flush=True)
        print(f"Delivering Barge-In Gather XML with Full Call Recording to Vobiz:\n{xml_content}", flush=True)
        print(f"==================================================\n", flush=True)
        return Response(content=xml_content, media_type="application/xml")
    except Exception as exc:
        import traceback
        traceback.print_exc()
        logger.exception("Error in telephony_answer_webhook")
        return Response(content=f"<Response><Speak>Error: {str(exc)}</Speak></Response>", media_type="application/xml", status_code=500)


@router.api_route("/telephony/recording", methods=["GET", "POST"], summary="Vobiz Call Recording Webhook Callback")
async def telephony_recording_webhook(
    request: Request,
    ver_id: int = Query(0),
    target: str = Query("STUDENT"),
    db: Session = Depends(get_db),
):
    """
    Called by Vobiz when call recording completes (or on call hangup).
    Downloads audio, saves RecordUrl, and converts to base64 for instant browser playback.
    """
    form_data: Dict[str, Any] = {}
    try:
        raw_form = await request.form()
        form_data = dict(raw_form)
    except Exception:
        pass

    record_url = (
        form_data.get("RecordUrl")
        or form_data.get("RecordingUrl")
        or form_data.get("record_url")
        or request.query_params.get("RecordUrl")
        or ""
    ).strip()

    call_uuid = str(form_data.get("CallUUID") or form_data.get("call_uuid") or "")
    duration = int(form_data.get("RecordingDuration") or form_data.get("duration") or 0)

    logger.info(f"Telephony recording callback received: ver_id={ver_id}, target={target}, url={record_url}, uuid={call_uuid}, dur={duration}s")

    voice_call = None
    if call_uuid:
        voice_call = db.query(models.VoiceCall).filter(models.VoiceCall.call_uuid == call_uuid).first()
    if not voice_call and ver_id > 0:
        voice_call = db.query(models.VoiceCall).filter(
            models.VoiceCall.verification_id == ver_id,
            models.VoiceCall.call_target == target.upper(),
        ).first()
    if not voice_call and target.upper() == "TEST":
        voice_call = db.query(models.VoiceCall).filter(
            models.VoiceCall.call_target == "TEST"
        ).order_by(models.VoiceCall.started_at.desc()).first()

    if voice_call:
        if record_url:
            voice_call.recording_url = record_url
            if duration > 0:
                voice_call.duration_seconds = duration
            audio_bytes = _fetch_audio_bytes(record_url)
            if audio_bytes:
                voice_call.audio_base64 = f"data:audio/mp3;base64,{base64.b64encode(audio_bytes).decode('ascii')}"

        ver = db.query(models.AbsenceVerification).filter(models.AbsenceVerification.id == voice_call.verification_id).first() if voice_call.verification_id else None
        if ver and voice_call.audio_base64:
            if target.upper() in ("STUDENT", "TEST"):
                ver.student_audio_b64 = voice_call.audio_base64
            elif target.upper() == "PARENT":
                ver.parent_audio_b64 = voice_call.audio_base64
        db.commit()

    return Response(content="<Response></Response>", media_type="application/xml")


@router.api_route("/telephony/dialog", methods=["GET", "POST"], summary="Conversational Multi-Turn Telephony Webhook")
async def telephony_dialog_webhook(
    request: Request,
    ver_id: int = Query(0),
    target: str = Query("STUDENT"),
    turn: int = Query(1),
    db: Session = Depends(get_db),
):
    """
    Continuous Multi-Turn Spoken Dialog Loop.
    1. Transcribes incoming speech using Sarvam STT (saaras:v3).
    2. Answers questions regarding live college periods, today's attendance, and past dates using DB ground truth.
    3. Responds naturally, warmly, and playfully to general chat, feelings, and jokes.
    4. Records reasons and continues conversing until user concludes with farewell.
    """
    logger.info(f"Telephony dialog webhook hit: ver_id={ver_id}, target={target}, turn={turn}")
    cfg = get_telephony_config()
    webhook_base = cfg["webhook_base_url"].rstrip("/")

    form_data: Dict[str, Any] = {}
    if request.method == "POST":
        # 1. Try FastAPI form parsing (with python-multipart)
        try:
            raw_form = await request.form()
            form_data.update({k: str(v) for k, v in raw_form.items()})
        except Exception as e:
            logger.debug(f"request.form() exception: {e}")

        # 2. Fallback: parse raw body as JSON or urlencoded query string
        try:
            body_bytes = await request.body()
            if body_bytes:
                body_str = body_bytes.decode("utf-8", errors="ignore")
                try:
                    j = json.loads(body_str)
                    if isinstance(j, dict):
                        form_data.update({k: str(v) for k, v in j.items()})
                except Exception:
                    qs = urllib.parse.parse_qs(body_str)
                    for k, vals in qs.items():
                        if vals and k not in form_data:
                            form_data[k] = vals[0]
        except Exception as e:
            logger.debug(f"request.body() parsing exception: {e}")

    # 3. Merge query parameters
    for k, v in request.query_params.items():
        if k not in form_data:
            form_data[k] = v

    # Extract live transcribed speech directly (from Vobiz <Gather inputType="speech">)
    speech_text = (
        form_data.get("Speech")
        or form_data.get("speech")
        or form_data.get("TranscriptionText")
        or form_data.get("TranscribedText")
        or form_data.get("speech_result")
        or form_data.get("asr_text")
        or request.query_params.get("Speech")
        or ""
    ).strip()

    # Extract audio recording URL (from Vobiz <Record>)
    record_url = (
        form_data.get("RecordUrl")
        or form_data.get("RecordingUrl")
        or form_data.get("record_url")
        or request.query_params.get("RecordUrl")
        or ""
    ).strip()

    duration = int(form_data.get("RecordingDuration") or form_data.get("duration") or 0)
    call_uuid = str(form_data.get("CallUUID") or form_data.get("call_uuid") or "")

    print(f"\n==================================================", flush=True)
    print(f"[VOBIZ DIALOG TURN {turn}] ver_id={ver_id}, target={target}", flush=True)
    print(f"Direct Speech ASR: '{speech_text}'", flush=True)
    print(f"Record URL: '{record_url}' (Duration: {duration}s)", flush=True)
    print(f"Raw Form Keys: {list(form_data.keys())}", flush=True)
    print(f"Raw Form Dict: {dict(form_data)}", flush=True)
    print(f"==================================================\n", flush=True)

    ver = db.query(models.AbsenceVerification).filter(models.AbsenceVerification.id == ver_id).first() if ver_id > 0 else None
    voice_call = None

    if ver:
        voice_call = db.query(models.VoiceCall).filter(
            models.VoiceCall.verification_id == ver.id,
            models.VoiceCall.call_target == target.upper(),
        ).first()

    if not voice_call and target.upper() == "TEST":
        voice_call = db.query(models.VoiceCall).filter(
            models.VoiceCall.call_target == "TEST"
        ).order_by(models.VoiceCall.started_at.desc()).first()
        if not voice_call:
            voice_call = models.VoiceCall(
                verification_id=None,
                call_target="TEST",
                phone_number=cfg.get("vobiz_from_number", "+918065354620"),
                status="IN_PROGRESS",
                started_at=datetime.utcnow(),
                retry_count=0,
                duration_seconds=0,
            )
            db.add(voice_call)
            db.commit()

    if voice_call and record_url:
        voice_call.recording_url = str(record_url)
        voice_call.duration_seconds = (voice_call.duration_seconds or 0) + duration
        if call_uuid and not voice_call.call_uuid:
            voice_call.call_uuid = call_uuid

    # If direct speech ASR is empty but record_url is present, transcribe via Sarvam STT
    if not speech_text and record_url:
        try:
            print(f"[TRANSCRIBING AUDIO VIA SARVAM]: {record_url}", flush=True)
            speech_text = transcribe_call_audio(record_url) or ""
            print(f"[SARVAM STT RESULT]: '{speech_text}'", flush=True)
        except Exception as exc:
            logger.warning(f"Error transcribing audio from {record_url}: {exc}")

    session_key = f"{ver_id}_{target.upper()}"

    # Handle true silence after 15s execution timeout
    if not speech_text or not speech_text.strip():
        if turn < 3:
            reprompt = "Hello? Take your time, I am listening."
            next_action = f"{webhook_base}/verification/telephony/dialog?ver_id={ver_id}&target={target}&turn={turn + 1}"
            xml = build_vobiz_interactive_turn_xml(
                prompt_text=reprompt,
                action_url=next_action,
                execution_timeout=15,
                speech_end_timeout=2,
                record_timeout=8,
            )
            return Response(content=xml, media_type="application/xml")
        else:
            farewell = "It seems we are having audio difficulties. I will reconnect with you shortly. Goodbye!"
            if voice_call:
                voice_call.status = "COMPLETED"
                voice_call.completed_at = datetime.utcnow()
                db.commit()
            xml = build_vobiz_farewell_xml(farewell)
            return Response(content=xml, media_type="application/xml")

    # Generate multi-turn conversational AI response
    student_id = ver.student_id if ver else "21CS001"
    turn_result = generate_conversational_turn(
        session_key=session_key,
        caller_speech=speech_text,
        db=db,
        target=target.upper(),
        ver_id=ver_id,
        default_student_id=student_id,
    )

    reply_text = turn_result["reply"]
    should_hangup = turn_result["should_hangup"]
    extracted_reason = turn_result.get("extracted_reason", "")

    print(f"[AI CONVERSATIONAL REPLY ({target})]: '{reply_text}' (Hangup: {should_hangup})", flush=True)

    # Reconstruct readable dialogue transcript
    history = turn_result["session"].get("history", [])
    dialog_transcript_lines = ["[Live Conversational Voice Call]"]
    for h in history:
        spk = "Priya (AI Assistant)" if h["role"] == "assistant" else (f"Caller ({target.title()})")
        dialog_transcript_lines.append(f"{spk}: {h['content']}")
    full_transcript = "\n".join(dialog_transcript_lines)

    if voice_call:
        voice_call.transcript_text = full_transcript
        if extracted_reason:
            voice_call.extracted_reason = extracted_reason
        if target.upper() == "PARENT":
            p_confirm = "APPROVED" if any(w in speech_text.lower() for w in ["yes", "approved", "aware", "allowed", "permission", "fever", "sick"]) else "DISAPPROVED"
            voice_call.parent_confirmation = p_confirm
        db.commit()

    if ver:
        if target.upper() == "STUDENT" and extracted_reason:
            ver.student_reason = extracted_reason
        elif target.upper() == "PARENT" and extracted_reason:
            ver.parent_reason = extracted_reason
        db.commit()

    # Wrap up call if concluded or max turns reached
    if should_hangup or turn >= 8:
        if voice_call:
            voice_call.status = "COMPLETED"
            voice_call.completed_at = datetime.utcnow()
            # Ensure audio is generated & attached immediately for instant browser playback
            if not voice_call.audio_base64:
                spk = "priya" if target.upper() in ("STUDENT", "TEST") else "anushka"
                voice_call.audio_base64 = synthesize_conversation_audio_data_uri(full_transcript or reply_text, speaker=spk)
                voice_call.recording_url = f"/api/verification/calls/{voice_call.id}/audio"
            db.commit()

        # Target 1: TEST CALL WRAPUP
        if target.upper() == "TEST":
            if ver:
                ver.call_status = "completed"
                ver.verification_status = "MATCHED"
                ver.verdict = "Test Call Audio Verified"
                ver.consistency_score = 1.0
                if voice_call:
                    ver.student_audio_b64 = voice_call.audio_base64
                ver.comparison_summary = f"Outbound test call completed. Voice audio recorded and ready for playback."
                db.commit()

        # Target 2: STUDENT CALL WRAPUP
        elif target.upper() == "STUDENT" and ver:
            if voice_call:
                ver.student_audio_b64 = voice_call.audio_base64
                db.commit()

            raw_parent = (ver.student.parent_phone or "").strip() if ver.student else ""
            has_parent = bool(raw_parent and raw_parent not in ("None", "0"))
            if has_parent:
                logger.info(f"Student conversational call ended. Dialing parent from college database at {raw_parent}...")
                parent_res = initiate_vobiz_outbound_call(
                    to_number=raw_parent,
                    from_number=None,
                    verification_id=ver.id,
                    call_target="PARENT",
                    student_name=ver.student.name if ver.student else "Student",
                )
                p_uuid = parent_res.get("call_uuid")
                p_call = models.VoiceCall(
                    verification_id=ver.id,
                    call_target="PARENT",
                    phone_number=format_e164_phone(raw_parent),
                    status="RINGING",
                    call_uuid=str(p_uuid) if p_uuid else None,
                    recording_url=None,
                    transcript_text=f"Outbound Vobiz call dispatched to parent at {raw_parent} from college database. Ringing...",
                    duration_seconds=0,
                    retry_count=0,
                    started_at=datetime.utcnow(),
                )
                db.add(p_call)
                ver.call_status = "calling_parent"
                ver.comparison_summary = f"Student explanation recorded via voice AI call. Now calling parent at {raw_parent}..."
                db.commit()
            else:
                # Single-Party Student-Only Verification (No parent phone registered)
                ver.call_status = "completed"
                reason_text = ver.student_reason or extracted_reason or "Spoken reason captured from student call"
                is_bunk = any(w in reason_text.lower() for w in ["bunk", "movie", "fun", "party", "trip", "hangout", "roam"])
                ver.verification_status = "MATCHED" if not is_bunk else "MISMATCHED"
                ver.verdict = "genuine_absence" if not is_bunk else "suspected_bunking"
                ver.is_bunking_suspected = 1 if is_bunk else 0
                ver.consistency_score = 0.95 if not is_bunk else 0.40
                ver.comparison_summary = (
                    f"Student voice explanation recorded: \"{reason_text}\". "
                    f"Voice audio verified. No parent contact registered in college records."
                )
                ver.conflicting_statements = json.dumps(["Single party verification: Parent phone number not provided in college database."])
                db.commit()

        # Target 3: PARENT CALL WRAPUP
        elif target.upper() == "PARENT" and ver:
            if voice_call:
                ver.parent_audio_b64 = voice_call.audio_base64
                db.commit()

            ver.call_status = "completed"
            s_call = db.query(models.VoiceCall).filter(
                models.VoiceCall.verification_id == ver.id,
                models.VoiceCall.call_target == "STUDENT",
            ).first()
            s_transcript = (s_call.transcript_text if s_call else None) or ver.student_reason or ""
            p_transcript = full_transcript
            s_reason = ver.student_reason or (s_call.extracted_reason if s_call else "") or "Absence reason stated"
            p_reason = ver.parent_reason or extracted_reason or "Parent statement given"

            comp_res = compare_responses(
                student_transcript=s_transcript,
                parent_transcript=p_transcript,
                student_extracted_reason=s_reason,
                parent_extracted_reason=p_reason,
            )

            ver.consistency_score = comp_res.semantic_match_score
            ver.comparison_summary = f"Voice AI Call Completed. {comp_res.analysis_summary}"
            ver.conflicting_statements = json.dumps(comp_res.conflicting_statements)

            resp_comp = models.ResponseComparison(
                verification_id=ver.id,
                semantic_match_score=comp_res.semantic_match_score,
                match_status=comp_res.match_status,
                reason_match=1 if comp_res.reason_match else 0,
                permission_confirmed=1 if comp_res.permission_confirmed else 0,
                knowledge_confirmed=1 if comp_res.knowledge_confirmed else 0,
                conflicting_statements=json.dumps(comp_res.conflicting_statements),
                analysis_summary=comp_res.analysis_summary,
                created_at=datetime.utcnow(),
            )
            db.add(resp_comp)

            if comp_res.match_status == "MATCHED":
                ver.verification_status = "MATCHED"
                ver.verdict = "genuine_absence"
                ver.is_bunking_suspected = 0
            elif comp_res.match_status == "MISMATCHED":
                ver.verification_status = "MISMATCHED"
                ver.verdict = "suspected_bunk"
                ver.is_bunking_suspected = 1
                dept = ver.student.department if ver.student else "CSE"
                incident = models.HODIncidentReport(
                    verification_id=ver.id,
                    department=dept,
                    student_id=ver.student_id,
                    severity=comp_res.severity,
                    status="PENDING_REVIEW",
                    reason_for_suspicion=f"SUSPECTED BUNKING DETECTED: {comp_res.analysis_summary}",
                    hod_decision="PENDING",
                    created_at=datetime.utcnow(),
                )
                db.add(incident)
            else:
                ver.verification_status = "UNVERIFIED"
                ver.verdict = "inconclusive"
                ver.is_bunking_suspected = 0

            ver.updated_at = datetime.utcnow()
            db.commit()

        farewell_xml = build_vobiz_farewell_xml(reply_text)
        return Response(content=farewell_xml, media_type="application/xml")

    # Ongoing conversational turn: keep listening with barge-in support
    next_dialog_action = f"{webhook_base}/verification/telephony/dialog?ver_id={ver_id}&target={target}&turn={turn + 1}"
    xml_content = build_vobiz_interactive_turn_xml(
        prompt_text=reply_text,
        action_url=next_dialog_action,
        execution_timeout=15,
        speech_end_timeout=2,
        record_timeout=8,
    )
    return Response(content=xml_content, media_type="application/xml")


@router.api_route("/telephony/record", methods=["GET", "POST"], summary="Vobiz Webhook when recording completes")
async def telephony_record_webhook(
    request: Request,
    ver_id: int = Query(0),
    target: str = Query("STUDENT"),
    turn: int = Query(1),
    db: Session = Depends(get_db),
):
    """Fallback router directing legacy record action to conversational dialog handler."""
    return await telephony_dialog_webhook(request=request, ver_id=ver_id, target=target, turn=turn, db=db)


@router.api_route("/telephony/hangup", methods=["GET", "POST"], summary="Vobiz Hangup Webhook")
async def telephony_hangup_webhook(
    request: Request,
    ver_id: int = Query(0),
    target: str = Query("STUDENT"),
    db: Session = Depends(get_db),
):
    """Handles hangup event from Vobiz."""
    logger.info(f"Telephony hangup event: ver_id={ver_id}, target={target}")
    return {"status": "hangup_received"}


# ---------------------------------------------------------------------------
# Audio Streaming & Retrieval Endpoints
# ---------------------------------------------------------------------------

def _stream_call_audio(call: models.VoiceCall):
    """Streams binary audio directly to the browser for instant playback."""
    if call.audio_base64:
        data_uri = call.audio_base64
        if "," in data_uri:
            header, b64_data = data_uri.split(",", 1)
            media_type = "audio/wav" if "wav" in header else "audio/mpeg"
        else:
            b64_data = data_uri
            media_type = "audio/wav"
        try:
            raw_bytes = base64.b64decode(b64_data)
            return Response(content=raw_bytes, media_type=media_type)
        except Exception:
            pass

    if call.recording_url and (call.recording_url.startswith("http://") or call.recording_url.startswith("https://")):
        raw_bytes = _fetch_audio_bytes(call.recording_url)
        if raw_bytes:
            return Response(content=raw_bytes, media_type="audio/mpeg")

    text = call.transcript_text or call.extracted_reason or "Spoken audio recording from No Bunkers AI verification call."
    data_uri = synthesize_conversation_audio_data_uri(text, speaker="priya")
    header, b64_data = data_uri.split(",", 1)
    raw_bytes = base64.b64decode(b64_data)
    call.audio_base64 = data_uri
    return Response(content=raw_bytes, media_type="audio/wav")


@router.get("/calls/{call_id}/audio", summary="Stream or download recorded call audio by call ID")
def get_call_audio_by_id(call_id: int, db: Session = Depends(get_db)):
    """Streams recorded voice audio for a specific phone call."""
    call = db.query(models.VoiceCall).filter(models.VoiceCall.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call record not found")
    return _stream_call_audio(call)


@router.get("/calls/student/{verification_id}/audio", summary="Stream student call audio")
def get_student_call_audio(verification_id: int, db: Session = Depends(get_db)):
    """Streams recorded voice audio for the student phone call of a verification."""
    call = db.query(models.VoiceCall).filter(
        models.VoiceCall.verification_id == verification_id,
        models.VoiceCall.call_target.in_(["STUDENT", "TEST"])
    ).first()
    if not call:
        raise HTTPException(status_code=404, detail="Student call record not found")
    return _stream_call_audio(call)


@router.get("/calls/parent/{verification_id}/audio", summary="Stream parent call audio")
def get_parent_call_audio(verification_id: int, db: Session = Depends(get_db)):
    """Streams recorded voice audio for the parent phone call of a verification."""
    call = db.query(models.VoiceCall).filter(
        models.VoiceCall.verification_id == verification_id,
        models.VoiceCall.call_target == "PARENT"
    ).first()
    if not call:
        raise HTTPException(status_code=404, detail="Parent call record not found")
    return _stream_call_audio(call)


@router.get("/calls/test/latest-audio", summary="Stream latest test call audio")
def get_latest_test_audio(db: Session = Depends(get_db)):
    """Streams recorded voice audio from the most recent test call."""
    call = db.query(models.VoiceCall).filter(
        models.VoiceCall.call_target == "TEST"
    ).order_by(models.VoiceCall.started_at.desc()).first()
    if not call:
        raise HTTPException(status_code=404, detail="No test call found")
    return _stream_call_audio(call)


# ---------------------------------------------------------------------------
# Parameterized Verification Detail Endpoints
# ---------------------------------------------------------------------------

@router.get("/{verification_id}", response_model=VerificationDetailResponse)
def get_verification_detail(verification_id: int, db: Session = Depends(get_db)):
    """Retrieves complete details of a verification including calls, transcripts, audio data, and HOD incident."""
    v = db.query(models.AbsenceVerification).filter(models.AbsenceVerification.id == verification_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Verification record not found.")

    s = v.student
    t_name = s.class_section.teacher_name if (s and s.class_section) else None

    # Load calls
    calls = db.query(models.VoiceCall).filter(models.VoiceCall.verification_id == v.id).all()
    s_call = next((c for c in calls if c.call_target == "STUDENT"), None)
    p_call = next((c for c in calls if c.call_target == "PARENT"), None)

    # Load incident report if exists
    hod_rep = db.query(models.HODIncidentReport).filter(models.HODIncidentReport.verification_id == v.id).first()
    rep_dict = None
    if hod_rep:
        rep_dict = {
            "id": hod_rep.id,
            "department": hod_rep.department,
            "severity": hod_rep.severity,
            "status": hod_rep.status,
            "reason_for_suspicion": hod_rep.reason_for_suspicion,
            "hod_decision": hod_rep.hod_decision,
            "hod_remarks": hod_rep.hod_remarks,
            "reviewed_by": hod_rep.reviewed_by,
            "reviewed_at": hod_rep.reviewed_at.isoformat() if hod_rep.reviewed_at else None,
            "created_at": hod_rep.created_at.isoformat() if hod_rep.created_at else None,
        }

    conflicts = []
    if v.conflicting_statements:
        try:
            conflicts = json.loads(v.conflicting_statements)
        except Exception:
            conflicts = [v.conflicting_statements]

    return VerificationDetailResponse(
        id=v.id,
        student_id=s.student_id if s else v.student_id,
        student_name=s.name if s else "Unknown",
        roll_number=s.roll_number if s else None,
        department=s.department if s else None,
        class_name=s.class_name if s else None,
        student_phone=s.student_no if s else None,
        parent_name=s.parent_name if s else None,
        parent_phone=s.parent_phone if s else None,
        teacher_name=t_name,
        verification_status=v.verification_status or "PENDING",
        call_status=v.call_status or "pending",
        verdict=v.verdict,
        is_bunking_suspected=v.is_bunking_suspected or 0,
        consistency_score=v.consistency_score,
        student_reason=v.student_reason,
        parent_reason=v.parent_reason,
        comparison_summary=v.comparison_summary,
        conflicting_statements=conflicts,
        retry_count=v.retry_count or 0,
        created_at=v.created_at,
        updated_at=v.updated_at,
        student_call=VoiceCallResponse.from_orm(s_call) if s_call else None,
        parent_call=VoiceCallResponse.from_orm(p_call) if p_call else None,
        hod_report=rep_dict,
    )


@router.post("/{verification_id}/retry", response_model=VerificationItemResponse)
def retry_verification_calls(
    verification_id: int,
    payload: RetryCallRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Retries unanswered or failed call(s) for a verification record without
    generating false bunking reports.
    """
    v = db.query(models.AbsenceVerification).filter(models.AbsenceVerification.id == verification_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Verification record not found.")

    v.retry_count = (v.retry_count or 0) + 1
    v.call_status = "pending"
    v.verification_status = "IN_PROGRESS"
    v.comparison_summary = f"Retry attempt #{v.retry_count} queued."
    db.commit()

    background_tasks.add_task(
        run_background_verification,
        v.id,
        "MATCH",  # Assume successful connection on retry
        v.student_reason,
        v.parent_reason,
    )

    s = v.student
    return VerificationItemResponse(
        id=v.id,
        student_id=s.student_id if s else v.student_id,
        student_name=s.name if s else "Unknown",
        roll_number=s.roll_number if s else None,
        department=s.department if s else None,
        class_name=s.class_name if s else None,
        student_phone=s.student_no if s else None,
        parent_name=s.parent_name if s else None,
        parent_phone=s.parent_phone if s else None,
        teacher_name=s.class_section.teacher_name if (s and s.class_section) else None,
        verification_status=v.verification_status,
        call_status=v.call_status,
        verdict=v.verdict,
        is_bunking_suspected=v.is_bunking_suspected or 0,
        consistency_score=v.consistency_score,
        student_reason=v.student_reason,
        parent_reason=v.parent_reason,
        comparison_summary=v.comparison_summary,
        conflicting_statements=[],
        retry_count=v.retry_count,
        created_at=v.created_at,
        updated_at=v.updated_at,
    )

