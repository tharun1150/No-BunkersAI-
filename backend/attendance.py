


from pydantic import BaseModel


class AttendanceInput(BaseModel):
    student_id: str
    status: str


def find_absent_students(records: list[AttendanceInput]):
    return [
        record.model_dump()
        for record in records
        if record.status.strip().lower() == "absent"
    ]


