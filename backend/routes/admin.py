from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend import models
from backend.database import get_db

router = APIRouter(prefix="/admin", tags=["Admin Operations"])


# ---------------------------------------------------------
# Schemas for Admin Class Management
# ---------------------------------------------------------
class ClassSectionBase(BaseModel):
    class_name: str = Field(..., description="Class name (e.g. B.Tech CSE, Grade 10)", example="B.Tech CSE")
    department: str = Field(..., description="Department name (e.g. CSE, ECE)", example="CSE")
    section: str = Field(..., description="Section number or name (e.g. 4A, B, 1)", example="4A")
    teacher_name: Optional[str] = Field(None, description="Teacher who teaches this class", example="Dr. Rajesh Kumar")
    room_number: Optional[str] = Field(None, description="Classroom number", example="Room 304")
    academic_year: Optional[str] = Field(None, description="Academic year or semester", example="4th Year")

    model_config = ConfigDict(from_attributes=True)


class ClassSectionCreate(ClassSectionBase):
    pass


class ClassSectionUpdate(BaseModel):
    class_name: Optional[str] = None
    department: Optional[str] = None
    section: Optional[str] = None
    teacher_name: Optional[str] = None
    room_number: Optional[str] = None
    academic_year: Optional[str] = None


class ClassSectionResponse(ClassSectionBase):
    id: int
    created_at: datetime
    total_students: int = 0

    model_config = ConfigDict(from_attributes=True)


class AssignStudentsRequest(BaseModel):
    student_identifiers: List[str] = Field(
        ...,
        description="List of student roll numbers or IDs to enroll in this class",
        example=["21CSE088", "21CSE089"],
    )


# ---------------------------------------------------------
# Schemas for Admin Student Management
# ---------------------------------------------------------
class AdminStudentCreate(BaseModel):
    student_id: Optional[str] = Field(None, description="Student ID (defaults to roll_number)", example="21CSE088")
    roll_number: Optional[str] = Field(None, description="Roll number", example="21CSE088")
    student_no: Optional[str] = Field(None, description="Student phone number", example="9876543210")
    name: str = Field(..., description="Student full name", example="Tarun Kumar")
    class_name: Optional[str] = Field(None, alias="class", description="Class / Section", example="CSE-4A")
    department: Optional[str] = Field(None, description="Department", example="CSE")
    parent_name: Optional[str] = Field(None, description="Parent name", example="Ramesh Kumar")
    parent_phone: Optional[str] = Field(None, description="Parent phone", example="+919876543211")
    class_section_id: Optional[int] = Field(None, description="Assign directly to a class section ID", example=1)

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


class AdminStudentUpdate(BaseModel):
    name: Optional[str] = None
    roll_number: Optional[str] = None
    student_no: Optional[str] = None
    class_name: Optional[str] = Field(None, alias="class")
    department: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    class_section_id: Optional[int] = None

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class AdminStudentItem(BaseModel):
    id: int
    student_id: str
    roll_number: Optional[str] = None
    name: str
    department: Optional[str] = None
    class_name: Optional[str] = None
    section: Optional[str] = None
    teacher_name: Optional[str] = None
    student_no: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    class_section_id: Optional[int] = None
    total_classes: int = 0
    present_count: int = 0
    absent_count: int = 0
    attendance_rate: float = 0.0
    status: str = "safe"

    model_config = ConfigDict(from_attributes=True)


class AdminDashboardStats(BaseModel):
    total_students: int
    total_classes: int
    total_departments: int
    overall_attendance_rate: float
    at_risk_students_count: int
    department_summary: List[dict]


class TeacherClassItem(BaseModel):
    id: int
    class_name: str
    section: str
    department: str
    room_number: Optional[str] = None
    academic_year: Optional[str] = None
    total_students: int = 0


class TeacherSummary(BaseModel):
    teacher_name: str
    department: Optional[str] = None
    total_classes: int
    classes: List[TeacherClassItem]


# ---------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------
def find_student_by_id(identifier: str, db: Session) -> Optional[models.Student]:
    return (
        db.query(models.Student)
        .filter(
            (models.Student.student_id == identifier)
            | (models.Student.roll_number == identifier)
        )
        .first()
    )


# ---------------------------------------------------------
# 1. Class & Section Operations
# ---------------------------------------------------------

# Create a class section
@router.post(
    "/classes",
    response_model=ClassSectionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new class, department, and section",
)
def create_class_section(data: ClassSectionCreate, db: Session = Depends(get_db)):
    existing = (
        db.query(models.ClassSection)
        .filter(
            models.ClassSection.department == data.department,
            models.ClassSection.section == data.section,
            models.ClassSection.class_name == data.class_name,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Class '{data.class_name}' ({data.department} - Section {data.section}) already exists.",
        )

    new_class = models.ClassSection(
        class_name=data.class_name,
        department=data.department,
        section=data.section,
        teacher_name=data.teacher_name,
        room_number=data.room_number,
        academic_year=data.academic_year,
        created_at=datetime.utcnow(),
    )
    db.add(new_class)
    db.commit()
    db.refresh(new_class)

    return ClassSectionResponse(
        id=new_class.id,
        class_name=new_class.class_name,
        department=new_class.department,
        section=new_class.section,
        teacher_name=new_class.teacher_name,
        room_number=new_class.room_number,
        academic_year=new_class.academic_year,
        created_at=new_class.created_at,
        total_students=0,
    )


# List all classes
@router.get(
    "/classes",
    response_model=List[ClassSectionResponse],
    summary="List all classes and sections",
)
def get_all_classes(
    department: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.ClassSection)
    if department:
        query = query.filter(models.ClassSection.department == department)

    classes = query.all()
    results = []
    for c in classes:
        st_count = (
            db.query(models.Student)
            .filter(
                (models.Student.class_section_id == c.id)
                | (models.Student.class_name == f"{c.class_name}-{c.section}")
                | (models.Student.class_name == c.section)
            )
            .count()
        )
        results.append(
            ClassSectionResponse(
                id=c.id,
                class_name=c.class_name,
                department=c.department,
                section=c.section,
                teacher_name=c.teacher_name,
                room_number=c.room_number,
                academic_year=c.academic_year,
                created_at=c.created_at,
                total_students=st_count,
            )
        )
    return results


# View class details and enrolled students
@router.get(
    "/classes/{class_id}",
    summary="Get class details and enrolled student roster",
)
def get_class_details(class_id: int, db: Session = Depends(get_db)):
    c = db.query(models.ClassSection).filter(models.ClassSection.id == class_id).first()
    if not c:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with ID {class_id} not found.",
        )

    students = (
        db.query(models.Student)
        .filter(
            (models.Student.class_section_id == c.id)
            | (models.Student.class_name == f"{c.class_name}-{c.section}")
            | (models.Student.class_name == c.section)
        )
        .all()
    )

    student_list = []
    for s in students:
        total_att = db.query(models.Attendance).filter(models.Attendance.student_id == s.student_id).count()
        present = db.query(models.Attendance).filter(models.Attendance.student_id == s.student_id, models.Attendance.status == "Present").count()
        rate = round((present / max(total_att, 1)) * 100, 1) if total_att > 0 else 100.0

        student_list.append({
            "id": s.id,
            "student_id": s.student_id,
            "roll_number": s.roll_number,
            "name": s.name,
            "phone": s.student_no,
            "parent_name": s.parent_name,
            "parent_phone": s.parent_phone,
            "attendance_rate": rate,
            "status": "safe" if rate >= 85 else "warning" if rate >= 75 else "critical",
        })

    return {
        "class_id": c.id,
        "class_name": c.class_name,
        "department": c.department,
        "section": c.section,
        "teacher_name": c.teacher_name,
        "room_number": c.room_number,
        "academic_year": c.academic_year,
        "total_enrolled": len(student_list),
        "students": student_list,
    }


# Update class details
@router.put(
    "/classes/{class_id}",
    response_model=ClassSectionResponse,
    summary="Update class details",
)
def update_class(class_id: int, data: ClassSectionUpdate, db: Session = Depends(get_db)):
    c = db.query(models.ClassSection).filter(models.ClassSection.id == class_id).first()
    if not c:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with ID {class_id} not found.",
        )

    update_dict = data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        if field == "teacher_name" and val is not None:
            val = val.strip() if val.strip() else None
        setattr(c, field, val)

    db.commit()
    db.refresh(c)

    st_count = db.query(models.Student).filter(models.Student.class_section_id == c.id).count()
    return ClassSectionResponse(
        id=c.id,
        class_name=c.class_name,
        department=c.department,
        section=c.section,
        teacher_name=c.teacher_name,
        room_number=c.room_number,
        academic_year=c.academic_year,
        created_at=c.created_at,
        total_students=st_count,
    )


# Delete class
@router.delete(
    "/classes/{class_id}",
    summary="Delete class section",
)
def delete_class(class_id: int, db: Session = Depends(get_db)):
    c = db.query(models.ClassSection).filter(models.ClassSection.id == class_id).first()
    if not c:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with ID {class_id} not found.",
        )

    # Unlink students from this class
    db.query(models.Student).filter(models.Student.class_section_id == c.id).update(
        {"class_section_id": None}
    )
    db.delete(c)
    db.commit()
    return {"message": f"Class '{c.class_name} - Section {c.section}' deleted successfully."}


# ---------------------------------------------------------
# 2. Add / Remove Students from Class Section
# ---------------------------------------------------------

# Add / Enroll students into a class
@router.post(
    "/classes/{class_id}/students",
    summary="Add or enroll students into a class section",
)
def add_students_to_class(
    class_id: int,
    data: AssignStudentsRequest,
    db: Session = Depends(get_db),
):
    c = db.query(models.ClassSection).filter(models.ClassSection.id == class_id).first()
    if not c:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with ID {class_id} not found.",
        )

    enrolled = []
    not_found = []

    for identifier in data.student_identifiers:
        student = find_student_by_id(identifier, db)
        if student:
            student.class_section_id = c.id
            student.class_name = f"{c.class_name}-{c.section}"
            student.department = c.department
            enrolled.append(student.name)
        else:
            not_found.append(identifier)

    db.commit()

    return {
        "message": f"Successfully enrolled {len(enrolled)} students into '{c.class_name}' ({c.section}).",
        "class_id": c.id,
        "class_name": c.class_name,
        "section": c.section,
        "enrolled_students": enrolled,
        "not_found": not_found,
    }


# Remove student from class section
@router.delete(
    "/classes/{class_id}/students/{identifier}",
    summary="Remove a student from a class section",
)
def remove_student_from_class(
    class_id: int,
    identifier: str,
    db: Session = Depends(get_db),
):
    student = find_student_by_id(identifier, db)
    if not student or student.class_section_id != class_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student '{identifier}' is not enrolled in class ID {class_id}.",
        )

    student.class_section_id = None
    db.commit()

    return {
        "message": f"Student '{identifier}' removed from class section.",
        "student_id": student.student_id,
        "class_id": class_id,
    }


# ---------------------------------------------------------
# 3. Admin Student Operations (Add Student, Delete Student, List)
# ---------------------------------------------------------

# Admin: Add Student
@router.post(
    "/students",
    response_model=AdminStudentItem,
    status_code=status.HTTP_201_CREATED,
    summary="Admin: Add a new student directly into database",
)
def admin_add_student(data: AdminStudentCreate, db: Session = Depends(get_db)):
    assigned_id = data.student_id or data.roll_number or data.student_no
    if not assigned_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student ID or Roll Number must be provided.",
        )

    # Check for existing
    existing = db.query(models.Student).filter(
        (models.Student.student_id == assigned_id)
        | (
            (models.Student.roll_number == data.roll_number)
            & (models.Student.roll_number.isnot(None))
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Student '{assigned_id}' already exists in database.",
        )

    # Link to class section if ID provided
    cls_sec = None
    if data.class_section_id:
        cls_sec = db.query(models.ClassSection).filter(models.ClassSection.id == data.class_section_id).first()

    class_name = data.class_name
    department = data.department
    if cls_sec:
        class_name = class_name or f"{cls_sec.class_name}-{cls_sec.section}"
        department = department or cls_sec.department

    new_student = models.Student(
        student_id=assigned_id,
        roll_number=data.roll_number or assigned_id,
        student_no=data.student_no,
        name=data.name,
        class_name=class_name,
        department=department,
        parent_name=data.parent_name,
        parent_phone=data.parent_phone,
        class_section_id=data.class_section_id,
        created_at=datetime.utcnow(),
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    return AdminStudentItem(
        id=new_student.id,
        student_id=new_student.student_id,
        roll_number=new_student.roll_number,
        name=new_student.name,
        department=new_student.department,
        class_name=new_student.class_name,
        section=cls_sec.section if cls_sec else new_student.class_name,
        teacher_name=cls_sec.teacher_name if cls_sec else None,
        student_no=new_student.student_no,
        parent_name=new_student.parent_name,
        parent_phone=new_student.parent_phone,
        class_section_id=new_student.class_section_id,
        total_classes=0,
        present_count=0,
        absent_count=0,
        attendance_rate=100.0,
        status="safe",
    )


# Admin: Delete Student
@router.delete(
    "/students/{identifier}",
    summary="Admin: Delete a student permanently from database",
)
def admin_delete_student(identifier: str, db: Session = Depends(get_db)):
    student = find_student_by_id(identifier, db)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student '{identifier}' not found in database.",
        )

    # Delete related attendance records
    db.query(models.Attendance).filter(models.Attendance.student_id == student.student_id).delete()
    db.delete(student)
    db.commit()

    return {
        "message": f"Student '{identifier}' ({student.name}) deleted permanently by Admin.",
        "student_id": student.student_id,
    }


# Admin: List all students
@router.get(
    "/students",
    response_model=List[AdminStudentItem],
    summary="Get all students with class, section, teacher, and attendance stats",
)
def get_admin_students(
    department: Optional[str] = None,
    class_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Student)
    if department:
        query = query.filter(models.Student.department == department)
    if class_id:
        query = query.filter(models.Student.class_section_id == class_id)

    students = query.all()
    results = []

    for s in students:
        teacher = None
        sec = None
        if s.class_section:
            teacher = s.class_section.teacher_name
            sec = s.class_section.section
        else:
            sec = s.class_name

        total = db.query(models.Attendance).filter(models.Attendance.student_id == s.student_id).count()
        pres = db.query(models.Attendance).filter(models.Attendance.student_id == s.student_id, models.Attendance.status == "Present").count()
        ab = db.query(models.Attendance).filter(models.Attendance.student_id == s.student_id, models.Attendance.status == "Absent").count()
        rate = round((pres / max(total, 1)) * 100, 1) if total > 0 else 92.0

        results.append(
            AdminStudentItem(
                id=s.id,
                student_id=s.student_id,
                roll_number=s.roll_number,
                name=s.name,
                department=s.department,
                class_name=s.class_name,
                section=sec,
                teacher_name=teacher,
                student_no=s.student_no,
                parent_name=s.parent_name,
                parent_phone=s.parent_phone,
                class_section_id=s.class_section_id,
                total_classes=total,
                present_count=pres,
                absent_count=ab,
                attendance_rate=rate,
                status="safe" if rate >= 85 else "warning" if rate >= 75 else "critical",
            )
        )

    return results


# ---------------------------------------------------------
# 4. Admin Overview & Dashboard Analytics
# ---------------------------------------------------------
@router.get(
    "/dashboard-stats",
    response_model=AdminDashboardStats,
    summary="Get comprehensive admin statistics across all classes, students, and attendance",
)
def get_admin_dashboard_stats(db: Session = Depends(get_db)):
    total_students = db.query(models.Student).count()
    total_classes = db.query(models.ClassSection).count()

    depts = db.query(models.Student.department).distinct().all()
    class_depts = db.query(models.ClassSection.department).distinct().all()
    all_depts = sorted(list({d[0] for d in depts + class_depts if d[0]}))

    total_records = db.query(models.Attendance).count()
    present_records = db.query(models.Attendance).filter(models.Attendance.status == "Present").count()
    overall_rate = round((present_records / max(total_records, 1)) * 100, 1) if total_records > 0 else 92.0

    at_risk_count = 0
    students = db.query(models.Student).all()
    for s in students:
        s_total = db.query(models.Attendance).filter(models.Attendance.student_id == s.student_id).count()
        if s_total > 0:
            s_pres = db.query(models.Attendance).filter(models.Attendance.student_id == s.student_id, models.Attendance.status == "Present").count()
            if (s_pres / s_total) < 0.75:
                at_risk_count += 1

    dept_summary = []
    for d in all_depts:
        d_students = db.query(models.Student).filter(models.Student.department == d).count()
        d_classes = db.query(models.ClassSection).filter(models.ClassSection.department == d).count()
        dept_summary.append({
            "department": d,
            "students_count": d_students,
            "classes_count": d_classes,
        })

    return AdminDashboardStats(
        total_students=total_students,
        total_classes=total_classes,
        total_departments=len(all_depts),
        overall_attendance_rate=overall_rate,
        at_risk_students_count=at_risk_count,
        department_summary=dept_summary,
    )


# ---------------------------------------------------------
# 5. Teacher Overview (Classes grouped by Teacher)
# ---------------------------------------------------------
@router.get(
    "/teachers",
    response_model=List[TeacherSummary],
    summary="Get all teachers and the classes they teach",
)
def get_admin_teachers(db: Session = Depends(get_db)):
    all_classes = db.query(models.ClassSection).filter(models.ClassSection.teacher_name.isnot(None)).all()
    teachers_dict = {}

    for c in all_classes:
        tname = c.teacher_name.strip() if c.teacher_name else ""
        if not tname:
            continue
        if tname not in teachers_dict:
            teachers_dict[tname] = {
                "teacher_name": tname,
                "department": c.department,
                "classes": [],
            }

        st_count = db.query(models.Student).filter(
            (models.Student.class_section_id == c.id)
            | (models.Student.class_name == f"{c.class_name}-{c.section}")
            | (models.Student.class_name == c.section)
        ).count()

        teachers_dict[tname]["classes"].append(
            TeacherClassItem(
                id=c.id,
                class_name=c.class_name,
                section=c.section,
                department=c.department,
                room_number=c.room_number,
                academic_year=c.academic_year,
                total_students=st_count,
            )
        )

    return [
        TeacherSummary(
            teacher_name=v["teacher_name"],
            department=v["department"],
            total_classes=len(v["classes"]),
            classes=v["classes"],
        )
        for v in teachers_dict.values()
    ]

