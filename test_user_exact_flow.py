import json
import urllib.request

BASE_URL = "http://127.0.0.1:8000"

def chat(message: str, session_id: str):
    url = f"{BASE_URL}/voice-agent/chat"
    payload = json.dumps({"message": message, "session_id": session_id}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))

def test_user_flow():
    session_id = f"user_exact_flow_{hash(id)}"
    print("==================================================")
    print("TESTING USER'S EXACT LIVE CONVERSATION FLOW")
    print("==================================================")

    steps = [
        "What is 2 + 3?",
        "what is your name",
        "okay now your voice is good",
        "i given comnplemen",
        "what is tharun attendace",
        "absent studnets",
        "okay does he prenst today"
    ]

    for step in steps:
        res = chat(step, session_id)
        print(f"\nYou (Microphone): \"{step}\"")
        print(f"Priya ({res['intent']}): \"{res['reply']}\"")

if __name__ == "__main__":
    test_user_flow()
