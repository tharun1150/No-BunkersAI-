from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend import models
from backend.database import engine, get_db
from backend.db_migration import run_migrations, seed_sample_data_if_empty
from backend.routes.admin import router as admin_router
from backend.routes.outing import router as outing_router
from backend.routes.student import router as student_router
from backend.routes.verification import router as verification_router
from backend.routes.voice_agent import router as voice_agent_router

# Synchronize database schema and seed standard sample data
run_migrations()
seed_sample_data_if_empty()

app = FastAPI(title="NO BUNKERS AI API")

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(student_router)
app.include_router(admin_router)
app.include_router(outing_router)
app.include_router(verification_router)
app.include_router(voice_agent_router)


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


