import json
import urllib.request

BASE_URL = "http://127.0.0.1:8000"

def chat(message: str, session_id: str):
    url = f"{BASE_URL}/voice-agent/chat"
    payload = json.dumps({"message": message, "session_id": session_id}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))

def test_user_flow_2():
    session_id = "test_yesterday_and_audio_session_99"
    print("==================================================")
    print("TESTING USER'S AUDIO & YESTERDAY FLOW")
    print("==================================================")

    steps = [
        "Hello",
        "I didn't get you",
        "I'm unable to hear your voice",
        "It's OK",
        "It's OK go can you get Tarun attendance",
        "OK that's good but what is about his bastard attendance that he present yesterday",
        "Like I asked about it is present yesterday"
    ]

    for step in steps:
        res = chat(step, session_id)
        print(f"\nYou (Microphone): \"{step}\"")
        print(f"Priya ({res['intent']}): \"{res['reply']}\"")

if __name__ == "__main__":
    test_user_flow_2()
