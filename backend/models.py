from datetime import datetime
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from backend.database import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(50), unique=True, index=True, nullable=False)
    roll_number = Column(String(50), index=True, nullable=True)
    name = Column(String(100), nullable=False)
    class_name = Column(String(50), nullable=True)  # e.g., "Grade 10-A", "CSE-3A"
    department = Column(String(100), index=True, nullable=True)  # e.g., "Computer Science", "ECE"
    student_no = Column(String(50), nullable=True)  # Student contact/phone number or student number
    parent_name = Column(String(100), nullable=True)
    parent_phone = Column(String(20), nullable=True)
    class_section_id = Column(Integer, ForeignKey("class_sections.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    class_section = relationship("ClassSection", back_populates="students")
    attendances = relationship("Attendance", back_populates="student")
    verifications = relationship("AbsenceVerification", back_populates="student")
    outing_requests = relationship("OutingRequest", back_populates="student")


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "CSE"
    name = Column(String(150), nullable=False)  # e.g., "Computer Science & Engineering"
    created_at = Column(DateTime, default=datetime.utcnow)

    hods = relationship("HOD", back_populates="department_rel")


class HOD(Base):
    __tablename__ = "hods"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    department_code = Column(String(50), ForeignKey("departments.code"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    department_rel = relationship("Department", back_populates="hods")


class SecurityGate(Base):
    __tablename__ = "security_gates"

    id = Column(Integer, primary_key=True, index=True)
    gate_name = Column(String(100), nullable=False)  # e.g. "Main Campus Gate", "Hostel South Gate"
    location_code = Column(String(50), nullable=True)  # e.g. "GATE-01", "GATE-02"
    is_active = Column(Integer, default=1)  # 1 = Active, 0 = Inactive
    created_at = Column(DateTime, default=datetime.utcnow)

    guards = relationship("SecurityGuard", back_populates="gate")


class SecurityGuard(Base):
    __tablename__ = "security_guards"

    id = Column(Integer, primary_key=True, index=True)
    badge_number = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    assigned_gate_id = Column(Integer, ForeignKey("security_gates.id"), nullable=True)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    gate = relationship("SecurityGate", back_populates="guards")


class OutingRequest(Base):
    __tablename__ = "outing_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_no = Column(String(50), unique=True, index=True, nullable=False)
    student_id = Column(String(50), ForeignKey("students.student_id"), nullable=False, index=True)
    student_name = Column(String(100), nullable=False)
    roll_number = Column(String(50), nullable=True, index=True)
    department = Column(String(100), nullable=False, index=True)  # Used for auto-routing to HOD
    
    outing_type = Column(String(50), default="Day Outing")  # "Day Outing", "Overnight", "Emergency"
    destination = Column(String(200), nullable=False)
    reason = Column(Text, nullable=False)
    
    departure_date = Column(String(30), nullable=False)
    departure_time = Column(String(30), nullable=False)
    expected_return_date = Column(String(30), nullable=False)
    expected_return_time = Column(String(30), nullable=False)
    
    # Approval Stages
    parent_status = Column(String(30), default="PENDING")  # PENDING, APPROVED, REJECTED
    parent_remarks = Column(Text, nullable=True)
    parent_action_at = Column(DateTime, nullable=True)
    
    hod_status = Column(String(30), default="PENDING")  # PENDING, APPROVED, REJECTED
    hod_remarks = Column(Text, nullable=True)
    hod_action_at = Column(DateTime, nullable=True)
    
    # Overall Status: PENDING_PARENT, PENDING_HOD, APPROVED, REJECTED_BY_PARENT, REJECTED_BY_HOD, EXITED, RETURNED, EXPIRED
    overall_status = Column(String(50), default="PENDING_PARENT", index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("Student", back_populates="outing_requests")
    pass_record = relationship("OutingPass", back_populates="request", uselist=False)


class OutingPass(Base):
    __tablename__ = "outing_passes"

    id = Column(Integer, primary_key=True, index=True)
    outing_request_id = Column(Integer, ForeignKey("outing_requests.id"), unique=True, nullable=False)
    qr_token = Column(String(128), unique=True, index=True, nullable=False)
    
    valid_from = Column(DateTime, nullable=True)
    valid_until = Column(DateTime, nullable=True)
    
    # Pass status: ISSUED, EXITED, RETURNED, EXPIRED, CANCELLED
    pass_status = Column(String(30), default="ISSUED", index=True)
    
    actual_exit_at = Column(DateTime, nullable=True)
    actual_return_at = Column(DateTime, nullable=True)
    
    exit_guard_id = Column(Integer, ForeignKey("security_guards.id"), nullable=True)
    exit_gate_id = Column(Integer, ForeignKey("security_gates.id"), nullable=True)
    return_guard_id = Column(Integer, ForeignKey("security_guards.id"), nullable=True)
    return_gate_id = Column(Integer, ForeignKey("security_gates.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    request = relationship("OutingRequest", back_populates="pass_record")
    scan_logs = relationship("GateScanLog", back_populates="outing_pass")


class GateScanLog(Base):
    __tablename__ = "gate_scan_logs"

    id = Column(Integer, primary_key=True, index=True)
    outing_pass_id = Column(Integer, ForeignKey("outing_passes.id"), nullable=True, index=True)
    student_id = Column(String(50), nullable=False, index=True)
    student_name = Column(String(100), nullable=True)
    
    guard_id = Column(Integer, nullable=True)
    guard_name = Column(String(100), nullable=True)
    gate_id = Column(Integer, nullable=True)
    gate_name = Column(String(100), nullable=True)
    
    scan_type = Column(String(20), nullable=False)  # "EXIT", "RETURN"
    scan_result = Column(String(30), nullable=False)  # "ALLOWED", "DENIED", "EXPIRED", "ALREADY_EXITED", "ALREADY_RETURNED"
    scan_timestamp = Column(DateTime, default=datetime.utcnow)
    remarks = Column(Text, nullable=True)

    outing_pass = relationship("OutingPass", back_populates="scan_logs")


class ClassSection(Base):
    __tablename__ = "class_sections"

    id = Column(Integer, primary_key=True, index=True)
    class_name = Column(String(100), nullable=False)  # e.g. "B.Tech CSE"
    department = Column(String(100), nullable=False, index=True)  # e.g. "CSE"
    section = Column(String(50), nullable=False, index=True)  # e.g. "4A" or "Section 1"
    teacher_name = Column(String(100), nullable=True)  # Teacher who teaches this class
    teacher_id = Column(String(50), nullable=True)
    room_number = Column(String(50), nullable=True)
    academic_year = Column(String(50), nullable=True)  # e.g. "4th Year" or "2026-27"
    created_at = Column(DateTime, default=datetime.utcnow)

    students = relationship("Student", back_populates="class_section")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(50), ForeignKey("students.student_id"), nullable=False, index=True)
    status = Column(String(20), nullable=False)  # "Present", "Absent", "Late"
    subject = Column(String(100), nullable=True, index=True)  # e.g., "Machine Learning"
    date = Column(String(20), nullable=True, index=True)  # e.g., "2026-10-25"
    time_slot = Column(String(50), nullable=True)  # e.g., "10:00 AM"
    faculty_name = Column(String(100), nullable=True)  # e.g., "Dr. Rajesh Kumar"
    section = Column(String(50), nullable=True)  # e.g., "CSE-4A"
    remarks = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="attendances")


class AbsenceVerification(Base):
    __tablename__ = "absence_verifications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(50), ForeignKey("students.student_id"), nullable=False, index=True)
    attendance_id = Column(Integer, ForeignKey("attendance.id"), nullable=True, index=True)
    student_reason = Column(Text, nullable=True)
    parent_reason = Column(Text, nullable=True)
    call_status = Column(String(30), default="pending")  # "pending", "in_progress", "completed", "failed", "unanswered"
    verification_status = Column(String(50), default="PENDING", index=True)  # PENDING, IN_PROGRESS, MATCHED, MISMATCHED, NOT_ANSWERED, UNVERIFIED
    consistency_score = Column(Float, nullable=True)
    verdict = Column(String(50), nullable=True)  # "MATCHED", "MISMATCHED", "UNVERIFIED", "INCONCLUSIVE"
    is_bunking_suspected = Column(Integer, default=0)
    comparison_summary = Column(Text, nullable=True)
    conflicting_statements = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("Student", back_populates="verifications")
    attendance = relationship("Attendance")
    calls = relationship("VoiceCall", back_populates="verification", cascade="all, delete-orphan")
    comparison = relationship("ResponseComparison", back_populates="verification", uselist=False, cascade="all, delete-orphan")
    incident_report = relationship("HODIncidentReport", back_populates="verification", uselist=False, cascade="all, delete-orphan")


class VoiceCall(Base):
    __tablename__ = "voice_calls"

    id = Column(Integer, primary_key=True, index=True)
    verification_id = Column(Integer, ForeignKey("absence_verifications.id"), nullable=True, index=True)
    call_target = Column(String(20), nullable=False)  # "STUDENT", "PARENT"
    phone_number = Column(String(30), nullable=False)
    status = Column(String(30), default="INITIATED")  # INITIATED, RINGING, IN_PROGRESS, COMPLETED, NOT_ANSWERED, BUSY, FAILED
    recording_url = Column(String(255), nullable=True)
    audio_base64 = Column(Text, nullable=True)  # Base64-encoded audio for direct browser playback
    transcript_text = Column(Text, nullable=True)
    extracted_reason = Column(Text, nullable=True)
    parent_confirmation = Column(String(50), nullable=True)  # "APPROVED", "DISAPPROVED", "UNAWARE", "N/A"
    duration_seconds = Column(Integer, default=0)
    retry_count = Column(Integer, default=0)
    call_uuid = Column(String(100), nullable=True)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    verification = relationship("AbsenceVerification", back_populates="calls")


class ResponseComparison(Base):
    __tablename__ = "response_comparisons"

    id = Column(Integer, primary_key=True, index=True)
    verification_id = Column(Integer, ForeignKey("absence_verifications.id"), unique=True, nullable=False, index=True)
    semantic_match_score = Column(Float, nullable=False)  # 0.0 to 1.0
    match_status = Column(String(30), nullable=False)  # "MATCHED", "MISMATCHED", "INCONCLUSIVE"
    reason_match = Column(Integer, default=0)  # 1 = True, 0 = False
    permission_confirmed = Column(Integer, default=0)  # 1 = True, 0 = False
    knowledge_confirmed = Column(Integer, default=0)  # 1 = True, 0 = False
    conflicting_statements = Column(Text, nullable=True)  # JSON-encoded array of conflict descriptions
    analysis_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    verification = relationship("AbsenceVerification", back_populates="comparison")


class HODIncidentReport(Base):
    __tablename__ = "hod_incident_reports"

    id = Column(Integer, primary_key=True, index=True)
    verification_id = Column(Integer, ForeignKey("absence_verifications.id"), unique=True, nullable=False, index=True)
    department = Column(String(100), nullable=False, index=True)  # Scoped strictly for HOD department access
    student_id = Column(String(50), ForeignKey("students.student_id"), nullable=False, index=True)
    severity = Column(String(20), default="MEDIUM")  # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    status = Column(String(30), default="PENDING_REVIEW")  # "PENDING_REVIEW", "REVIEWED", "RESOLVED", "ESCALATED", "DISMISSED"
    reason_for_suspicion = Column(Text, nullable=False)
    hod_decision = Column(String(30), default="PENDING")  # "PENDING", "APPROVED", "REJECTED", "ESCALATED"
    hod_remarks = Column(Text, nullable=True)
    reviewed_by = Column(String(100), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    verification = relationship("AbsenceVerification", back_populates="incident_report")
    student = relationship("Student")

