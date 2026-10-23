from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy.orm import Session

from backend import models
from backend.database import get_db

router = APIRouter(prefix="/students", tags=["Students"])


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
# CRUD Operations
# ---------------------------------------------------------

# 1. CREATE Student
@router.post(
    "/",
    response_model=StudentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new student with roll number, student no, class, and department",
)
def create_student(student_data: StudentCreate, db: Session = Depends(get_db)):
    # Determine the unique student identifier
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

    # Check for existing student with the same student_id or roll_number
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


# 2. READ ALL Students (supports filtering by class, department, or roll_number)
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


# 3. READ ONE Student by student_id or roll_number
@router.get(
    "/{identifier}",
    response_model=StudentResponse,
    summary="Get a student by student ID or roll number",
)
def get_student(identifier: str, db: Session = Depends(get_db)):
    student = (
        db.query(models.Student)
        .filter(
            (models.Student.student_id == identifier)
            | (models.Student.roll_number == identifier)
        )
        .first()
    )
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with identifier '{identifier}' not found.",
        )
    return student


# 4. UPDATE Student by student_id or roll_number
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
    student = (
        db.query(models.Student)
        .filter(
            (models.Student.student_id == identifier)
            | (models.Student.roll_number == identifier)
        )
        .first()
    )
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with identifier '{identifier}' not found.",
        )

    # Update only provided fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(student, field, value)

    db.commit()
    db.refresh(student)
    return student


# 5. DELETE Student by student_id or roll_number
@router.delete(
    "/{identifier}",
    summary="Delete a student",
)
def delete_student(identifier: str, db: Session = Depends(get_db)):
    student = (
        db.query(models.Student)
        .filter(
            (models.Student.student_id == identifier)
            | (models.Student.roll_number == identifier)
        )
        .first()
    )
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with identifier '{identifier}' not found.",
        )

    db.delete(student)
    db.commit()
    return {
        "message": f"Student '{identifier}' deleted successfully.",
        "identifier": identifier,
    }
