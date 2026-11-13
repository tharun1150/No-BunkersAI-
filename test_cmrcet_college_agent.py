import json
import urllib.request
import time

BASE_URL = "http://127.0.0.1:8000"

def chat(message: str, session_id: str = "cmrcet_test"):
    url = f"{BASE_URL}/voice-agent/chat"
    payload = json.dumps({"message": message, "session_id": session_id}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        elapsed = (time.time() - t0) * 1000
        return data, elapsed

def run_tests():
    print("==================================================")
    print("CMRCET VOICE AI AGENT & DOSSIER KNOWLEDGE VERIFICATION")
    print("==================================================")

    test_queries = [
        ("Role & Purpose", "What is the agent role and what is your job?"),
        ("Counselling Code", "What is the counselling code for CMRCET?"),
        ("College Timings", "What are the college working hours?"),
        ("Placements & Recruiters", "Tell me about placement packages and top recruiters"),
        ("Courses & Branches", "What programs and B.Tech specializations are offered?"),
        ("Campus Location & Bus", "How to reach the college and what bus route goes there?"),
        ("Hostels & Dining", "Tell me about campus hostels and food facilities"),
        ("Live Student Attendance", "What is Tharun's attendance status?"),
        ("College Absentees", "How many students are absent today?"),
        ("Yesterday Missed Classes", "Was Tharun present yesterday?"),
    ]

    for category, query in test_queries:
        res, ms = chat(query)
        print(f"\n[{category}]")
        print(f"You (Microphone): \"{query}\"")
        print(f"Priya [{res['intent']} | {ms:.1f}ms]: \"{res['reply']}\"")

if __name__ == "__main__":
    run_tests()
