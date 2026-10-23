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
    created_at = Column(DateTime, default=datetime.utcnow)

    attendances = relationship("Attendance", back_populates="student")
    verifications = relationship("AbsenceVerification", back_populates="student")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(50), ForeignKey("students.student_id"), nullable=False, index=True)
    status = Column(String(20), nullable=False)  # "present", "absent"
    timestamp = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="attendances")


class AbsenceVerification(Base):
    __tablename__ = "absence_verifications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(50), ForeignKey("students.student_id"), nullable=False, index=True)
    student_reason = Column(Text, nullable=True)
    parent_reason = Column(Text, nullable=True)
    call_status = Column(String(30), default="pending")  # "pending", "in_progress", "completed", "failed"
    consistency_score = Column(Float, nullable=True)
    verdict = Column(String(50), nullable=True)  # "genuine_absence", "suspected_bunk", "inconclusive"
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="verifications")

