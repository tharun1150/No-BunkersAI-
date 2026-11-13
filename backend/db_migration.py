import logging
from sqlalchemy import create_engine, inspect, text
from backend.database import engine, Base
from backend import models

logger = logging.getLogger(__name__)

def run_migrations():
    """
    Safely creates new tables and adds missing columns to existing tables
    without dropping or modifying existing data.
    """
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    # 1. Create all missing tables
    Base.metadata.create_all(bind=engine)

    # 2. Check and migrate absence_verifications columns
    if "absence_verifications" in existing_tables:
        existing_cols = {col["name"] for col in inspector.get_columns("absence_verifications")}
        
        alter_statements = []
        if "attendance_id" not in existing_cols:
            alter_statements.append("ALTER TABLE absence_verifications ADD COLUMN attendance_id INTEGER REFERENCES attendance(id);")
        if "verification_status" not in existing_cols:
            alter_statements.append("ALTER TABLE absence_verifications ADD COLUMN verification_status VARCHAR(50) DEFAULT 'PENDING';")
        if "is_bunking_suspected" not in existing_cols:
            alter_statements.append("ALTER TABLE absence_verifications ADD COLUMN is_bunking_suspected INTEGER DEFAULT 0;")
        if "comparison_summary" not in existing_cols:
            alter_statements.append("ALTER TABLE absence_verifications ADD COLUMN comparison_summary TEXT;")
        if "conflicting_statements" not in existing_cols:
            alter_statements.append("ALTER TABLE absence_verifications ADD COLUMN conflicting_statements TEXT;")
        if "retry_count" not in existing_cols:
            alter_statements.append("ALTER TABLE absence_verifications ADD COLUMN retry_count INTEGER DEFAULT 0;")
        if "updated_at" not in existing_cols:
            alter_statements.append("ALTER TABLE absence_verifications ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;")

        with engine.begin() as conn:
            for stmt in alter_statements:
                logger.info(f"Running migration: {stmt}")
                conn.execute(text(stmt))

    logger.info("Database schema synchronized successfully.")

def seed_sample_data_if_empty():
    """
    Ensures that standard student, teacher, HOD, and department records
    exist in the database for realistic testing and production usage.
    """
    from backend.database import SessionLocal
    db = SessionLocal()
    try:
        # Check departments
        dept_count = db.query(models.Department).count()
        if dept_count == 0:
            departments_data = [
                ("CSE", "Computer Science & Engineering"),
                ("ECE", "Electronics & Communication Engineering"),
                ("AIML", "Artificial Intelligence & Machine Learning"),
                ("IT", "Information Technology"),
                ("MECH", "Mechanical Engineering"),
                ("CIVIL", "Civil Engineering"),
            ]
            for code, name in departments_data:
                db.add(models.Department(code=code, name=name))
            db.commit()

        # Check HODs
        hod_count = db.query(models.HOD).count()
        if hod_count == 0:
            hods_data = [
                ("Dr. K. V. Sharma", "kv.sharma@college.edu", "+919876500001", "CSE"),
                ("Dr. Priya Mohan", "priya.mohan@college.edu", "+919876500002", "ECE"),
                ("Dr. Anand Rao", "anand.rao@college.edu", "+919876500003", "AIML"),
                ("Dr. Sneha Reddy", "sneha.reddy@college.edu", "+919876500004", "IT"),
            ]
            for name, email, phone, dept_code in hods_data:
                db.add(models.HOD(name=name, email=email, phone=phone, department_code=dept_code))
            db.commit()

        # Check Class Sections
        section_count = db.query(models.ClassSection).count()
        if section_count == 0:
            db.add(models.ClassSection(
                class_name="B.Tech CSE",
                department="CSE",
                section="4A",
                teacher_name="Dr. Rajesh Kumar",
                teacher_id="TCH-001",
                room_number="Room 304",
                academic_year="4th Year"
            ))
            db.commit()

        # Check students
        student_count = db.query(models.Student).count()
        if student_count < 3:
            sample_students = [
                {
                    "student_id": "21CS001",
                    "roll_number": "21CS001",
                    "name": "Rahul Kumar",
                    "class_name": "CSE-4A",
                    "department": "CSE",
                    "student_no": "+919876543210",
                    "parent_name": "Suresh Kumar",
                    "parent_phone": "+919876543211",
                },
                {
                    "student_id": "21CS002",
                    "roll_number": "21CS002",
                    "name": "Arjun Reddy",
                    "class_name": "CSE-4A",
                    "department": "CSE",
                    "student_no": "+919876543212",
                    "parent_name": "Venkat Reddy",
                    "parent_phone": "+919876543213",
                },
                {
                    "student_id": "21CS003",
                    "roll_number": "21CS003",
                    "name": "Sai Teja",
                    "class_name": "CSE-4A",
                    "department": "CSE",
                    "student_no": "+919876543214",
                    "parent_name": "Ravi Teja",
                    "parent_phone": "+919876543215",
                },
                {
                    "student_id": "22EC004",
                    "roll_number": "22EC004",
                    "name": "Priya Sharma",
                    "class_name": "ECE-3B",
                    "department": "ECE",
                    "student_no": "+919876543216",
                    "parent_name": "Mohan Sharma",
                    "parent_phone": "+919876543217",
                },
            ]
            for s in sample_students:
                existing = db.query(models.Student).filter(models.Student.student_id == s["student_id"]).first()
                if not existing:
                    db.add(models.Student(**s))
            db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    run_migrations()
    seed_sample_data_if_empty()
    print("Database migration & seed completed successfully!")
