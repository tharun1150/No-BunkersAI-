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
    student_reason = Column(Text, nullable=True)
    parent_reason = Column(Text, nullable=True)
    call_status = Column(String(30), default="pending")  # "pending", "in_progress", "completed", "failed"
    consistency_score = Column(Float, nullable=True)
    verdict = Column(String(50), nullable=True)  # "genuine_absence", "suspected_bunk", "inconclusive"
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="verifications")

