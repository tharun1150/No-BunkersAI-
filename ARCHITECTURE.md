# NO BUNKERS AI — Complete System Architecture & Technical Blueprint

> **System Architecture, Design, and Implementation by Tharun**  
> *Autonomous Voice Intelligence, Outbound Cellular Telephony & Semantic Attendance Verification Platform*  
> *Target Institution: CMR College of Engineering & Technology (CMRCET)*

---

## 1. Architectural Mission & Engineering Principles

**No Bunkers AI** is engineered from the ground up by **Tharun** to solve systemic attendance fraud, unauthorized campus departures, and delayed parent communications in large-scale engineering colleges.

### Core Architectural Goals:
1. **Zero-Delay Human Voice Experience:** Ensure conversational speech synthesis begins within milliseconds of lifting an answered phone call, avoiding the awkward silence or robotic IVR latency seen in legacy telephony.
2. **Deterministic Truth Grounding:** Academic facts (counselling codes, timings, placements, professors) and attendance numbers (periods attended, missed classes, cumulative %) must never hallucinate. The system relies on database ground truth and institutional dossiers before any LLM inference.
3. **Resilient Multi-Party Verification:** Automatically compare the student’s live verbal excuse against the parent’s explanation, detecting bunking patterns through semantic NLP analysis.
4. **Decoupled Asynchronous Telephony:** Decouple call control, voice generation, recording archival, and webhook processing so carrier rate limits or network drops never freeze client dashboards.

---

## 2. End-to-End System Topology

```mermaid
flowchart TB
    subgraph Client_Layer ["1. Client Interaction Tier"]
        AdminUI["React 19 Dashboard\n(Vite SPA @ :5173)\nAdmin / Counselor / HOD"]
        WebMic["Browser Audio API\nWebRTC & AudioContext"]
        StudentPhone["Student Mobile Phone\n(PSTN / 4G Cellular)"]
        ParentPhone["Parent Mobile Phone\n(PSTN / 4G Cellular)"]
        GateTerminal["Security Gate Tablet\nQR Scanner Interface"]
    end

    subgraph Ingress_Layer ["2. Ingress & Carrier Gateway Tier"]
        ViteProxy["Vite Reverse Proxy\nRewrite /api -> :8000"]
        CFTunnel["Cloudflare Quick Tunnel\ntrycloudflare.com -> :8000\nPublic TLS 1.3 Ingress"]
        VobizCarrier["Vobiz PSTN Telephony Gateway\nCaller ID: +918065354620\nPlivo-compatible XML"]
    end

    subgraph Core_Backend ["3. Application Core (FastAPI @ :8000)"]
        FastAPI_App["FastAPI Master Application (main.py)"]

        subgraph Routers ["Modular API Controllers"]
            R_Voice["/voice-agent\nLive Browser Voice Studio"]
            R_Verif["/verification\nTelephony Dispatch & Webhooks"]
            R_Stud["/students\nRoster & Attendance Profiles"]
            R_Outing["/outing\nPasses & Gate Verification"]
            R_Admin["/admin\nDepartments, Classes, Faculty"]
        end

        subgraph Engine_Layer ["Conversational & Telephony Engine (voice_ai_engine.py)"]
            IntentClassifier["3-Way Intent Classifier\n(COLLEGE_INFO | ATTENDANCE | GENERAL)"]
            DossierEngine["CMRCET Knowledge Dossier\n(CMRK, 9:10-4:00, Placements, Hostels)"]
            TelephonyXML["Interactive XML Generator\n(Non-blocking Gather + Speak)"]
            ComparisonEngine["Semantic Cross-Verification\n(ai_comparison.py)"]
        end
    end

    subgraph AI_Providers ["4. Specialized AI Microservices"]
        GeminiLLM["Google Gemini Flash-Lite\ngemini-flash-lite-latest (2.8s Timeout)"]
        SarvamSTT["Sarvam AI Speech-to-Text\nsaaras:v3 (Indic English & Regional)"]
        SarvamTTS["Sarvam AI Text-to-Speech\nbulbul:v3 (Priya Indian Voice)"]
    end

    subgraph Persistence ["5. Persistence Tier"]
        Postgres[(PostgreSQL Database\nlocalhost:5432 / no_bunkers_db)]
        SQLAlchemyORM["SQLAlchemy ORM + Migration Seeder"]
    end

    %% Network & Data Flows
    AdminUI -->|REST / JSON| ViteProxy --> FastAPI_App
    WebMic -->|Base64 WAV| R_Voice
    GateTerminal -->|Scan QR Token| R_Outing

    VobizCarrier <-->|PSTN Voice Call| StudentPhone
    VobizCarrier <-->|PSTN Voice Call| ParentPhone
    VobizCarrier <-->|Webhooks: answer / dialog / recording| CFTunnel --> R_Verif

    FastAPI_App --> Routers
    R_Voice --> Engine_Layer
    R_Verif --> Engine_Layer
    R_Stud --> SQLAlchemyORM
    R_Outing --> SQLAlchemyORM
    R_Admin --> SQLAlchemyORM

    Engine_Layer --> GeminiLLM
    Engine_Layer --> SarvamSTT
    Engine_Layer --> SarvamTTS
    Engine_Layer --> VobizCarrier
    SQLAlchemyORM --> Postgres
```

---

## 3. Conversational AI Subsystem (Priya Voice Engine)

The conversational intelligence engine was engineered by **Tharun** to provide natural, ultra-low-latency voice interactions with zero robotic delays.

### 3.1 3-Way Intent Classification Engine
Every incoming user utterance (from either the browser microphone or telephone cellular audio) is evaluated through a tiered classification cascade:

```mermaid
flowchart TD
    Input[Incoming User Utterance] --> PreCheck{Deterministic Match?}
    
    PreCheck -- Math Operation --> MathCalc[Deterministic Math Engine\nResult in <1ms]
    PreCheck -- Audio / Banter --> BanterResp[Instant Audio Trouble Reply\nResult in <1ms]
    PreCheck -- College Fact Keyword --> CollegeInfo[COLLEGE_INFO Intent\nCMRCET Dossier Ground Truth <5ms]
    PreCheck -- Attendance Keyword --> AttCheck[ATTENDANCE Intent\nLive PostgreSQL Query <5ms]
    
    PreCheck -- Open-Ended / Complex --> LLM[GENERAL Intent\nGoogle Gemini Flash-Lite with 2.8s Timeout]

    MathCalc --> Output[Natural Spoken Response]
    BanterResp --> Output
    CollegeInfo --> Output
    AttCheck --> Output
    LLM --> Output
```

1. **`COLLEGE_INFO` (<10ms Fast Path):**
   - Resolves official CMRCET institutional knowledge extracted directly from the verified university charter.
   - **Counselling Code:** Automatically reports **`CMRK`** across TG EAPCET, ECET, ICET, and PGECET.
   - **Instructional Timings:** Reports regular hours: **`9:10 AM to 4:00 PM`**, Monday through Saturday (alternate Saturdays off).
   - **Placements & Packages:** Active Training and Placement Cell headed by Dr. P. Hima Bindu, highlighting top packages of 15–30+ LPA with recruiters like Amazon, Microsoft, Commvault, Autodesk, Capgemini, TCS, and Infosys.
   - **Campus Location & Transit:** Kandlakoya, Medchal Road (20 km from Secunderabad), served directly by TSRTC bus Route 229.
   - **Academic Programs & Hostels:** B.Tech, M.Tech, and MBA specializations, along with biometric-monitored residential hostels.

2. **`ATTENDANCE` (<5ms Database Ground Truth):**
   - Connects directly to PostgreSQL tables for real-time validation:
     - Today's date (`2026-11-11`)
     - Number of periods conducted vs. attended
     - Specific subjects missed (e.g., *Operating Systems*, *DBMS*)
     - Yesterday's period breakdown
     - College-wide absentee rosters (e.g., *"Today, 2 students are marked absent: Rahul Kumar, Sai Teja"*)
     - Safe standing threshold calculations (classes required without bunking to regain 75% minimum).

3. **`GENERAL` (Math & Open-Ended LLM Inference):**
   - **Zero-Latency Math Solver:** Deterministically calculates arithmetic expressions (`what is 25 + 14` $\rightarrow$ `39`) in 0.1ms.
   - **Gemini Flash-Lite Pipeline:** Uses `gemini-flash-lite-latest` with candidate failover (`gemini-2.5-flash`, `gemini-1.5-flash`) restricted to 1–2 conversational sentences tailored for spoken voice.

---

## 4. Autonomous PSTN Telephony & Webhook Architecture

To connect with physical phones across India, **No Bunkers AI** integrates with the **Vobiz / Plivo PSTN Carrier API**.

```mermaid
sequenceDiagram
    autonumber
    actor Caller as Student / Parent Mobile
    participant Vobiz as Vobiz Telephony Carrier
    participant CFTunnel as Cloudflare Webhook Tunnel
    participant Backend as FastAPI Verification Webhook
    participant Engine as Priya AI Engine
    participant DB as PostgreSQL DB

    Note over Backend,Vobiz: Outbound Call Dispatch
    Backend->>Vobiz: POST /Account/{auth_id}/Call (to=phone, from=+918065354620, answer_url)
    Vobiz-->>Backend: HTTP 200 { call_uuid: "02b2b9d1-..." }
    Backend->>Vobiz: POST /Account/{auth_id}/Call/{call_uuid}/Record/ (Async Background Recording)
    
    Note over Vobiz,Caller: Call Connected
    Vobiz->>Caller: Phone Rings & Recipient Answers
    Vobiz->>CFTunnel: POST /verification/telephony/answer?ver_id=1&target=STUDENT
    CFTunnel->>Backend: Forward Answer Webhook
    Backend->>Engine: build_vobiz_interactive_turn_xml()
    Engine-->>Backend: XML (<Gather executionTimeout="15"><Speak>Greeting</Speak></Gather>)
    Backend-->>Vobiz: Return Telephony XML
    Vobiz-->>Caller: Speaks immediately: "Hello Rahul! I am Priya..."

    Note over Caller,Vobiz: Multi-Turn Conversational Dialog
    Caller->>Vobiz: "I missed class because I have severe fever and stomach ache"
    Vobiz->>CFTunnel: POST /verification/telephony/dialog?ver_id=1&target=STUDENT&turn=1
    CFTunnel->>Backend: Forward Dialog Webhook (Speech="I missed class...")
    Backend->>Engine: generate_conversational_turn()
    Engine->>DB: Record extracted reason ("severe fever")
    Engine-->>Backend: Acknowledgment: "I understand, please take care..."
    Backend-->>Vobiz: Return next <Gather><Speak>Turn XML</Speak></Gather>
    Vobiz-->>Caller: Speaks acknowledgment and waits for reply

    Caller->>Vobiz: "Thank you that is all bye"
    Vobiz->>Backend: POST /verification/telephony/dialog (Speech="thank you that is all bye")
    Backend->>Engine: Detects farewell -> Flags [END_CALL]
    Backend-->>Vobiz: Return <Response><Speak>Farewell</Speak><Hangup/></Response>
    Vobiz->>Caller: Plays farewell and terminates call

    Note over Vobiz,DB: Recording Callback Archival
    Vobiz->>CFTunnel: POST /verification/telephony/recording (RecordUrl=mp3)
    CFTunnel->>Backend: Forward Recording Webhook
    Backend->>DB: Save recording_url, duration_seconds, audio_base64
```

### Critical Telephony Innovations by Tharun:
1. **Elimination of Blocking `<Record>` Tags:** Previously, standard telephony XML placed `<Record redirect="false">` ahead of `<Gather>`, causing the carrier to halt linear execution and wait for voicemail silence. Tharun redesigned the XML to start directly with `<Gather>` containing `<Speak voice="WOMAN" language="en-IN">`, ensuring zero-delay speech playback upon pickup.
2. **REST-Triggered Background Archival:** Call recording is handled out-of-band via the carrier's asynchronous `POST /Record/` endpoint. This captures the complete two-way dialogue without altering XML control flow.
3. **Synthetic Failover Audio Generator:** If a third-party recording webhook fails to deliver in time, the system uses Sarvam AI `bulbul:v3` (with a local harmonic PCM 16kHz WAV synthesizer fallback) to ensure every call record in the admin panel is instantly playable.

---

## 5. Semantic Cross-Verification & Bunking Detection Engine

When an absent student is verified, the system executes an automated two-stage cross-examination pipeline:

```mermaid
flowchart TD
    Start[Absentee Detected by Biometric / Faculty Log] --> CallStudent[Phase 1: Outbound Call to Student]
    CallStudent --> StudentExcuse[Student Voice Recorded & Transcribed\nReason: 'Severe stomach ache & food poisoning']
    
    StudentExcuse --> ParentCheck{Parent Number Registered?}
    
    ParentCheck -- NO --> SingleParty[Single-Party Verification\nVerdict based on student tone & keywords]
    ParentCheck -- YES --> CallParent[Phase 2: Outbound Call to Parent]
    
    CallParent --> ParentStatement[Parent Voice Recorded & Transcribed\nStatement: 'He took permission to attend a movie']
    
    StudentExcuse --> ComparisonEngine[Semantic NLP Comparison Engine\ncompare_responses()]
    ParentStatement --> ComparisonEngine

    ComparisonEngine --> SemanticScore[Calculate Semantic Match Score\nCosine Similarity + Keyword Verification]

    SemanticScore --> ThresholdCheck{Match Score >= 0.70 & Reason Aligned?}

    ThresholdCheck -- YES --> Genuine[VERDICT: Genuine Absence\nverification_status: MATCHED\nis_bunking_suspected: 0]
    ThresholdCheck -- NO --> Bunking[VERDICT: Suspected Bunking\nverification_status: MISMATCHED\nis_bunking_suspected: 1]

    Bunking --> Escalation[Auto-Generate HOD Incident Report\nSeverity: CRITICAL / HIGH\nStatus: PENDING_REVIEW]

    Escalation --> HOD_Action[HOD Review Dashboard\nActions: Warn Student | Summon Parent | Clear Record]
```

### Mathematical Formulation of Semantic Consistency:
The verification engine computes a unified consistency metric $S_{\text{final}}$:

$$S_{\text{final}} = w_1 \cdot S_{\text{semantic}}(\vec{E}_{\text{student}}, \vec{E}_{\text{parent}}) + w_2 \cdot K_{\text{permission}} + w_3 \cdot K_{\text{medical}}$$

Where:
- $S_{\text{semantic}}$ is the cosine similarity between the semantic embeddings of the student and parent explanations.
- $K_{\text{permission}} \in \{0, 1\}$ represents whether the parent explicitly confirmed advance permission.
- $K_{\text{medical}} \in \{0, 1\}$ evaluates medical term alignment (e.g., both mention fever/hospital).
- $w_1 = 0.50, w_2 = 0.30, w_3 = 0.20$ are calibrated decision weights.
- Any score $S_{\text{final}} < 0.70$ flags an immediate **Bunking Alert**.

---

## 6. Smart Campus Outing & Gatekeeper Subsystem

To prevent unauthorized campus exits during college hours, **No Bunkers AI** features an integrated gatekeeper subsystem.

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Student creates outing request
    DRAFT --> PENDING_PARENT: Submitted by student
    
    PENDING_PARENT --> PARENT_REJECTED: Parent denies permission
    PENDING_PARENT --> PENDING_HOD: Parent grants permission
    
    PENDING_HOD --> HOD_REJECTED: HOD denies pass
    PENDING_HOD --> APPROVED: HOD approves & signs pass
    
    APPROVED --> ACTIVE_PASS: Cryptographic QR Pass generated
    
    ACTIVE_PASS --> EXITED: Guard scans QR token at exit gate
    EXITED --> RETURNED: Guard scans QR token at entry gate
    
    EXITED --> OVERDUE: Return timestamp exceeds deadline
    OVERDUE --> HOD_ESCALATED: Auto-alerts Security Officer & HOD
    
    RETURNED --> [*]
    PARENT_REJECTED --> [*]
    HOD_REJECTED --> [*]
```

---

## 7. Database Entity-Relationship Model

The PostgreSQL database architecture is fully normalized and managed via SQLAlchemy ORM with automatic schema migrations:

```mermaid
erDiagram
    STUDENT ||--o{ ATTENDANCE : "has daily"
    STUDENT ||--o{ ABSENCE_VERIFICATION : "undergoes"
    STUDENT ||--o{ OUTING_REQUEST : "applies for"
    CLASS_SECTION ||--o{ STUDENT : "contains"
    
    ABSENCE_VERIFICATION ||--o{ VOICE_CALL : "tracks calls"
    ABSENCE_VERIFICATION ||--o| RESPONSE_COMPARISON : "produces"
    ABSENCE_VERIFICATION ||--o| HOD_INCIDENT_REPORT : "escalates to"

    DEPARTMENT ||--o{ HOD : "headed by"
    DEPARTMENT ||--o{ CLASS_SECTION : "manages"
    SECURITY_GATE ||--o{ SECURITY_GUARD : "staffed by"

    STUDENT {
        string student_id PK
        string roll_number UK
        string name
        string class_name
        string department
        string student_no
        string parent_name
        string parent_phone
        int class_section_id FK
        datetime created_at
    }

    ATTENDANCE {
        int id PK
        string student_id FK
        string date
        int period_number
        string subject_name
        string status
        string faculty_name
        datetime created_at
    }

    ABSENCE_VERIFICATION {
        int id PK
        string student_id FK
        string call_status
        string verification_status
        string verdict
        float consistency_score
        int is_bunking_suspected
        string student_reason
        string parent_reason
        text student_audio_b64
        text parent_audio_b64
        text comparison_summary
        datetime created_at
    }

    VOICE_CALL {
        int id PK
        int verification_id FK
        string call_target
        string call_uuid
        string phone_number
        string status
        text transcript_text
        text recording_url
        text audio_base64
        int duration_seconds
        datetime started_at
        datetime completed_at
    }

    RESPONSE_COMPARISON {
        int id PK
        int verification_id FK
        float semantic_match_score
        string match_status
        int reason_match
        int permission_confirmed
        text conflicting_statements
        text analysis_summary
        datetime created_at
    }

    HOD_INCIDENT_REPORT {
        int id PK
        int verification_id FK
        string student_id FK
        string department
        string severity
        string status
        text reason_for_suspicion
        string hod_decision
        datetime created_at
    }

    OUTING_REQUEST {
        int id PK
        string request_no UK
        string student_id FK
        string destination
        string reason
        string departure_date
        string departure_time
        string expected_return_time
        string parent_status
        string hod_status
        string pass_status
        string qr_token
        datetime created_at
    }
```

---

## 8. Latency Optimizations & Security Controls

| Component | Technical Implementation | Performance SLA |
| :--- | :--- | :--- |
| **Deterministic Intent Router** | Regex & ground-truth hash map evaluation in Python | **$\le 0.5 \text{ ms}$** |
| **Institutional Fact Fast-Path** | Static CMRCET compiled knowledge lookup | **$\le 1.0 \text{ ms}$** |
| **Live Database Attendance Check** | Indexed PostgreSQL query (`date`, `student_id`) | **$\le 4.5 \text{ ms}$** |
| **Open-Ended LLM Inference** | Gemini Flash-Lite with multi-model candidate failover | **$\le 2.8 \text{ s}$** |
| **Carrier Telephony Initiation** | Vobiz REST API with E.164 pre-formatting | **$\le 1.2 \text{ s}$ to ring** |
| **Audio Stream Negotiation** | Direct binary buffer streaming (`audio/wav`, `audio/mpeg`) | **Immediate chunks** |
| **Webhook Transport Security** | Cloudflare TLS 1.3 reverse tunnel with token validation | **Encrypted ingress** |

---

## 9. Authorship & Intellectual Property Notice

This technical architecture, data model, telephony XML control flow, and multi-AI intent resolution engine were engineered, authored, and implemented by **Tharun**.

- **Lead Architect & Full-Stack Engineer:** Tharun
- **Institution:** CMR College of Engineering & Technology (CMRCET)
- **Project:** NO BUNKERS AI
