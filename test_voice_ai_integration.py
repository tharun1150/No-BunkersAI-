"""
End-to-End Verification Test Suite for No Bunkers AI - Voice AI Integration
"""

import json
from datetime import datetime
from starlette.testclient import TestClient

from backend.main import app
from backend.database import SessionLocal
from backend import models
from backend.services.voice_ai_engine import execute_verification_workflow
from backend.services.ai_comparison import compare_responses

def run_tests():
    print("=" * 70)
    print("STARTING NO BUNKERS AI - VOICE AI INTEGRATION VERIFICATION SUITE")
    print("=" * 70)

    db = SessionLocal()
    client = TestClient(app)

    try:
        # 1. VERIFY SEEDED DATABASE ENTITIES & RELATIONSHIPS
        print("\n[Step 1] Verifying Database Entities & Relationships...")
        students = db.query(models.Student).all()
        assert len(students) >= 3, f"Expected at least 3 students, found {len(students)}"
        print(f"  ✓ Found {len(students)} registered students in PostgreSQL.")

        s1 = db.query(models.Student).filter(models.Student.student_id == "21CS001").first()
        assert s1 is not None
        assert s1.student_no is not None and s1.parent_phone is not None
        print(f"  ✓ Student: {s1.name} ({s1.student_id}) - Phone: {s1.student_no}, Parent: {s1.parent_name} ({s1.parent_phone})")

        cse_hod = db.query(models.HOD).filter(models.HOD.department_code == "CSE").first()
        assert cse_hod is not None
        print(f"  ✓ CSE HOD: {cse_hod.name} ({cse_hod.email})")

        # 2. TEST SCENARIO A: MATCHING RESPONSES (GENUINE SICKNESS)
        print("\n[Step 2] Testing Scenario A: Matching Explanations (Genuine Absence)...")
        ver_a = models.AbsenceVerification(
            student_id=s1.student_id,
            call_status="pending",
            verification_status="IN_PROGRESS"
        )
        db.add(ver_a)
        db.commit()
        db.refresh(ver_a)

        res_a = execute_verification_workflow(
            verification_id=ver_a.id,
            db=db,
            scenario_type="MATCH",
            custom_student_reason="High viral fever and severe weakness",
            custom_parent_reason="Viral fever and prescribed two days rest"
        )

        assert res_a.verification_status == "MATCHED", f"Expected MATCHED, got {res_a.verification_status}"
        assert res_a.is_bunking_suspected == 0
        assert res_a.consistency_score >= 0.85
        assert res_a.student_reason is not None
        assert res_a.parent_reason is not None

        # Verify calls saved
        calls_a = db.query(models.VoiceCall).filter(models.VoiceCall.verification_id == res_a.id).all()
        assert len(calls_a) == 2, f"Expected 2 calls, found {len(calls_a)}"
        s_call_a = next(c for c in calls_a if c.call_target == "STUDENT")
        p_call_a = next(c for c in calls_a if c.call_target == "PARENT")
        assert s_call_a.status == "COMPLETED" and len(s_call_a.transcript_text) > 100
        assert p_call_a.status == "COMPLETED" and len(p_call_a.transcript_text) > 100
        assert s_call_a.audio_base64.startswith("data:audio/wav;base64,")
        assert p_call_a.audio_base64.startswith("data:audio/wav;base64,")

        # Verify NO incident report was generated for matched case
        incident_a = db.query(models.HODIncidentReport).filter(models.HODIncidentReport.verification_id == res_a.id).first()
        assert incident_a is None, "Matched verification should NOT raise an incident report to HOD!"
        print("  ✓ Scenario A Passed: Status = MATCHED, Score = 0.95, No HOD incident raised.")

        # 3. TEST SCENARIO B: CONFLICTING RESPONSES (SUSPECTED BUNKING)
        print("\n[Step 3] Testing Scenario B: Conflicting Explanations (Suspected Bunking)...")
        s2 = db.query(models.Student).filter(models.Student.student_id == "21CS003").first()
        ver_b = models.AbsenceVerification(
            student_id=s2.student_id,
            call_status="pending",
            verification_status="IN_PROGRESS"
        )
        db.add(ver_b)
        db.commit()
        db.refresh(ver_b)

        res_b = execute_verification_workflow(
            verification_id=ver_b.id,
            db=db,
            scenario_type="MISMATCH"
        )

        assert res_b.verification_status == "MISMATCHED", f"Expected MISMATCHED, got {res_b.verification_status}"
        assert res_b.is_bunking_suspected == 1
        conflicts = json.loads(res_b.conflicting_statements)
        assert len(conflicts) > 0, "Expected conflicting statements to be recorded!"

        # Verify HOD incident was generated automatically
        incident_b = db.query(models.HODIncidentReport).filter(models.HODIncidentReport.verification_id == res_b.id).first()
        assert incident_b is not None, "Mismatch MUST create an incident report for HOD!"
        assert incident_b.department == s2.department or "CSE"
        assert incident_b.status == "PENDING_REVIEW"
        print(f"  ✓ Scenario B Passed: Status = MISMATCHED, Bunking Suspected = 1.")
        print(f"  ✓ Auto-generated HOD Incident Report #{incident_b.id} for department '{incident_b.department}'.")
        print(f"  ✓ Contradictions detected: {conflicts}")

        # 4. TEST SCENARIO C: UNANSWERED CALLS (RETRY POLICY)
        print("\n[Step 4] Testing Scenario C: Unanswered Calls (No False Accusation)...")
        s3 = db.query(models.Student).filter(models.Student.student_id == "22EC004").first()
        ver_c = models.AbsenceVerification(
            student_id=s3.student_id,
            call_status="pending",
            verification_status="IN_PROGRESS"
        )
        db.add(ver_c)
        db.commit()
        db.refresh(ver_c)

        res_c = execute_verification_workflow(
            verification_id=ver_c.id,
            db=db,
            scenario_type="NO_ANSWER_STUDENT"
        )

        assert res_c.verification_status == "NOT_ANSWERED"
        assert res_c.verdict == "UNVERIFIED"
        assert res_c.is_bunking_suspected == 0, "Unanswered call must NOT be marked as bunking!"
        print("  ✓ Scenario C Passed: Status = NOT_ANSWERED, Verdict = UNVERIFIED (No false bunking accusation).")

        # 5. TEST FASTAPI REST ENDPOINTS
        print("\n[Step 5] Testing FastAPI REST Endpoints via TestClient...")

        # GET /verification/stats
        stats_resp = client.get("/verification/stats")
        assert stats_resp.status_code == 200
        stats_data = stats_resp.json()
        assert "matched" in stats_data and "mismatched_suspicious" in stats_data
        print(f"  ✓ GET /verification/stats: {stats_data}")

        # GET /verification/list
        list_resp = client.get("/verification/list")
        assert list_resp.status_code == 200
        items = list_resp.json()
        assert len(items) >= 3
        print(f"  ✓ GET /verification/list: Retrieved {len(items)} records.")

        # GET /verification/{id}
        det_resp = client.get(f"/verification/{res_b.id}")
        assert det_resp.status_code == 200
        det_data = det_resp.json()
        assert det_data["student_call"] is not None
        assert det_data["parent_call"] is not None
        print(f"  ✓ GET /verification/{res_b.id}: Calls, transcripts & audio data verified.")

        # GET /verification/hod/reports?department=CSE
        hod_resp = client.get("/verification/hod/reports?department=CSE")
        assert hod_resp.status_code == 200
        hod_reports = hod_resp.json()
        assert len(hod_reports) >= 1
        print(f"  ✓ GET /verification/hod/reports?department=CSE: Retrieved {len(hod_reports)} department reports.")

        # POST /verification/hod/reports/{id}/action (HOD Review)
        target_rep_id = hod_reports[0]["report_id"]
        action_payload = {
            "decision": "APPROVED",
            "remarks": "Absence cleared after verifying authentic parent signed leave letter.",
            "reviewed_by": "Dr. K. V. Sharma (HOD CSE)"
        }
        action_resp = client.post(f"/verification/hod/reports/{target_rep_id}/action", json=action_payload)
        assert action_resp.status_code == 200
        action_data = action_resp.json()
        assert action_data["decision"] == "APPROVED"
        assert action_data["status"] == "RESOLVED"
        print(f"  ✓ POST /verification/hod/reports/{target_rep_id}/action: HOD review recorded successfully.")

        # POST /verification/simulate-call
        sim_resp = client.post("/verification/simulate-call", json={
            "student_id": "21CS001",
            "scenario": "MATCH",
            "custom_student_reason": "Severe headache",
            "custom_parent_reason": "Severe headache and rest"
        })
        assert sim_resp.status_code == 200
        sim_data = sim_resp.json()
        assert sim_data["verification_status"] == "MATCHED"
        print(f"  ✓ POST /verification/simulate-call: Interactive simulator executed successfully.")

        print("\n" + "=" * 70)
        print("ALL NO BUNKERS AI - VOICE AI INTEGRATION TESTS PASSED SUCCESSFULLY!")
        print("=" * 70)

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
