"""
Seeds comprehensive live and historical period-by-period attendance records
for every student in the college database across the past 45 days.
"""

import random
from datetime import datetime, timedelta
from backend.database import SessionLocal
from backend import models

SUBJECTS = [
    {"subject": "Machine Learning", "faculty": "Dr. Rajesh Kumar", "code": "CS401"},
    {"subject": "Operating Systems", "faculty": "Prof. S. Rao", "code": "CS402"},
    {"subject": "Computer Networks", "faculty": "Dr. Anita Desai", "code": "CS403"},
    {"subject": "Database Management", "faculty": "Prof. V. Sharma", "code": "CS404"},
    {"subject": "Cloud Computing", "faculty": "Dr. M. Reddy", "code": "CS405"},
]

TIME_SLOTS = [
    "09:00 AM - 10:00 AM (Period 1)",
    "10:00 AM - 11:00 AM (Period 2)",
    "11:15 AM - 12:15 PM (Period 3)",
    "01:30 AM - 02:30 PM (Period 4)",
    "02:30 PM - 03:30 PM (Period 5)",
]


def seed_attendance():
    db = SessionLocal()
    students = db.query(models.Student).all()
    print(f"Seeding historical and live attendance for {len(students)} students...")

    # Clear existing attendance records to ensure clean dataset
    db.query(models.Attendance).delete()
    db.commit()

    base_date = datetime(2026, 11, 11)  # Today's local date
    total_records = 0

    # Student specific attendance profiles:
    # Rahul Kumar (21CS001): 72.2% (warning / at-risk)
    # Arjun Reddy (21CS002): 86.5% (safe)
    # Sai Teja (21CS003): 61.8% (critical)
    # Priya Sharma (22EC004): 92.4% (safe)
    attendance_weights = {
        "21CS001": 0.72,
        "21CS002": 0.87,
        "21CS003": 0.62,
        "22EC004": 0.93,
    }

    # Generate 36 working days (skipping Sundays)
    working_days = []
    curr = base_date
    while len(working_days) < 36:
        if curr.weekday() != 6:  # Skip Sunday
            working_days.append(curr)
        curr -= timedelta(days=1)

    working_days.reverse()  # Chronological order

    for student in students:
        roll = student.roll_number or student.student_id
        target_prob = attendance_weights.get(roll, 0.78)

        for day_idx, day_dt in enumerate(working_days):
            date_str = day_dt.strftime("%Y-%m-%d")
            is_today = (day_dt.date() == base_date.date())

            for period_idx, sub in enumerate(SUBJECTS):
                time_slot = TIME_SLOTS[period_idx]

                # Specific deterministic scenario for today (2026-11-11)
                if is_today:
                    if roll == "21CS001":
                        # Rahul missed period 2 (Operating Systems)
                        status = "Absent" if period_idx == 1 else "Present"
                        remarks = "Unapproved absence in period 2 (suspected bunk)" if period_idx == 1 else None
                    elif roll == "21CS003":
                        # Sai Teja missed periods 1 and 2
                        status = "Absent" if period_idx in (0, 1) else "Present"
                        remarks = "Morning periods missed" if period_idx in (0, 1) else None
                    else:
                        status = "Present"
                        remarks = None
                else:
                    # Historical days based on target probability
                    rand = random.random()
                    if rand < target_prob:
                        status = "Present"
                        remarks = None
                    elif rand < target_prob + 0.05:
                        status = "Late"
                        remarks = "Late entry by 15 mins"
                    else:
                        status = "Absent"
                        remarks = "Student absent / bunk recorded"

                rec = models.Attendance(
                    student_id=student.student_id,
                    status=status,
                    subject=sub["subject"],
                    date=date_str,
                    time_slot=time_slot,
                    faculty_name=sub["faculty"],
                    section=student.class_name or "CSE-4A",
                    remarks=remarks,
                    timestamp=day_dt.replace(hour=9 + period_idx, minute=0, second=0),
                )
                db.add(rec)
                total_records += 1

    db.commit()
    print(f"Successfully generated {total_records} attendance records across {len(working_days)} dates!")

    # Verify counts
    for student in students:
        cnt = db.query(models.Attendance).filter(models.Attendance.student_id == student.student_id).count()
        pres = db.query(models.Attendance).filter(
            models.Attendance.student_id == student.student_id,
            models.Attendance.status.in_(["Present", "Late"])
        ).count()
        pct = round((pres / max(cnt, 1)) * 100, 1)
        print(f"Verified {student.name} ({student.roll_number or student.student_id}): {pres}/{cnt} classes ({pct}%)")

    db.close()


if __name__ == "__main__":
    seed_attendance()
