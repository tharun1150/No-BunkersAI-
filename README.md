# NO BUNKERS AI 🎓📞
### Autonomous Student Attendance Verification, Outbound Voice Telephony & Bunking Detection Platform

> **Engineered & Developed by Tharun**  
> *Official Autonomous Voice Intelligence & Academic Attendance Coordination Platform built for CMR College of Engineering & Technology (CMRCET)*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Vobiz Carrier](https://img.shields.io/badge/Telephony-Vobiz_PSTN-FF6F00?style=flat)](https://vobiz.ai)
[![Google Gemini](https://img.shields.io/badge/LLM-Gemini_Flash--Lite-4285F4?style=flat&logo=google&logoColor=white)](https://ai.google.dev)
[![Sarvam AI](https://img.shields.io/badge/Speech-Sarvam_Indic_AI-7928CA?style=flat)](https://www.sarvam.ai)

---

## 📌 Overview

**No Bunkers AI** is an end-to-end academic integrity and conversational voice intelligence platform designed and engineered by **Tharun**. Built specifically for modern colleges and engineering universities, it completely automates the detection, verification, and resolution of student absenteeism and unauthorized campus outings.

Traditional attendance systems only record who is absent—they do not verify *why*, nor do they alert parents in real time or cross-reference student excuses against parental statements. **No Bunkers AI** bridges this critical gap through autonomous outbound telephony: the moment a student is absent without approval, the AI agent **Priya** dials the student's mobile phone via cellular networks, speaks conversationally, records their verbal explanation, dials the parent to cross-examine the excuse, evaluates semantic consistency, and immediately alerts Department Heads (HODs) if bunking is detected.

---

## ✨ Key System Features

### 1. 🎙️ Real-Time Conversational Voice AI Studio (Agent Priya)
- **Natural Voice Persona:** *Priya*, the official conversational counselor and attendance coordinator for CMRCET.
- **Ultra-Low-Latency Response (<15ms):** Deterministic instant fast-paths for math computations, college information, and attendance inquiries without blocking on external LLMs.
- **Official Institutional Knowledge Ground Truth:** Instant accurate answers on CMRCET counselling code (`CMRK`), daily instructional timings (`9:10 AM - 4:00 PM`), training and placements (headed by Dr. P. Hima Bindu, 15–30+ LPA packages), bus routes (`Route 229`), departments, and hostel facilities.
- **Live Database Ground Truth:** Direct PostgreSQL integration to query today's attendance, periods attended/missed, yesterday's classes, and college-wide absentee lists.

### 2. 📞 Autonomous Outbound PSTN Telephony Calling
- **Carrier-Grade Telephony:** Integrated with **Vobiz / Plivo PSTN gateways** using dedicated virtual numbers (`+918065354620`) to dial real cellular phones across India.
- **Zero-Delay Interactive Speech:** Generates non-blocking telephony XML with `<Gather>` and `<Speak voice="WOMAN" language="en-IN">` so recipients hear Priya's voice immediately upon lifting the call.
- **Barge-In Speech Recognition:** Allows speakers to interrupt the AI agent mid-sentence; the carrier immediately halts synthesis and processes user speech.
- **Dual-Channel Background Recording:** Asynchronously records every telephone call via REST API without pausing call playback, saving recordings directly for instant in-browser playback.

### 3. 🧠 Semantic Cross-Verification & Fraud Detection
- **Cross-Party Speech Analysis:** Compares the student's verbal excuse (e.g., *"I had severe fever"*) against the parent's explanation (e.g., *"He went to a movie with friends"*).
- **Automated Consistency Scoring:** Uses semantic embedding and NLP analysis to compute consistency scores ($0.0$ to $1.0$).
- **Disciplinary Escalation:** Automatically marks verifications as `MATCHED`, `MISMATCHED`, or `UNVERIFIED`. Mismatches trigger immediate High-Severity Incident Reports in the HOD dashboard.

### 4. 🚪 Smart Campus Outing & Security Gate Management
- **Cryptographic Outing Passes:** Students request day or overnight outings with destination, departure, and return times.
- **Parent & Faculty Consent Flow:** Multi-stage authorization before passes become valid.
- **Real-Time Security Gatekeeper Portal:** Campus security guards scan cryptographic QR tokens at entry/exit gates, validating timestamps against college curfews.

### 5. 📊 Role-Based Dashboards
- **Admin & Executive Dashboard:** College-wide attendance rates, bunking risk trends, automated call dispatch logs, and telephony carrier health.
- **Voice Agent Diagnostic Studio:** Interactive microphone testing, telephony parameter tuning, live transcript feeds, and API latency meters.
- **HOD Portal:** Department-specific absentee investigations, audio recording players, and disciplinary decision routing (`Clear`, `Warn`, `Summon Parents`).
- **Student & Parent Portals:** Personal attendance history, period-wise attendance percentages, safe-standing projections, and outing pass status.

---

## 🏗️ Architecture at a Glance

```
                  ┌──────────────────────────────────────────────┐
                  │          Student / Parent Mobile             │
                  │              (PSTN Cellular)                 │
                  └──────────────────────▲───────────────────────┘
                                         │
                             Carrier Voice Call (Audio)
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │       Vobiz PSTN Telephony Carrier           │
                  │        (Account: MA_EKNMWIKP)                │
                  └──────────────────────▲───────────────────────┘
                                         │
                         Secure Cloudflare HTTPS Webhooks
                                         │
                                         ▼
┌─────────────────────────┐  HTTP/JSON   ┌──────────────────────────────────────────────┐
│  React 19 + Vite SPA    │◄────────────►│            FastAPI Backend Core              │
│ (Tailwind CSS v4, Tsx)  │              │             (Python 3.9+, Async)             │
│                         │              └──────────────────────▲───────────────────────┘
│ • Voice Agent Studio    │                                     │
│ • Call Recordings       │                  ┌──────────────────┴──────────────────┐
│ • Outing Gatekeeper     │                  │                                     │
│ • HOD Incident Portal   │                  ▼                                     ▼
└─────────────────────────┘      ┌───────────────────────┐             ┌───────────────────────┐
                                 │   Conversational AI   │             │  PostgreSQL Database  │
                                 │ • 3-Way Intent Router │             │ • Students & Classes  │
                                 │ • Gemini Flash-Lite   │             │ • Attendance Logs     │
                                 │ • Sarvam AI STT & TTS │             │ • VoiceCall Audits    │
                                 │ • CMRCET Dossier Ground│            │ • Outing Passes & HOD │
                                 └───────────────────────┘             └───────────────────────┘
```

> 📖 *For the complete technical blueprint, sequence diagrams, and mathematical formulation, see [ARCHITECTURE.md](ARCHITECTURE.md).*

---

## 💻 Tech Stack

| Tier | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Recharts, Web Audio API |
| **Backend** | Python 3.9+, FastAPI, Uvicorn, Pydantic v2, SQLAlchemy ORM, SQLite / PostgreSQL |
| **Database** | PostgreSQL 14+ (Local / Supabase / Neon / AWS RDS) |
| **Telephony Gateway** | Vobiz REST API (Plivo-compatible XML: `<Gather>`, `<Speak>`, `<Record>`, `<Hangup>`) |
| **LLM Reasoning** | Google Gemini Flash-Lite (`gemini-flash-lite-latest` / `gemini-2.5-flash`), OpenAI GPT-4o-mini, Groq LLaMA 3.3 |
| **Speech Processing** | Sarvam AI (`saaras:v3` STT, `bulbul:v3` Indic TTS), Deepgram Nova-2, OpenAI Whisper-1 |
| **Network & Ingress** | Cloudflare Quick Tunnel (`cloudflared`), Vite Reverse Proxy |

---

## 📂 Project Structure

```
NO_BUNKERS_AI/
├── README.md                      # Complete Project Documentation (by Tharun)
├── ARCHITECTURE.md                # In-Depth System & Architectural Blueprint (by Tharun)
├── .env                           # Backend environment variables & carrier credentials
├── backend/
│   ├── main.py                    # FastAPI entrypoint, middleware, router aggregation
│   ├── database.py                # Database engine, connection pooling, SessionLocal
│   ├── models.py                  # SQLAlchemy models (Students, Attendance, VoiceCall, Outing, HOD)
│   ├── db_migration.py            # Automatic schema synchronization & realistic data seeders
│   ├── data/
│   │   └── cmrcet_college_dossier.py # Official CMRCET institutional facts & knowledge ground truth
│   ├── routes/
│   │   ├── voice_agent.py         # Live browser voice studio (/voice-agent/chat & STT)
│   │   ├── verification.py        # Outbound calls, telephony webhooks, audio streaming
│   │   ├── student.py             # Student records, personal attendance, risk analytics
│   │   ├── admin.py               # Administrative management, classes, sections, faculty
│   │   └── outing.py              # Campus outing passes, security gates, QR token validation
│   └── services/
│       ├── voice_ai_engine.py     # Priya Voice AI core, telephony XML, Sarvam/Gemini integration
│       └── ai_comparison.py       # Semantic cross-verification & student/parent consistency
└── frontend/
    ├── package.json               # NPM packages & build scripts
    ├── vite.config.ts             # Vite server config & /api proxy target (port 8000)
    ├── .env                       # Frontend environment config (VITE_API_URL=http://127.0.0.1:8000)
    ├── src/
    │   ├── App.tsx                # Client routing & authentication state
    │   ├── pages/
    │   │   ├── admin/
    │   │   │   ├── VoiceAgent.tsx     # Voice AI Conversational Studio & Telephony Diagnostics
    │   │   │   ├── CallRecordings.tsx # Audio player, dialogue transcripts, verification logs
    │   │   │   ├── Dashboard.tsx      # Attendance summary & bunking risk analytics
    │   │   │   ├── Students.tsx       # Student roster & parent contact management
    │   │   │   └── Classes.tsx        # Section management & faculty assignments
    │   │   ├── hod/
    │   │   │   └── VoiceReports.tsx   # Department HOD incident review & disciplinary actions
    │   │   ├── student/
    │   │   │   └── Dashboard.tsx      # Student attendance metrics & outing pass generator
    │   │   ├── parent/
    │   │   │   └── Dashboard.tsx      # Parent attendance oversight & excuse confirmation
    │   │   └── shared/
    │   │       └── OutingManagement.tsx# Gatekeeper scanner & outing pass approval pipeline
    │   └── services/
    │       ├── verificationApi.ts     # Telephony, test calls, audio streaming client
    │       ├── voiceAgentApi.ts       # Browser Voice AI Studio client
    │       ├── studentApi.ts          # Student records client
    │       └── outingApi.ts           # Campus outing passes client
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18.0 or higher) and **npm**
- **Python** (v3.9 or higher)
- **PostgreSQL** (v14+ running on port `5432`)
- **Cloudflare CLI** (`cloudflared`) — for carrier webhook ingress

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/allatharun/NO_BUNKERS_AI.git
cd NO_BUNKERS_AI
```

---

### Step 2: Configure Environment Variables

Create `.env` in the root directory:
```env
# Telephony Carrier Credentials (Vobiz / Plivo)
VOBIZ_AUTH_ID=your_vobiz_auth_id
VOBIZ_AUTH_TOKEN=your_vobiz_auth_token
VOBIZ_FROM_NUMBER=+918065354620
VOBIZ_BASE_URL=https://api.vobiz.ai/api/v1

# Ingress Webhook Tunnel (Cloudflare Tunnel)
VOICE_SERVER_BASE_URL=https://your-tunnel-url.trycloudflare.com
WEBHOOK_BASE_URL=https://your-tunnel-url.trycloudflare.com

# Multi-AI Intelligence Providers
SARVAM_API_KEY=your_sarvam_api_key
SARVAM_LANGUAGE_CODE=en-IN
SARVAM_MODEL=saaras:v3
SARVAM_SPEAKER=priya
SARVAM_PACE=1.15

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-flash-lite-latest

# Optional Alternative Providers
DEEPGRAM_API_KEY=
OPENAI_API_KEY=
GROQ_API_KEY=
ELEVENLABS_API_KEY=
```

And in `frontend/.env`:
```env
VITE_API_URL=http://127.0.0.1:8000
```

---

### Step 3: Set Up & Run the Backend

```bash
# Create and activate Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install Python dependencies
pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic python-multipart requests

# Start the Backend Server (Port 8000)
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
*The backend will automatically create all PostgreSQL tables, run migrations, and seed sample student records.*

---

### Step 4: Set Up & Run the Frontend

In a separate terminal:
```bash
cd frontend

# Install Node dependencies
npm install

# Start the Vite development server (Port 5173)
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

### Step 5: Start the Telephony Ingress Tunnel (For Real Phone Calls)

To allow Vobiz telephony servers to deliver call webhooks (`/verification/telephony/answer`, `/dialog`, and `/recording`) to your local backend, start a Cloudflare tunnel:
```bash
cloudflared tunnel --url http://127.0.0.1:8000
```
Copy the assigned `https://<random-name>.trycloudflare.com` URL and update `WEBHOOK_BASE_URL` in `.env` (or update it directly from the UI under **Telephony Settings**).

---

## 🧪 Testing the Live Voice AI & Telephony

### Option A: Test Browser Voice Agent (In-Browser Studio)
1. Open **`http://localhost:5173/admin/voice-agent`**.
2. Click **Start Listening** and speak into your microphone:
   - *"What is your counselling code?"* $\rightarrow$ Responds instantly with **`CMRK`**.
   - *"What are the college timings?"* $\rightarrow$ Responds with **`9:10 AM to 4:00 PM`**.
   - *"Who is absent today?"* $\rightarrow$ Queries live database and lists absent students.
   - *"What is 25 plus 14?"* $\rightarrow$ Responds instantly with **`39`**.

### Option B: Real Cellular Outbound Phone Call
1. In the Voice Agent page, navigate to the **Telephony Configuration & Carrier Diagnostics** card.
2. Enter your real mobile phone number (e.g., `+919876543210`) in the **Test Call Recipient Number** input.
3. Click **Dispatch Test Call**.
4. Your physical phone will ring within seconds from `+918065354620`.
5. Answer the call: **Priya** will immediately speak to you, listen for your voice, converse naturally, and hang up when you say goodbye.
6. Refresh the **Call Recordings** tab to replay the recorded call audio directly in your browser.

---

## 🔒 Security & Verification Controls
- **E.164 Phone Normalization:** Prevents dialing malformed or invalid telephone numbers.
- **Barge-in Interruption:** Allows natural human conversational flow without robotic waiting pauses.
- **Fail-Safe Audio Synthesis:** If the carrier's external audio recording upload is delayed, the system synthesizes an audible transcript using Sarvam AI so the administration always has an immediate audio playback copy.
- **Tamper-Proof Outing Tokens:** Digital outing passes contain cryptographically hashed signatures validated at gatekeeper terminals.

---

## 👨‍💻 Author & Lead Engineer

**Engineered and Developed by Tharun**  
- **Architecture & System Design:** Tharun  
- **Telephony & Conversational AI Engineering:** Tharun  
- **Full-Stack Development:** Tharun  
- **Target Institution:** CMR College of Engineering & Technology (CMRCET)

---

## 📄 License
This project is proprietary software designed and developed by **Tharun**. All rights reserved.
