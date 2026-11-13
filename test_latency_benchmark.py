import json
import urllib.request
import time

BASE_URL = "http://127.0.0.1:8000"

def timed_chat(message: str, session_id: str = "latency_test"):
    url = f"{BASE_URL}/voice-agent/chat"
    payload = json.dumps({"message": message, "session_id": session_id}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        elapsed_ms = (time.time() - t0) * 1000
        return data, elapsed_ms

def benchmark():
    queries = [
        "What is 2 + 3?",
        "what is your name",
        "okay now your voice is good",
        "what is tharun attendance",
        "absent studnets",
        "was he present yesterday",
        "What is Python?",
        "Tell me a joke"
    ]

    print("==================================================")
    print("VOICE AGENT RESPONSE LATENCY BENCHMARK")
    print("==================================================")
    for q in queries:
        res, ms = timed_chat(q)
        print(f"\nQuery: \"{q}\"")
        print(f"Latency: {ms:.1f} ms ({ms/1000:.2f}s) | Intent: {res['intent']}")
        print(f"Reply: \"{res['reply']}\"")

if __name__ == "__main__":
    benchmark()
