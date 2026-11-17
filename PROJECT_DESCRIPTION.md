# NO BUNKERS AI — Official Project Description

> **Creator & Lead System Architect:** Tharun  
> **Target Institution:** CMR College of Engineering & Technology (CMRCET)  
> **Project Type:** Autonomous Voice Telephony, Attendance Verification & Bunking Detection Platform  
> **Repository:** `https://github.com/tharun1150/NO_BUNKERS_AI`

---

## 1. Executive Summary & Mission

**No Bunkers AI** is an autonomous academic attendance verification and conversational voice intelligence platform conceived, designed, and engineered by **Tharun**. Built specifically for engineering universities, the platform solves the widespread challenges of unauthorized lecture bunking, proxy attendance, delayed parent communications, and fraudulent leave claims.

Traditional college management systems only record *who* is absent on paper registers or administrative portals. They do not investigate *why* a student was absent, nor do they communicate with parents in real time. **No Bunkers AI** closes this critical gap through autonomous outbound telephony: the moment an unexcused absence is detected, the AI voice agent (**Priya**) dials the student's cellular phone, records their verbal explanation, dials the parent to cross-examine the excuse, evaluates semantic consistency using NLP, and alerts Department Heads (HODs) whenever bunking is detected.

---

## 2. Core Problems Solved

1. **Undetected Lecture Bunking:** Students attending morning roll call but skipping subsequent laboratory or lecture periods.
2. **Delayed Parental Awareness:** Parents historically learn about attendance shortages months later during semester detention notices.
3. **Forged Medical & Personal Excuses:** Discrepancies between what students report to faculty and what parents actually know.
4. **Campus Exit Security Gaps:** Manual paper registers at security gates that cannot be verified against parental approval or college curfews.

---

## 3. Key Subsystems & Technical Capabilities

### A. Conversational Voice AI Studio (Agent Priya)
- **Official Persona:** *Priya*, the official conversational counselor and attendance coordinator for CMRCET.
- **Ultra-Low Latency ($<15\text{ms}$):** Instant deterministic fast-paths for math operations, college information, and attendance inquiries without LLM round-trip latency.
- **Institutional Knowledge Base:** Verified facts on CMRCET counselling code (**`CMRK`**), instructional hours (**`9:10 AM – 4:00 PM`**), placements (headed by Dr. P. Hima Bindu, 15–30+ LPA packages), bus route **`229`**, departments, and hostels.
- **Live Database Truth:** Queries PostgreSQL for today's periods attended/conducted, missed classes, yesterday's breakdown, and college-wide absentee rosters.

### B. Autonomous PSTN Cellular Telephony
- **Physical Cellular Calling:** Integrated with **Vobiz / Plivo PSTN gateways** using caller ID `+918065354620` to dial physical phones across India.
- **Immediate Non-Blocking Speech:** Telephony XML starts directly with `<Gather>` and `<Speak voice="WOMAN" language="en-IN">`, eliminating awkward pickup silence.
- **Barge-In Interruption:** Callers can speak mid-sentence; the carrier immediately halts synthesis and processes speech input.
- **Dual Recording Archival:** Asynchronous carrier recording via REST API, coupled with Sarvam AI voice synthesis fallback for instant browser playback.

### C. Semantic Cross-Verification & Fraud Detection
- **Multi-Party Cross-Examination:** Compares student statements (e.g., *"I have severe food poisoning"*) with parent statements (e.g., *"He went to a movie with friends"*).
- **Consistency Score ($S_{\text{final}}$):** Combines cosine semantic similarity with keyword verification (medical terms, advance permission).
- **Automated Verdicts:** Verifications are classified into `MATCHED` (genuine absence) or `MISMATCHED` (suspected bunking).

### D. Department HOD Disciplinary Portal
- **High-Severity Incident Escalation:** Suspected bunking cases immediately generate an incident report in the HOD dashboard.
- **Audio & Transcript Audit Trail:** HODs can listen to both student and parent voice recordings side-by-side.
- **One-Click Actions:** `Clear Record`, `Issue Formal Warning`, or `Summon Parents for Counseling`.

### E. Smart Campus Outing & Gatekeeper System
- **Digital Outing Requests:** Day outing and overnight passes with departure/return time tracking.
- **Multi-Stage Approval:** Requires parent approval and faculty sign-off.
- **Cryptographic Gate Scanner:** Campus security guards scan QR tokens to log exit and entry timestamps, automatically flagging curfew violations.

---

## 4. End-to-End System Architecture

```
[Student / Parent Mobile Phones]  <== Cellular Voice ==>  [Vobiz PSTN Carrier]
                                                                  │
                                                     (Cloudflare TLS Tunnel)
                                                                  │
                                                                  ▼
[React 19 Frontend SPA]  <== Vite Proxy (/api) ==>  [FastAPI Backend Core (:8000)]
(localhost:5173)                                                  │
  ├── Voice Agent Studio                                          ├── 3-Way Intent Classifier
  ├── Call Recordings Player                                      ├── CMRCET Dossier Engine (<10ms)
  ├── Outing Gatekeeper Scanner                                   ├── Live PostgreSQL Query Engine (<5ms)
  └── HOD Disciplinary Dashboard                                  ├── Semantic Cross-Verification
                                                                  └── Gemini Flash-Lite & Sarvam AI
```

---

## 5. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Recharts |
| **Backend** | Python 3.9+, FastAPI, Uvicorn, Pydantic v2, SQLAlchemy ORM |
| **Database** | PostgreSQL 14+ (Local / Cloud RDS) |
| **Telephony Gateway** | Vobiz REST API (Plivo-compatible XML: `<Gather>`, `<Speak>`, `<Record>`, `<Hangup>`) |
| **Speech Services** | Sarvam AI (`saaras:v3` STT, `bulbul:v3` Indic TTS), Deepgram Nova-2 |
| **LLM Reasoning** | Google Gemini Flash-Lite (`gemini-flash-lite-latest`) with candidate failover |
| **Network & Ingress** | Cloudflare Quick Tunnel (`cloudflared`) |

---

## 6. Mathematical Verification Model

The verification engine calculates a normalized consistency score $S_{\text{final}} \in [0.0, 1.0]$:

$$S_{\text{final}} = w_1 \cdot S_{\text{semantic}}(\vec{E}_{\text{student}}, \vec{E}_{\text{parent}}) + w_2 \cdot K_{\text{permission}} + w_3 \cdot K_{\text{medical}}$$

Where:
- $S_{\text{semantic}}$ is the cosine similarity between the semantic embeddings of the student and parent explanations.
- $K_{\text{permission}} \in \{0, 1\}$ verifies explicit parental advance authorization.
- $K_{\text{medical}} \in \{0, 1\}$ checks medical condition alignment.
- Weights: $w_1 = 0.50, w_2 = 0.30, w_3 = 0.20$.
- Scores below **0.70** automatically escalate to the HOD as suspected bunking incidents.

---

## 7. Quick Setup & Local Execution

```bash
# 1. Start Backend (Port 8000)
source .venv/bin/activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000

# 2. Start Frontend (Port 5173)
cd frontend
npm run dev

# 3. Start Telephony Tunnel (For Real Phone Calls)
cloudflared tunnel --url http://127.0.0.1:8000
```

---

## 8. Authorship & Intellectual Property

This software architecture, telephony control flow, AI intent classification engine, and full-stack application were designed, engineered, and developed by **Tharun**.

- **Lead Engineer & Architect:** Tharun  
- **Target University:** CMR College of Engineering & Technology (CMRCET)  
- **Documentation:** Complete technical blueprint in `README.md` and `ARCHITECTURE.md`.
