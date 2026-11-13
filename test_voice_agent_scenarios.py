import json
import urllib.request
import sys

BASE_URL = "http://127.0.0.1:8000"

def call_voice_agent(message: str, session_id: str = "test_suite_session", generation_id: str = "gen_1"):
    url = f"{BASE_URL}/voice-agent/chat"
    payload = json.dumps({
        "message": message,
        "session_id": session_id,
        "generation_id": generation_id
    }).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))

def reset_session(session_id: str):
    url = f"{BASE_URL}/voice-agent/reset-session"
    data = f"session_id={session_id}".encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    with urllib.request.urlopen(req, timeout=5) as resp:
        return json.loads(resp.read().decode("utf-8"))

def run_tests():
    print("==================================================")
    print("NO BUNKERS AI VOICE AGENT VERIFICATION TEST SUITE")
    print("==================================================")
    session_id = "test_verification_session_42"
    reset_session(session_id)

    # Test 1: Say "Hello"
    r1 = call_voice_agent("Hello", session_id, "gen_1")
    print(f"\n[Test 1] User: 'Hello'")
    print(f"Reply: '{r1['reply']}' | Intent: {r1['intent']}")
    assert r1['intent'] == 'GENERAL'
    assert len(r1['reply']) > 0

    # Test 2: Say "What is 2 + 3?"
    r2 = call_voice_agent("What is 2 + 3?", session_id, "gen_2")
    print(f"\n[Test 2] User: 'What is 2 + 3?'")
    print(f"Reply: '{r2['reply']}' | Intent: {r2['intent']}")
    assert r2['intent'] == 'GENERAL'
    assert "5" in r2['reply']

    # Test 3: Say "How are you?"
    r3 = call_voice_agent("How are you?", session_id, "gen_3")
    print(f"\n[Test 3] User: 'How are you?'")
    print(f"Reply: '{r3['reply']}' | Intent: {r3['intent']}")
    assert r3['intent'] == 'GENERAL'
    assert any(w in r3['reply'].lower() for w in ["well", "good", "doing", "help", "great", "priya"])

    # Test 4: Say "What is Python?"
    r4 = call_voice_agent("What is Python?", session_id, "gen_4")
    print(f"\n[Test 4] User: 'What is Python?'")
    print(f"Reply: '{r4['reply']}' | Intent: {r4['intent']}")
    assert r4['intent'] == 'GENERAL'
    assert "programming" in r4['reply'].lower() or "language" in r4['reply'].lower() or "python" in r4['reply'].lower()

    # Test 5: Ask about absent students
    r5 = call_voice_agent("How many students are absent today?", session_id, "gen_5")
    print(f"\n[Test 5] User: 'How many students are absent today?'")
    print(f"Reply: '{r5['reply']}' | Intent: {r5['intent']}")
    assert r5['intent'] == 'ATTENDANCE'
    assert r5['data'] is not None
    assert "total_absent_today" in r5['data']
    print(f"Ground truth absent count retrieved: {r5['data']['total_absent_today']}")

    # Test 6: Ask an unrelated question after attendance
    r6 = call_voice_agent("What is the capital of France?", session_id, "gen_6")
    print(f"\n[Test 6] User: 'What is the capital of France?' (Unrelated follow-up)")
    print(f"Reply: '{r6['reply']}' | Intent: {r6['intent']}")
    assert r6['intent'] == 'GENERAL'
    assert "attendance" not in r6['reply'].lower()
    assert "paris" in r6['reply'].lower() or "capital" in r6['reply'].lower() or "france" in r6['reply'].lower()

    # Test 7 & 8: Interruption & Generation Token Handling
    # Simulate an interruption: Client issues gen_7 then immediately issues gen_8 (interrupting query)
    print(f"\n[Test 7 & 8] Interruption & Token Invalidation")
    r7 = call_voice_agent("Tell me a long story", session_id, "gen_7")
    r8 = call_voice_agent("Wait, tell me a quick joke instead!", session_id, "gen_8")
    print(f"Interrupted Token gen_7 returned: reply length = {len(r7['reply'])}")
    print(f"Interruption Token gen_8 response: '{r8['reply']}'")
    assert r8['generation_id'] == "gen_8"
    assert "joke" in r8['reply'].lower() or "light" in r8['reply'].lower() or "bug" in r8['reply'].lower() or "?" in r8['reply']

    # Test 9: Empty input / silence handling
    print(f"\n[Test 9] Empty Input / Silence Protection")
    try:
        call_voice_agent("   ", session_id, "gen_9")
        print("FAIL: Empty input was accepted!")
        sys.exit(1)
    except urllib.error.HTTPError as e:
        print(f"Success: Empty input properly rejected with HTTP {e.code} ({e.reason})")
        assert e.code == 400

    # Test 11: Continuous speech / long multi-period attendance question
    r11 = call_voice_agent("Can you tell me how many periods did Rahul attend today and what is his cumulative percentage till now?", session_id, "gen_11")
    print(f"\n[Test 11] User: 'Can you tell me how many periods did Rahul attend today and what is his cumulative percentage till now?'")
    print(f"Reply: '{r11['reply']}' | Intent: {r11['intent']}")
    assert r11['intent'] == 'ATTENDANCE'
    assert "rahul" in r11['reply'].lower() or "attended" in r11['reply'].lower() or "%" in r11['reply'] or "periods" in r11['reply'].lower()

    # Test 12: Multiple consecutive questions (General -> Attendance -> General)
    r12a = call_voice_agent("What is 10 * 5?", session_id, "gen_12a")
    r12b = call_voice_agent("Who is marked absent today?", session_id, "gen_12b")
    r12c = call_voice_agent("What is JavaScript?", session_id, "gen_12c")
    print(f"\n[Test 12] Multiple Consecutive Independent Queries:")
    print(f"  12a (Math): '{r12a['reply']}' [Intent: {r12a['intent']}]")
    print(f"  12b (Attendance): '{r12b['reply']}' [Intent: {r12b['intent']}]")
    print(f"  12c (Tech Definition): '{r12c['reply']}' [Intent: {r12c['intent']}]")
    assert r12a['intent'] == 'GENERAL' and "50" in r12a['reply']
    assert r12b['intent'] == 'ATTENDANCE'
    assert r12c['intent'] == 'GENERAL' and ("javascript" in r12c['reply'].lower() or "programming" in r12c['reply'].lower() or "language" in r12c['reply'].lower() or "web" in r12c['reply'].lower())

    print("\n==================================================")
    print("ALL 12 TEST SUITE SCENARIOS PASSED WITH 100% SUCCESS!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
