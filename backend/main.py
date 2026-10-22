

from fastapi import FastAPI
from backend.attendance import AttendanceInput, find_absent_students

app = FastAPI(title="NO BUNKERS AI API")


@app.get("/")
def home():
    return {"message": "NO BUNKERS AI backend is running!"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/attendance/absent")
def get_absent_students(records: list[AttendanceInput]):
    return {
        "absent_students": find_absent_students(records)
    }
