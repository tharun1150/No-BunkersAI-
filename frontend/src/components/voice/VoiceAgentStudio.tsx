import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Bot,
  User,
  AlertCircle,
  RotateCcw,
  Play,
  Square,
  ShieldAlert,
  CheckCircle,
  HelpCircle,
  Clock,
  Radio,
  Sliders,
  Send,
  Zap,
} from "lucide-react";
import {
  sendVoiceAgentChat,
  transcribeMicrophoneAudio,
  resetVoiceAgentSession,
  VoiceAgentChatResponse,
} from "../../services/voiceAgentApi";

export type AgentState = "IDLE" | "LISTENING" | "PROCESSING" | "SPEAKING" | "INTERRUPTED" | "ERROR";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  intent?: "GENERAL" | "ATTENDANCE" | "COLLEGE_INFO";
  timestamp: string;
  isInterrupted?: boolean;
}

interface Props {
  darkMode: boolean;
  selectedStudentId?: string;
  onStudentSelect?: (studentId: string) => void;
}

export default function VoiceAgentStudio({ darkMode, selectedStudentId }: Props) {
  const [state, setState] = useState<AgentState>("IDLE");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>(() => `live_session_${Date.now()}`);
  const [activeIntent, setActiveIntent] = useState<"GENERAL" | "ATTENDANCE" | "COLLEGE_INFO" | null>(null);
  const [textInput, setTextInput] = useState<string>("");

  // Refs for audio hardware and streaming
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Interruption and Lifecycle Control
  const generationTokenRef = useRef<number>(0);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechAccumulatorRef = useRef<string>("");
  const isSpeakingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const stateRef = useRef<AgentState>("IDLE");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Keep stateRef in sync with state
  useEffect(() => {
    stateRef.current = state;
    isSpeakingRef.current = state === "SPEAKING";
  }, [state]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, interimTranscript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupMicrophone();
      stopTTS();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  // -------------------------------------------------------------------------
  // 1. Text-to-Speech (TTS) with Controlled Lifecycle and Immediate Cancellation
  // -------------------------------------------------------------------------
  const stopTTS = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const speakReply = useCallback(
    (text: string, currentToken: number) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        console.warn("Browser does not support SpeechSynthesis");
        setState("LISTENING");
        return;
      }

      // Resume synthesis if paused (common Chrome browser safeguard)
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      // Stop any prior playback
      stopTTS();

      // If token expired (user interrupted before playback started), drop it
      if (currentToken !== generationTokenRef.current) {
        console.log(`[TTS] Stale generation token (${currentToken} vs ${generationTokenRef.current}). Discarding speech.`);
        return;
      }

      // Small async tick ensures cancel() finishes flushing before new speak() executes in Chrome
      setTimeout(() => {
        if (currentToken !== generationTokenRef.current) return;

        setState("SPEAKING");

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-IN";
        utterance.rate = 1.02;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Select preferred voice if available
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice =
          voices.find((v) => v.lang.includes("en-IN") || v.name.toLowerCase().includes("priya") || v.name.toLowerCase().includes("samantha")) ||
          voices.find((v) => v.lang.startsWith("en"));
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onstart = () => {
          if (currentToken !== generationTokenRef.current) {
            stopTTS();
            return;
          }
          setState("SPEAKING");
        };

        utterance.onend = () => {
          if (currentToken === generationTokenRef.current) {
            setState("LISTENING");
          }
        };

        utterance.onerror = (e) => {
          console.warn("[TTS] Utterance error / cancelled:", e);
          if (currentToken === generationTokenRef.current) {
            setState("LISTENING");
          }
        };

        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      }, 25);
    },
    [stopTTS]
  );

  const handleTestSpeaker = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    window.speechSynthesis.cancel();
    setTimeout(() => {
      const u = new SpeechSynthesisUtterance("Audio output is active and loud! Can you hear me now?");
      u.rate = 1.02;
      u.volume = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => v.lang.includes("en-IN") || v.name.toLowerCase().includes("priya") || v.name.toLowerCase().includes("samantha")) ||
        voices.find((v) => v.lang.startsWith("en"));
      if (preferred) u.voice = preferred;
      window.speechSynthesis.speak(u);
    }, 25);
  }, []);

  // -------------------------------------------------------------------------
  // 2. Interruption Handling (Section 5)
  // -------------------------------------------------------------------------
  const handleInterruption = useCallback(() => {
    console.log("[Interruption] User speech detected during assistant playback. Stopping TTS immediately.");
    // 1. Invalidate ongoing generation / response token
    generationTokenRef.current += 1;

    // 2. Cancel in-flight HTTP request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 3. Halt TTS playback immediately
    stopTTS();

    // 4. Mark UI as INTERRUPTED
    setState("INTERRUPTED");
    speechAccumulatorRef.current = "";
    setInterimTranscript("");

    // 5. Smoothly transition to LISTENING after 200ms pause to capture the new query
    setTimeout(() => {
      setState("LISTENING");
    }, 200);
  }, [stopTTS]);

  // -------------------------------------------------------------------------
  // 3. User Query Dispatcher (Intent Routing & Backend Processing)
  // -------------------------------------------------------------------------
  const submitUserQuery = useCallback(
    async (rawQuery: string) => {
      const clean = rawQuery.trim();
      // Avoid processing empty audio or single noise fragments
      if (!clean || clean.length < 2) {
        setState("LISTENING");
        return;
      }

      // Increment token for this new generation
      generationTokenRef.current += 1;
      const thisToken = generationTokenRef.current;

      // Abort any earlier request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Switch state to PROCESSING
      setState("PROCESSING");
      setInterimTranscript("");
      speechAccumulatorRef.current = "";

      // Add user message to conversation history
      const userMsg: ChatMessage = {
        id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        role: "user",
        text: clean,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const resp: VoiceAgentChatResponse = await sendVoiceAgentChat({
          message: clean,
          session_id: sessionId,
          student_id: selectedStudentId,
          generation_id: String(thisToken),
        });

        // Check if an interruption happened while waiting for LLM
        if (thisToken !== generationTokenRef.current) {
          console.log(`[Query] Response discarded due to newer generation token (${thisToken} vs ${generationTokenRef.current})`);
          return;
        }

        setActiveIntent(resp.intent);

        // Add assistant reply to message history
        const assistantMsg: ChatMessage = {
          id: `asst_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          role: "assistant",
          text: resp.reply,
          intent: resp.intent,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // Speak response out loud
        speakReply(resp.reply, thisToken);
      } catch (err: any) {
        if (thisToken !== generationTokenRef.current) return;
        console.error("[VoiceAgent] Query error:", err);
        setErrorMessage(err.message || "Failed to process question");
        setState("ERROR");
      }
    },
    [sessionId, selectedStudentId, speakReply]
  );

  // -------------------------------------------------------------------------
  // 4. Voice Activity Detection & Web Speech STT Pipeline
  // -------------------------------------------------------------------------
  const startListeningPipeline = useCallback(async () => {
    setErrorMessage(null);

    // Check microphone permission & stream
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // Setup Web Audio Analyser for VAD & Waveform
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Audio Level loop
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel(normalized);

        // If user is speaking loudly (normalized > 25) while assistant is SPEAKING, trigger barge-in interruption!
        if (stateRef.current === "SPEAKING" && normalized > 28) {
          handleInterruption();
        }

        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      animFrameRef.current = requestAnimationFrame(updateVolume);

      // Setup Web Speech Recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognitionRef.current = recognition;

        recognition.onstart = () => {
          console.log("[STT] Recognition started");
          if (stateRef.current !== "SPEAKING") {
            setState("LISTENING");
          }
        };

        recognition.onresult = (event: any) => {
          let currentFinal = "";
          let currentInterim = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              currentFinal += transcript;
            } else {
              currentInterim += transcript;
            }
          }

          const combined = (currentFinal || currentInterim).trim();

          // Interruption: If agent is SPEAKING and user speaks any recognizable words, barge-in!
          if (stateRef.current === "SPEAKING" && combined.length > 0) {
            handleInterruption();
            return;
          }

          if (stateRef.current === "LISTENING" || stateRef.current === "INTERRUPTED") {
            setInterimTranscript(combined);
            speechAccumulatorRef.current = combined;

            // Ultra-low latency voice silence detection:
            // If browser emitted a final speech segment, dispatch briskly in 280ms
            // If interim speech, wait 650ms of silence
            const hasFinalPhrase = currentFinal.trim().length > 0;
            const silenceDelay = hasFinalPhrase ? 280 : 650;

            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            if (combined.length >= 2) {
              silenceTimerRef.current = setTimeout(() => {
                const queryToSend = speechAccumulatorRef.current.trim();
                if (queryToSend && stateRef.current === "LISTENING") {
                  submitUserQuery(queryToSend);
                }
              }, silenceDelay);
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("[STT] SpeechRecognition event error:", event.error);
          if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            setErrorMessage("Microphone access denied. Please allow microphone in browser permissions.");
            setState("ERROR");
          }
        };

        recognition.onend = () => {
          // Restart recognition automatically if still active
          if (stateRef.current !== "IDLE" && stateRef.current !== "ERROR" && recognitionRef.current) {
            try {
              recognition.start();
            } catch (e) {
              // Ignore restart error
            }
          }
        };

        try {
          recognition.start();
        } catch (e) {
          console.warn("[STT] Initial recognition start notice:", e);
        }
      } else {
        console.warn("[STT] Web Speech API not supported in this browser. MediaRecorder fallback available.");
      }

      setState("LISTENING");
    } catch (err: any) {
      console.error("[Microphone] Permission or hardware error:", err);
      let userMsg = "Failed to access microphone.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        userMsg = "Microphone permission denied. Please allow microphone access in your browser settings to speak.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        userMsg = "No microphone hardware found. Please connect a microphone.";
      }
      setErrorMessage(userMsg);
      setState("ERROR");
    }
  }, [handleInterruption, submitUserQuery]);

  const cleanupMicrophone = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setAudioLevel(0);
    setInterimTranscript("");
  }, []);

  const handleStopSession = useCallback(() => {
    stopTTS();
    cleanupMicrophone();
    setState("IDLE");
  }, [stopTTS, cleanupMicrophone]);

  const handleStartSession = useCallback(() => {
    startListeningPipeline();
  }, [startListeningPipeline]);

  const handleResetSession = useCallback(async () => {
    stopTTS();
    try {
      await resetVoiceAgentSession(sessionId);
    } catch (e) {}
    const newSession = `live_session_${Date.now()}`;
    setSessionId(newSession);
    setMessages([]);
    setInterimTranscript("");
    setActiveIntent(null);
    setErrorMessage(null);
    generationTokenRef.current += 1;
    if (state !== "IDLE") {
      setState("LISTENING");
    }
  }, [sessionId, stopTTS, state]);

  // Form submit for quick typing fallback
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const q = textInput;
    setTextInput("");
    submitUserQuery(q);
  };

  // -------------------------------------------------------------------------
  // Preset Test Scenarios (CMRCET College Knowledge, Attendance, and General)
  // -------------------------------------------------------------------------
  const PRESET_SCENARIOS = [
    { label: "1. 'What is your role?'", query: "What is your role as a college agent?", type: "COLLEGE_INFO" },
    { label: "2. 'Counselling code?'", query: "What is the counselling code for CMRCET?", type: "COLLEGE_INFO" },
    { label: "3. 'Placement packages?'", query: "What are the top placement packages and recruiters?", type: "COLLEGE_INFO" },
    { label: "4. 'College timings?'", query: "What are the daily college working hours?", type: "COLLEGE_INFO" },
    { label: "5. 'Absent students today'", query: "How many students are absent today?", type: "ATTENDANCE" },
    { label: "6. 'Tharun attendance'", query: "What is Tharun's attendance status?", type: "ATTENDANCE" },
    { label: "7. 'Was he present yesterday?'", query: "Was he present yesterday?", type: "ATTENDANCE" },
    { label: "8. 'What is 2 + 3?'", query: "What is 2 + 3?", type: "GENERAL" },
  ];

  // Visual Styling Helpers
  const dm = darkMode;
  const cardBg = dm ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200";
  const headingText = dm ? "text-white" : "text-gray-900";
  const mutedText = dm ? "text-gray-400" : "text-gray-500";

  const getStateBadge = () => {
    switch (state) {
      case "IDLE":
        return {
          bg: dm ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-700",
          icon: <MicOff size={14} />,
          text: "IDLE (Click Start to Speak)",
          ring: "",
        };
      case "LISTENING":
        return {
          bg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
          icon: <Mic size={14} className="animate-pulse text-emerald-500" />,
          text: "LISTENING (Speak naturally)",
          ring: "ring-4 ring-emerald-500/20",
        };
      case "PROCESSING":
        return {
          bg: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30",
          icon: <Sparkles size={14} className="animate-spin text-indigo-500" />,
          text: "THINKING (Processing question...)",
          ring: "ring-4 ring-indigo-500/20",
        };
      case "SPEAKING":
        return {
          bg: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30",
          icon: <Volume2 size={14} className="animate-bounce text-purple-500" />,
          text: "SPEAKING (Say anything to interrupt)",
          ring: "ring-4 ring-purple-500/30 animate-pulse",
        };
      case "INTERRUPTED":
        return {
          bg: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40",
          icon: <Zap size={14} className="text-amber-500 animate-ping" />,
          text: "INTERRUPTED (Listening to new question)",
          ring: "ring-4 ring-amber-500/30",
        };
      case "ERROR":
        return {
          bg: "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30",
          icon: <AlertCircle size={14} className="text-red-500" />,
          text: "ERROR (Check microphone permissions)",
          ring: "ring-4 ring-red-500/20",
        };
    }
  };

  const badge = getStateBadge();

  return (
    <div className={`rounded-2xl border shadow-xl overflow-hidden transition-all duration-300 ${cardBg}`}>
      {/* Studio Header Bar */}
      <div className={`p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        dm ? "border-gray-800 bg-gray-950/60" : "border-gray-100 bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/70"
      }`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg transition-transform ${
              state === "SPEAKING"
                ? "bg-gradient-to-br from-purple-600 to-indigo-600 scale-105 ring-4 ring-purple-500/30"
                : state === "LISTENING"
                ? "bg-gradient-to-br from-emerald-500 to-teal-600 scale-105 ring-4 ring-emerald-500/30"
                : state === "PROCESSING"
                ? "bg-gradient-to-br from-indigo-600 to-blue-600"
                : state === "INTERRUPTED"
                ? "bg-gradient-to-br from-amber-500 to-orange-600"
                : "bg-gray-700"
            }`}>
              {state === "SPEAKING" ? (
                <Volume2 size={24} className="animate-pulse" />
              ) : state === "LISTENING" ? (
                <Mic size={24} className="animate-pulse" />
              ) : state === "PROCESSING" ? (
                <Sparkles size={24} className="animate-spin" />
              ) : state === "INTERRUPTED" ? (
                <Zap size={24} />
              ) : (
                <Bot size={24} />
              )}
            </div>
            {state !== "IDLE" && (
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-lg font-bold tracking-tight ${headingText}`}>
                Voice AI Conversational Studio
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${badge.bg}`}>
                {badge.icon}
                {badge.text}
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${mutedText}`}>
              Natural real-time dialogue with Echo Cancellation, Voice Activity Detection, and Instant Interruption Barge-In
            </p>
          </div>
        </div>

        {/* Master Control Buttons */}
        <div className="flex items-center gap-2">
          {state === "IDLE" || state === "ERROR" ? (
            <button
              onClick={handleStartSession}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Mic size={16} />
              <span>Start Microphone</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {state === "SPEAKING" && (
                <button
                  onClick={handleInterruption}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 transition-all animate-pulse"
                >
                  <Square size={14} className="fill-current" />
                  <span>Interrupt Agent</span>
                </button>
              )}
              <button
                onClick={handleStopSession}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 hover:bg-red-100 transition-all"
              >
                <Square size={14} />
                <span>Stop Session</span>
              </button>
            </div>
          )}

          <button
            onClick={handleTestSpeaker}
            title="Test speaker output / Priya voice"
            className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all ${
              dm
                ? "border-gray-800 hover:bg-gray-800 text-gray-300"
                : "border-gray-200 hover:bg-gray-100 text-gray-700"
            }`}
          >
            <Volume2 size={15} className="text-indigo-500" />
            <span className="hidden sm:inline text-[11px]">Test Audio</span>
          </button>

          <button
            onClick={handleResetSession}
            title="Reset conversation context and start fresh"
            className={`p-2 rounded-xl border text-xs font-medium transition-all ${
              dm
                ? "border-gray-800 hover:bg-gray-800 text-gray-300"
                : "border-gray-200 hover:bg-gray-100 text-gray-700"
            }`}
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-red-500/10 border-b border-red-500/30 p-3 px-5 flex items-center justify-between text-xs text-red-600 dark:text-red-400">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button
            onClick={() => {
              setErrorMessage(null);
              startListeningPipeline();
            }}
            className="underline font-bold hover:text-red-700"
          >
            Retry Permission
          </button>
        </div>
      )}

      {/* Main Studio Interactive Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
        {/* Left Column: Live Audio Visualizer & Waveform (4 cols) */}
        <div className={`lg:col-span-4 p-5 flex flex-col justify-between border-b lg:border-b-0 lg:border-r ${
          dm ? "border-gray-800 bg-gray-950/40" : "border-gray-100 bg-slate-50/50"
        }`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className={`text-xs font-bold uppercase tracking-wider ${mutedText}`}>
                Live Audio & VAD Sensor
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-mono text-indigo-500">
                <Radio size={12} className={state === "LISTENING" ? "animate-pulse" : ""} />
                {audioLevel > 5 ? `${audioLevel}% Level` : "Silent"}
              </span>
            </div>

            {/* Pulsing Voice Orb & Equalizer */}
            <div className="my-6 flex flex-col items-center justify-center">
              <div className="relative flex items-center justify-center">
                {/* Outer dynamic pulse ring responding to real audio input */}
                <div
                  className={`absolute rounded-full transition-all duration-150 ${
                    state === "SPEAKING"
                      ? "bg-purple-500/20"
                      : state === "LISTENING"
                      ? "bg-emerald-500/20"
                      : "bg-gray-500/10"
                  }`}
                  style={{
                    width: `${90 + audioLevel * 1.2}px`,
                    height: `${90 + audioLevel * 1.2}px`,
                  }}
                />

                {/* Inner active orb */}
                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ${
                    state === "SPEAKING"
                      ? "bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-purple-500/30 scale-105"
                      : state === "LISTENING"
                      ? "bg-gradient-to-tr from-emerald-500 to-teal-500 shadow-emerald-500/30"
                      : state === "PROCESSING"
                      ? "bg-gradient-to-tr from-indigo-500 to-blue-600 animate-pulse"
                      : state === "INTERRUPTED"
                      ? "bg-gradient-to-tr from-amber-500 to-orange-500 scale-95"
                      : "bg-gray-800 text-gray-500"
                  }`}
                >
                  {state === "SPEAKING" ? (
                    <Volume2 size={36} className="text-white animate-pulse" />
                  ) : state === "LISTENING" ? (
                    <Mic size={36} className="text-white" />
                  ) : state === "PROCESSING" ? (
                    <Sparkles size={36} className="text-white animate-spin" />
                  ) : state === "INTERRUPTED" ? (
                    <Zap size={36} className="text-white" />
                  ) : (
                    <MicOff size={32} className="text-gray-400" />
                  )}
                </div>
              </div>

              {/* 12-Bar Live Audio Equalizer Waveform */}
              <div className="flex items-end justify-center gap-1.5 h-10 mt-6">
                {[12, 28, 45, 75, 90, 60, 80, 40, 70, 50, 30, 15].map((baseHeight, idx) => {
                  const dynamicHeight =
                    state === "LISTENING"
                      ? Math.max(4, Math.min(36, Math.round((baseHeight * audioLevel) / 100)))
                      : state === "SPEAKING"
                      ? Math.max(6, Math.round(baseHeight * 0.4 + Math.sin(Date.now() / 200 + idx) * 8))
                      : 3;

                  return (
                    <div
                      key={idx}
                      className={`w-1.5 rounded-full transition-all duration-75 ${
                        state === "SPEAKING"
                          ? "bg-purple-500"
                          : state === "LISTENING"
                          ? audioLevel > 15
                            ? "bg-emerald-500"
                            : "bg-emerald-400/50"
                          : "bg-gray-300 dark:bg-gray-700"
                      }`}
                      style={{ height: `${dynamicHeight}px` }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Live Interim Transcript Bubble */}
            <div className={`p-3.5 rounded-xl border text-xs min-h-[70px] transition-all ${
              dm ? "bg-gray-900/90 border-gray-800" : "bg-white border-gray-200"
            }`}>
              <span className={`block font-bold text-[11px] mb-1 uppercase tracking-wider ${mutedText}`}>
                {state === "LISTENING" ? "Live Mic Hearing..." : state === "SPEAKING" ? "Agent Speaking..." : "Interim Speech"}
              </span>
              <p className={`italic ${interimTranscript ? headingText : mutedText}`}>
                {interimTranscript || (state === "LISTENING" ? "Speak into microphone..." : "Waiting for voice...")}
              </p>
            </div>
          </div>

          {/* Quick 1-Click Verification Test Buttons */}
          <div className="mt-4">
            <span className={`block text-[11px] font-bold uppercase tracking-wider mb-2 ${mutedText}`}>
              1-Click Instant Test Prompts
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESET_SCENARIOS.slice(0, 8).map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => submitUserQuery(preset.query)}
                  disabled={state === "PROCESSING"}
                  className={`text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium border truncate transition-all ${
                    preset.type === "COLLEGE_INFO"
                      ? "border-amber-200 dark:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-300"
                      : preset.type === "ATTENDANCE"
                      ? "border-teal-200 dark:border-teal-900/50 hover:bg-teal-50 dark:hover:bg-teal-950/30 text-teal-700 dark:text-teal-300"
                      : "border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Multi-Turn Conversation History (8 cols) */}
        <div className="lg:col-span-8 flex flex-col justify-between p-5">
          {/* Messages Stream */}
          <div className="overflow-y-auto max-h-[380px] space-y-3.5 pr-2">
            {messages.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                  <Bot size={28} />
                </div>
                <h4 className={`text-sm font-bold ${headingText}`}>
                  CMRCET Voice AI College Assistant
                </h4>
                <p className={`text-xs max-w-md mt-1 ${mutedText}`}>
                  Click <strong>Start Microphone</strong> to chat. Ask about college admissions, counselling code <code>CMRK</code>, placements, courses, campus timings, or ask for real-time student attendance records!
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <Bot size={16} />
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] rounded-2xl p-3.5 text-xs shadow-sm transition-all ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-tr-sm"
                        : dm
                        ? "bg-gray-800 border border-gray-700 text-gray-100 rounded-tl-sm"
                        : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm"
                    }`}
                  >
                    {/* Header tag */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-[11px] opacity-80">
                        {msg.role === "user" ? "You (Microphone)" : "Priya (CMRCET AI)"}
                      </span>
                      {msg.intent && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            msg.intent === "COLLEGE_INFO"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                              : msg.intent === "ATTENDANCE"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                              : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300"
                          }`}
                        >
                          {msg.intent === "COLLEGE_INFO"
                            ? "CMRCET College Info"
                            : msg.intent === "ATTENDANCE"
                            ? "Student Attendance"
                            : "General Chat"}
                        </span>
                      )}
                    </div>

                    {/* Message Body */}
                    <p className="leading-relaxed font-normal whitespace-pre-wrap">{msg.text}</p>

                    <div className="flex items-center justify-between text-[10px] opacity-70 mt-1.5">
                      {msg.role === "assistant" ? (
                        <button
                          onClick={() => speakReply(msg.text, generationTokenRef.current)}
                          title="Replay spoken audio"
                          className="flex items-center gap-1 text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 font-medium transition-colors"
                        >
                          <Volume2 size={12} />
                          <span>Replay</span>
                        </button>
                      ) : <span />}
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>

                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <User size={16} />
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Text Input & Quick Interruption Toolbar */}
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
            <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Or type a question (e.g. 'What is 2 + 3?' or 'Absent count')..."
                className={`flex-1 px-4 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                  dm
                    ? "bg-gray-950 border-gray-800 text-white focus:border-indigo-500"
                    : "bg-white border-gray-200 text-gray-800 focus:border-indigo-500 shadow-sm"
                }`}
              />
              <button
                type="submit"
                disabled={!textInput.trim() || state === "PROCESSING"}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
              >
                <Send size={14} />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
