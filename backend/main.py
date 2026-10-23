from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend import models
from backend.database import engine, get_db
from backend.routes.student import router as student_router

# Create database tables if they do not exist
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="NO BUNKERS AI API")

# Register routers
app.include_router(student_router)


@app.get("/")
def home():
    return {"message": "NO BUNKERS AI backend is running!"}


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
    }


