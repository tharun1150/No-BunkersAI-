/**
 * Voice AI Absence Verification & HOD Reports API Client
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export interface VoiceCallItem {
  id: number;
  call_target: "STUDENT" | "PARENT";
  phone_number: string;
  status: "INITIATED" | "RINGING" | "IN_PROGRESS" | "COMPLETED" | "NOT_ANSWERED" | "BUSY" | "FAILED";
  recording_url?: string;
  audio_base64?: string;
  transcript_text?: string;
  extracted_reason?: string;
  parent_confirmation?: string;
  duration_seconds: number;
  retry_count: number;
  started_at: string;
  completed_at?: string;
}

export interface VerificationItem {
  id: number;
  student_id: string;
  student_name: string;
  roll_number?: string;
  department?: string;
  class_name?: string;
  student_phone?: string;
  parent_name?: string;
  parent_phone?: string;
  teacher_name?: string;
  verification_status: "PENDING" | "IN_PROGRESS" | "MATCHED" | "MISMATCHED" | "NOT_ANSWERED" | "UNVERIFIED";
  call_status: string;
  verdict?: string;
  is_bunking_suspected: number;
  consistency_score?: number;
  student_reason?: string;
  parent_reason?: string;
  comparison_summary?: string;
  conflicting_statements: string[];
  retry_count: number;
  created_at: string;
  updated_at?: string;
  student_call?: VoiceCallItem;
  parent_call?: VoiceCallItem;
  student_audio_b64?: string;
  parent_audio_b64?: string;
  student_transcript?: string;
  parent_transcript?: string;
  student_call_status?: string;
  parent_call_status?: string;
  student_duration_seconds?: number;
  parent_duration_seconds?: number;
}

export interface VerificationDetail extends VerificationItem {
  student_call?: VoiceCallItem;
  parent_call?: VoiceCallItem;
  hod_report?: {
    id: number;
    department: string;
    severity: string;
    status: string;
    reason_for_suspicion: string;
    hod_decision: string;
    hod_remarks?: string;
    reviewed_by?: string;
    reviewed_at?: string;
    created_at?: string;
  };
}

export interface HODIncidentItem {
  report_id: number;
  verification_id: number;
  department: string;
  student_id: string;
  student_name: string;
  roll_number?: string;
  class_name?: string;
  student_phone?: string;
  parent_name?: string;
  parent_phone?: string;
  teacher_name?: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  report_status: "PENDING_REVIEW" | "REVIEWED" | "RESOLVED" | "ESCALATED" | "DISMISSED";
  reason_for_suspicion: string;
  hod_decision: "PENDING" | "APPROVED" | "REJECTED" | "ESCALATED" | "DISMISSED";
  hod_remarks?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at?: string;
  student_call_status: string;
  parent_call_status: string;
  student_transcript?: string;
  parent_transcript?: string;
  student_audio_url?: string;
  parent_audio_url?: string;
  student_audio_b64?: string;
  parent_audio_b64?: string;
  semantic_match_score: number;
  conflicting_statements: string[];
  overall_verification_status: string;
}

export interface TelephonyConfig {
  is_configured: boolean;
  vobiz_auth_id: string;
  vobiz_auth_id_masked: string;
  vobiz_auth_token_masked: string;
  vobiz_from_number: string;
  vobiz_base_url: string;
  webhook_base_url: string;
  // STT
  sarvam_api_key?: string;
  sarvam_api_key_masked?: string;
  sarvam_language_code?: string;
  sarvam_model?: string;
  sarvam_speaker?: string;
  sarvam_pace?: string;
  sarvam_configured?: boolean;
  deepgram_api_key?: string;
  deepgram_api_key_masked?: string;
  deepgram_model?: string;
  deepgram_configured?: boolean;
  active_stt_provider?: string;
  // LLM
  gemini_api_key?: string;
  gemini_api_key_masked?: string;
  gemini_model?: string;
  gemini_configured?: boolean;
  openai_api_key?: string;
  openai_api_key_masked?: string;
  openai_model?: string;
  openai_configured?: boolean;
  groq_api_key?: string;
  groq_api_key_masked?: string;
  groq_model?: string;
  groq_configured?: boolean;
  active_llm_provider?: string;
  // TTS
  cartesia_api_key?: string;
  cartesia_api_key_masked?: string;
  cartesia_voice_id?: string;
  cartesia_configured?: boolean;
  elevenlabs_api_key?: string;
  elevenlabs_api_key_masked?: string;
  elevenlabs_voice_id?: string;
  elevenlabs_configured?: boolean;
  active_tts_provider?: string;
  status: "READY" | "UNCONFIGURED" | "AUTHENTICATION_FAILED" | "CONNECTION_ERROR";
}

export interface VerificationStats {
  total_verifications: number;
  matched: number;
  mismatched_suspicious: number;
  unanswered_pending: number;
  in_progress: number;
  hod_reports: {
    total: number;
    pending_review: number;
    resolved: number;
    escalated: number;
  };
}

// ---------------------------------------------------------------------------
// API Methods
// ---------------------------------------------------------------------------

export async function getVerificationStats(department?: string): Promise<VerificationStats> {
  const url = new URL(`${API_BASE}/verification/stats`);
  if (department) url.searchParams.set("department", department);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch verification stats");
  return res.json();
}

export async function getVerifications(filters?: {
  status?: string;
  department?: string;
  is_bunking_suspected?: number;
  skip?: number;
  limit?: number;
}): Promise<VerificationItem[]> {
  const url = new URL(`${API_BASE}/verification/list`);
  if (filters?.status) url.searchParams.set("status_filter", filters.status);
  if (filters?.department) url.searchParams.set("department", filters.department);
  if (filters?.is_bunking_suspected !== undefined) {
    url.searchParams.set("is_bunking_suspected", String(filters.is_bunking_suspected));
  }
  if (filters?.skip) url.searchParams.set("skip", String(filters.skip));
  if (filters?.limit) url.searchParams.set("limit", String(filters.limit));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to load verifications list");
  return res.json();
}

export async function getVerificationDetail(id: number): Promise<VerificationDetail> {
  const res = await fetch(`${API_BASE}/verification/${id}`);
  if (!res.ok) throw new Error(`Failed to load verification #${id}`);
  return res.json();
}

export async function startVerification(payload: {
  student_id: string;
  attendance_id?: number;
  scenario?: string;
  custom_student_reason?: string;
  custom_parent_reason?: string;
  custom_student_phone?: string;
  custom_parent_phone?: string;
}): Promise<VerificationItem> {
  const res = await fetch(`${API_BASE}/verification/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to initiate verification");
  }
  return res.json();
}

export async function batchStartVerification(payload: {
  department?: string;
  section?: string;
  date?: string;
}): Promise<{ message: string; queued: any[]; date: string }> {
  const res = await fetch(`${API_BASE}/verification/batch-start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to schedule batch verification");
  return res.json();
}

export async function retryCall(verificationId: number, target: "STUDENT" | "PARENT" | "ALL" = "ALL"): Promise<VerificationItem> {
  const res = await fetch(`${API_BASE}/verification/${verificationId}/retry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target }),
  });
  if (!res.ok) throw new Error("Failed to retry verification calls");
  return res.json();
}

export async function simulateCall(payload: {
  student_id: string;
  scenario: "MATCH" | "MISMATCH" | "NO_ANSWER_STUDENT" | "NO_ANSWER_PARENT";
  custom_student_reason?: string;
  custom_parent_reason?: string;
  custom_student_phone?: string;
  custom_parent_phone?: string;
}): Promise<VerificationDetail> {
  const res = await fetch(`${API_BASE}/verification/simulate-call`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Simulation failed");
  }
  return res.json();
}

export async function getTelephonyConfig(): Promise<TelephonyConfig> {
  const res = await fetch(`${API_BASE}/verification/telephony/config`);
  if (!res.ok) throw new Error("Failed to fetch telephony configuration");
  return res.json();
}

export async function updateTelephonyConfig(payload: {
  vobiz_auth_id?: string;
  vobiz_auth_token?: string;
  vobiz_from_number?: string;
  webhook_base_url?: string;
  vobiz_base_url?: string;
  sarvam_api_key?: string;
  sarvam_language_code?: string;
  sarvam_model?: string;
  sarvam_speaker?: string;
  sarvam_pace?: string;
  deepgram_api_key?: string;
  deepgram_model?: string;
  gemini_api_key?: string;
  gemini_model?: string;
  openai_api_key?: string;
  openai_model?: string;
  groq_api_key?: string;
  groq_model?: string;
  cartesia_api_key?: string;
  cartesia_voice_id?: string;
  elevenlabs_api_key?: string;
  elevenlabs_voice_id?: string;
  active_stt_provider?: string;
  active_llm_provider?: string;
  active_tts_provider?: string;
}): Promise<{ message: string; config: TelephonyConfig }> {
  const res = await fetch(`${API_BASE}/verification/telephony/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update telephony configuration");
  }
  return res.json();
}

export async function testGeminiCredentials(apiKey?: string, model?: string): Promise<{
  connected: boolean;
  message?: string;
  error?: string;
  status?: string;
}> {
  const res = await fetch(`${API_BASE}/verification/telephony/test-gemini`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, model }),
  });
  return res.json();
}

export async function testCarrierCredentials(): Promise<{
  connected: boolean;
  message?: string;
  error?: string;
  registered_numbers?: string[];
  status?: string;
}> {
  const res = await fetch(`${API_BASE}/verification/telephony/test-carrier`, {
    method: "POST",
  });
  return res.json();
}

export async function testSarvamCredentials(apiKey?: string, model?: string): Promise<{
  connected: boolean;
  message?: string;
  error?: string;
  status?: string;
}> {
  const res = await fetch(`${API_BASE}/verification/telephony/test-sarvam`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, model }),
  });
  return res.json();
}

export async function testDeepgramCredentials(apiKey?: string): Promise<{
  connected: boolean;
  message?: string;
  error?: string;
  status?: string;
}> {
  const res = await fetch(`${API_BASE}/verification/telephony/test-deepgram`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey }),
  });
  return res.json();
}

export async function testOpenAICredentials(apiKey?: string): Promise<{
  connected: boolean;
  message?: string;
  error?: string;
  status?: string;
}> {
  const res = await fetch(`${API_BASE}/verification/telephony/test-openai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey }),
  });
  return res.json();
}

export async function testGroqCredentials(apiKey?: string): Promise<{
  connected: boolean;
  message?: string;
  error?: string;
  status?: string;
}> {
  const res = await fetch(`${API_BASE}/verification/telephony/test-groq`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey }),
  });
  return res.json();
}

export async function testCartesiaCredentials(apiKey?: string): Promise<{
  connected: boolean;
  message?: string;
  error?: string;
  status?: string;
}> {
  const res = await fetch(`${API_BASE}/verification/telephony/test-cartesia`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey }),
  });
  return res.json();
}

export async function testElevenLabsCredentials(apiKey?: string): Promise<{
  connected: boolean;
  message?: string;
  error?: string;
  status?: string;
}> {
  const res = await fetch(`${API_BASE}/verification/telephony/test-elevenlabs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey }),
  });
  return res.json();
}

export async function dispatchTestCall(phoneNumber: string): Promise<{ message: string; call_uuid?: string }> {
  const res = await fetch(`${API_BASE}/verification/telephony/test-call`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone_number: phoneNumber }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Test call failed to dispatch");
  }
  return res.json();
}

export async function getHODIncidentReports(department: string, statusFilter?: string): Promise<HODIncidentItem[]> {
  const url = new URL(`${API_BASE}/verification/hod/reports`);
  url.searchParams.set("department", department);
  if (statusFilter) url.searchParams.set("status_filter", statusFilter);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to load HOD reports");
  return res.json();
}

export async function submitHODAction(
  reportId: number,
  payload: {
    decision: "APPROVED" | "REJECTED" | "ESCALATED" | "DISMISSED";
    remarks?: string;
    reviewed_by?: string;
  }
): Promise<{ message: string; report_id: number; decision: string; status: string }> {
  const res = await fetch(`${API_BASE}/verification/hod/reports/${reportId}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to process HOD action");
  }
  return res.json();
}
