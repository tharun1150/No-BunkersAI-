const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export interface VoiceAgentChatRequest {
  message: string;
  session_id?: string;
  student_id?: string;
  generation_id?: string;
}

export interface VoiceAgentChatResponse {
  reply: string;
  intent: "GENERAL" | "ATTENDANCE" | "COLLEGE_INFO";
  session_id: string;
  generation_id?: string;
  data?: any;
}

export interface TranscribeResponse {
  text: string;
  status: "SUCCESS" | "EMPTY" | "SILENCE" | "ERROR";
  error?: string;
}

export async function sendVoiceAgentChat(payload: VoiceAgentChatRequest): Promise<VoiceAgentChatResponse> {
  const res = await fetch(`${API_BASE}/voice-agent/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Voice agent chat failed (${res.status}): ${errText}`);
  }

  return res.json();
}

export async function transcribeMicrophoneAudio(audioBlob: Blob): Promise<TranscribeResponse> {
  const formData = new FormData();
  formData.append("file", audioBlob, "mic_input.webm");

  const res = await fetch(`${API_BASE}/voice-agent/transcribe`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Voice agent transcription failed (${res.status}): ${errText}`);
  }

  return res.json();
}

export async function resetVoiceAgentSession(sessionId: string): Promise<{ message: string; session_id: string }> {
  const formData = new FormData();
  formData.append("session_id", sessionId);

  const res = await fetch(`${API_BASE}/voice-agent/reset-session`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Reset session failed (${res.status}): ${errText}`);
  }

  return res.json();
}
