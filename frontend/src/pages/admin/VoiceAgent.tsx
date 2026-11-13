import { useState, useEffect, useRef } from "react";
import {
  Phone,
  PhoneCall,
  X,
  CheckCircle,
  Clock,
  PhoneOff,
  RefreshCw,
  Play,
  Pause,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  Bot,
  User,
  ChevronRight,
  RotateCw,
  Search,
  Filter,
  Check,
  Radio,
  FileText,
  Settings,
  Key,
  Globe,
  Send,
  PhoneForwarded,
  Eye,
  EyeOff,
  Zap,
  Mic,
  Cpu,
  Volume2,
  Sliders,
  Headphones,
  ArrowDownUp,
  Calendar,
} from "lucide-react";
import {
  getVerifications,
  getVerificationStats,
  startVerification,
  simulateCall,
  retryCall,
  getVerificationDetail,
  getTelephonyConfig,
  updateTelephonyConfig,
  testCarrierCredentials,
  testSarvamCredentials,
  testDeepgramCredentials,
  testOpenAICredentials,
  testGroqCredentials,
  testGeminiCredentials,
  testCartesiaCredentials,
  testElevenLabsCredentials,
  dispatchTestCall,
  VerificationItem,
  VerificationStats,
  VerificationDetail,
  TelephonyConfig,
} from "../../services/verificationApi";
import { getStudents, BackendStudent } from "../../services/studentApi";
import AskStudentAIModal from "../../components/common/AskStudentAIModal";
import VoiceAgentStudio from "../../components/voice/VoiceAgentStudio";

interface Props {
  darkMode: boolean;
  onNavigate?: (page: string) => void;
}

export default function VoiceAgent({ darkMode, onNavigate }: Props) {
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [verifications, setVerifications] = useState<VerificationItem[]>([]);
  const [students, setStudents] = useState<BackendStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [historyViewMode, setHistoryViewMode] = useState<"stacked_cards" | "table">("stacked_cards");

  // AI Student Inquiry Modal State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiModalStudentId, setAiModalStudentId] = useState<string | undefined>(undefined);

  // Telephony & Multi-AI Config State
  const [telephonyConfig, setTelephonyConfig] = useState<TelephonyConfig | null>(null);
  const [telephonyModal, setTelephonyModal] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<"carrier" | "stt" | "llm" | "tts" | "testcall">("carrier");

  // Carrier (Vobiz)
  const [authIdInput, setAuthIdInput] = useState("");
  const [authTokenInput, setAuthTokenInput] = useState("");
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [fromNumberInput, setFromNumberInput] = useState("");
  const [webhookUrlInput, setWebhookUrlInput] = useState("");
  const [testingCarrier, setTestingCarrier] = useState(false);
  const [carrierStatusMsg, setCarrierStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // STT (Sarvam AI & Deepgram)
  const [activeSttProvider, setActiveSttProvider] = useState("auto");
  const [sarvamKeyInput, setSarvamKeyInput] = useState("");
  const [showSarvamKey, setShowSarvamKey] = useState(false);
  const [sarvamModelInput, setSarvamModelInput] = useState("saaras:v3");
  const [sarvamLangInput, setSarvamLangInput] = useState("en-IN");
  const [testingSarvam, setTestingSarvam] = useState(false);
  const [sarvamStatusMsg, setSarvamStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [deepgramKeyInput, setDeepgramKeyInput] = useState("");
  const [showDeepgramKey, setShowDeepgramKey] = useState(false);
  const [testingDeepgram, setTestingDeepgram] = useState(false);
  const [deepgramStatusMsg, setDeepgramStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // LLM (Gemini, Groq & OpenAI)
  const [activeLlmProvider, setActiveLlmProvider] = useState("auto");
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [geminiModelInput, setGeminiModelInput] = useState("gemini-3.5-flash");
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiStatusMsg, setGeminiStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [groqKeyInput, setGroqKeyInput] = useState("");
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [groqModelInput, setGroqModelInput] = useState("llama-3.3-70b-versatile");
  const [testingGroq, setTestingGroq] = useState(false);
  const [groqStatusMsg, setGroqStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [openaiKeyInput, setOpenaiKeyInput] = useState("");
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [openaiModelInput, setOpenaiModelInput] = useState("gpt-4o-mini");
  const [testingOpenai, setTestingOpenai] = useState(false);
  const [openaiStatusMsg, setOpenaiStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // TTS & Voice Cloning (Sarvam, Cartesia & ElevenLabs)
  const [activeTtsProvider, setActiveTtsProvider] = useState("vobiz_native");
  const [sarvamSpeakerInput, setSarvamSpeakerInput] = useState("meera");
  const [sarvamPaceInput, setSarvamPaceInput] = useState("1.0");
  const [cartesiaKeyInput, setCartesiaKeyInput] = useState("");
  const [showCartesiaKey, setShowCartesiaKey] = useState(false);
  const [cartesiaVoiceIdInput, setCartesiaVoiceIdInput] = useState("");
  const [testingCartesia, setTestingCartesia] = useState(false);
  const [cartesiaStatusMsg, setCartesiaStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [elevenlabsKeyInput, setElevenlabsKeyInput] = useState("");
  const [showElevenlabsKey, setShowElevenlabsKey] = useState(false);
  const [elevenlabsVoiceIdInput, setElevenlabsVoiceIdInput] = useState("Rachel");
  const [testingElevenlabs, setTestingElevenlabs] = useState(false);
  const [elevenlabsStatusMsg, setElevenlabsStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Test Call
  const [testPhoneInput, setTestPhoneInput] = useState("+917569254406");
  const [dispatchingTestCall, setDispatchingTestCall] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [lastTestCall, setLastTestCall] = useState<{
    call_uuid?: string;
    verification_id?: number;
    call_id?: number;
    audio_url?: string;
    phone?: string;
  } | null>(null);
  const [playingTestAudio, setPlayingTestAudio] = useState(false);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);

  // Call Initiation Modal
  const [callModal, setCallModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [customStudentPhone, setCustomStudentPhone] = useState("");
  const [customParentPhone, setCustomParentPhone] = useState("");
  const [callMode, setCallMode] = useState<"LIVE_VOBIZ" | "MATCH" | "MISMATCH" | "NO_ANSWER_STUDENT">("LIVE_VOBIZ");
  const [customStudentReason, setCustomStudentReason] = useState("");
  const [customParentReason, setCustomParentReason] = useState("");
  const [initiating, setInitiating] = useState(false);

  // Detail Modal
  const [detailModal, setDetailModal] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<VerificationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Audio Playback
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioObj, setAudioObj] = useState<HTMLAudioElement | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const dm = darkMode;
  const card = `rounded-xl border ${dm ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} shadow-sm`;
  const muted = dm ? "text-gray-400" : "text-gray-500";
  const heading = dm ? "text-white" : "text-gray-900";
  const inputClass = `px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${
    dm ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-700"
  }`;

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, listData, studentsData, configData] = await Promise.all([
        getVerificationStats(),
        getVerifications(),
        getStudents(),
        getTelephonyConfig().catch(() => null),
      ]);
      setStats(statsData);
      setVerifications(listData);
      setStudents(studentsData);
      if (configData) {
        setTelephonyConfig(configData);
        setAuthIdInput(configData.vobiz_auth_id || "");
        setFromNumberInput(configData.vobiz_from_number || "");
        setWebhookUrlInput(configData.webhook_base_url || "");
        if (configData.vobiz_from_number && !testPhoneInput) {
          setTestPhoneInput(configData.vobiz_from_number);
        }
      }
      if (studentsData.length > 0 && !selectedStudentId) {
        const first = studentsData[0];
        setSelectedStudentId(first.student_id || first.roll_number || "");
        setCustomStudentPhone(first.student_no || "");
        setCustomParentPhone(first.parent_phone || "");
      }
    } catch (err) {
      console.error("Failed to load verification data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh periodically for active calls
    const interval = setInterval(async () => {
      try {
        const listData = await getVerifications();
        setVerifications(listData);
        const statsData = await getVerificationStats();
        setStats(statsData);
      } catch (err) {
        // silent
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // When selected student changes in modal, update phone fields from college database
  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    const found = students.find((s) => s.student_id === studentId || s.roll_number === studentId);
    if (found) {
      setCustomStudentPhone(found.student_no || "");
      setCustomParentPhone(found.parent_phone || "");
    }
  };

  const openTelephonySettings = async () => {
    setTelephonyModal(true);
    setCarrierStatusMsg(null);
    setSarvamStatusMsg(null);
    setDeepgramStatusMsg(null);
    setGeminiStatusMsg(null);
    setGroqStatusMsg(null);
    setOpenaiStatusMsg(null);
    setCartesiaStatusMsg(null);
    setElevenlabsStatusMsg(null);
    try {
      const cfg = await getTelephonyConfig();
      setTelephonyConfig(cfg);
      setAuthIdInput(cfg.vobiz_auth_id || "");
      setFromNumberInput(cfg.vobiz_from_number || "");
      setWebhookUrlInput(cfg.webhook_base_url || "");
      // STT
      setSarvamKeyInput(cfg.sarvam_api_key || "");
      setSarvamLangInput(cfg.sarvam_language_code || "en-IN");
      setSarvamModelInput(cfg.sarvam_model && cfg.sarvam_model !== "saaras:v1" ? cfg.sarvam_model : "saaras:v3");
      setDeepgramKeyInput(cfg.deepgram_api_key || "");
      setActiveSttProvider(cfg.active_stt_provider || "auto");
      // LLM
      setGeminiKeyInput(cfg.gemini_api_key || "");
      setGeminiModelInput(cfg.gemini_model && !["gemini-2.5-flash", "2.5-flash"].includes(cfg.gemini_model) ? cfg.gemini_model : "gemini-3.5-flash");
      setGroqKeyInput(cfg.groq_api_key || "");
      setGroqModelInput(cfg.groq_model || "llama-3.3-70b-versatile");
      setOpenaiKeyInput(cfg.openai_api_key || "");
      setOpenaiModelInput(cfg.openai_model || "gpt-4o-mini");
      setActiveLlmProvider(cfg.active_llm_provider || "auto");
      // TTS & Voice Cloning
      setSarvamSpeakerInput(cfg.sarvam_speaker || "meera");
      setSarvamPaceInput(cfg.sarvam_pace || "1.0");
      setCartesiaKeyInput(cfg.cartesia_api_key || "");
      setCartesiaVoiceIdInput(cfg.cartesia_voice_id || "");
      setElevenlabsKeyInput(cfg.elevenlabs_api_key || "");
      setElevenlabsVoiceIdInput(cfg.elevenlabs_voice_id || "Rachel");
      setActiveTtsProvider(cfg.active_tts_provider || "vobiz_native");
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveTelephonyConfig = async () => {
    setSavingConfig(true);
    setCarrierStatusMsg(null);
    try {
      const res = await updateTelephonyConfig({
        vobiz_auth_id: authIdInput.trim() || undefined,
        vobiz_auth_token: authTokenInput.trim() || undefined,
        vobiz_from_number: fromNumberInput.trim() || undefined,
        webhook_base_url: webhookUrlInput.trim() || undefined,
        // STT
        sarvam_api_key: sarvamKeyInput.trim() || undefined,
        sarvam_language_code: sarvamLangInput.trim() || undefined,
        sarvam_model: sarvamModelInput,
        deepgram_api_key: deepgramKeyInput.trim() || undefined,
        active_stt_provider: activeSttProvider,
        // LLM
        gemini_api_key: geminiKeyInput.trim() || undefined,
        gemini_model: geminiModelInput.trim() || undefined,
        groq_api_key: groqKeyInput.trim() || undefined,
        groq_model: groqModelInput.trim() || undefined,
        openai_api_key: openaiKeyInput.trim() || undefined,
        openai_model: openaiModelInput.trim() || undefined,
        active_llm_provider: activeLlmProvider,
        // TTS & Voice Cloning
        sarvam_speaker: sarvamSpeakerInput,
        sarvam_pace: sarvamPaceInput,
        cartesia_api_key: cartesiaKeyInput.trim() || undefined,
        cartesia_voice_id: cartesiaVoiceIdInput.trim() || undefined,
        elevenlabs_api_key: elevenlabsKeyInput.trim() || undefined,
        elevenlabs_voice_id: elevenlabsVoiceIdInput.trim() || undefined,
        active_tts_provider: activeTtsProvider,
      });
      setTelephonyConfig(res.config);
      setToastMessage("All Telephony & AI provider configurations saved successfully!");
      setTimeout(() => setToastMessage(null), 4000);
      setCarrierStatusMsg({ ok: true, text: "All settings saved and synchronized to system environment." });
    } catch (err: any) {
      setCarrierStatusMsg({ ok: false, text: err.message || "Failed to save settings." });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestGemini = async () => {
    setTestingGemini(true);
    setGeminiStatusMsg(null);
    try {
      const res = await testGeminiCredentials(geminiKeyInput.trim() || undefined, geminiModelInput);
      setGeminiStatusMsg({
        ok: res.connected,
        text: res.message || res.error || "Gemini verification complete.",
      });
    } catch (err: any) {
      setGeminiStatusMsg({ ok: false, text: err.message || "Could not reach Google Gemini API." });
    } finally {
      setTestingGemini(false);
    }
  };

  const handleTestSarvam = async () => {
    setTestingSarvam(true);
    setSarvamStatusMsg(null);
    try {
      const res = await testSarvamCredentials(sarvamKeyInput.trim() || undefined, sarvamModelInput);
      setSarvamStatusMsg({
        ok: res.connected,
        text: res.message || res.error || "Sarvam verification complete.",
      });
    } catch (err: any) {
      setSarvamStatusMsg({ ok: false, text: err.message || "Could not reach Sarvam server." });
    } finally {
      setTestingSarvam(false);
    }
  };

  const handleTestDeepgram = async () => {
    setTestingDeepgram(true);
    setDeepgramStatusMsg(null);
    try {
      const res = await testDeepgramCredentials(deepgramKeyInput.trim() || undefined);
      setDeepgramStatusMsg({
        ok: res.connected,
        text: res.message || res.error || "Deepgram verification complete.",
      });
    } catch (err: any) {
      setDeepgramStatusMsg({ ok: false, text: err.message || "Could not reach Deepgram server." });
    } finally {
      setTestingDeepgram(false);
    }
  };

  const handleTestGroq = async () => {
    setTestingGroq(true);
    setGroqStatusMsg(null);
    try {
      const res = await testGroqCredentials(groqKeyInput.trim() || undefined);
      setGroqStatusMsg({
        ok: res.connected,
        text: res.message || res.error || "Groq verification complete.",
      });
    } catch (err: any) {
      setGroqStatusMsg({ ok: false, text: err.message || "Could not reach Groq server." });
    } finally {
      setTestingGroq(false);
    }
  };

  const handleTestOpenAI = async () => {
    setTestingOpenai(true);
    setOpenaiStatusMsg(null);
    try {
      const res = await testOpenAICredentials(openaiKeyInput.trim() || undefined);
      setOpenaiStatusMsg({
        ok: res.connected,
        text: res.message || res.error || "OpenAI verification complete.",
      });
    } catch (err: any) {
      setOpenaiStatusMsg({ ok: false, text: err.message || "Could not reach OpenAI server." });
    } finally {
      setTestingOpenai(false);
    }
  };

  const handleTestCartesia = async () => {
    setTestingCartesia(true);
    setCartesiaStatusMsg(null);
    try {
      const res = await testCartesiaCredentials(cartesiaKeyInput.trim() || undefined);
      setCartesiaStatusMsg({
        ok: res.connected,
        text: res.message || res.error || "Cartesia verification complete.",
      });
    } catch (err: any) {
      setCartesiaStatusMsg({ ok: false, text: err.message || "Could not reach Cartesia server." });
    } finally {
      setTestingCartesia(false);
    }
  };

  const handleTestElevenLabs = async () => {
    setTestingElevenlabs(true);
    setElevenlabsStatusMsg(null);
    try {
      const res = await testElevenLabsCredentials(elevenlabsKeyInput.trim() || undefined);
      setElevenlabsStatusMsg({
        ok: res.connected,
        text: res.message || res.error || "ElevenLabs verification complete.",
      });
    } catch (err: any) {
      setElevenlabsStatusMsg({ ok: false, text: err.message || "Could not reach ElevenLabs server." });
    } finally {
      setTestingElevenlabs(false);
    }
  };

  const handleTestCarrier = async () => {
    setTestingCarrier(true);
    setCarrierStatusMsg(null);
    try {
      const res = await testCarrierCredentials();
      if (res.connected) {
        setCarrierStatusMsg({
          ok: true,
          text: res.message || "Successfully authenticated with Vobiz carrier account!",
        });
        const cfg = await getTelephonyConfig();
        setTelephonyConfig(cfg);
      } else {
        setCarrierStatusMsg({
          ok: false,
          text: res.error || "Carrier authentication failed. Please check Auth ID and Token.",
        });
      }
    } catch (err: any) {
      setCarrierStatusMsg({ ok: false, text: err.message || "Could not reach carrier server." });
    } finally {
      setTestingCarrier(false);
    }
  };

  const handleDispatchTestCall = async () => {
    if (!testPhoneInput) return;
    setDispatchingTestCall(true);
    try {
      const res = await dispatchTestCall(testPhoneInput);
      const audioUrl = (res as any).audio_url || `/api/verification/calls/${(res as any).call_id}/audio`;
      setLastTestCall({
        call_uuid: res.call_uuid,
        verification_id: (res as any).verification_id,
        call_id: (res as any).call_id,
        audio_url: audioUrl,
        phone: testPhoneInput,
      });
      setToastMessage(`Test call placed to ${testPhoneInput}! UUID: ${res.call_uuid}`);
      setTimeout(() => setToastMessage(null), 6000);
      alert(
        `Outbound test call dispatched to ${testPhoneInput}!\n\n` +
        `Your phone should ring in a few seconds. Answer the call to converse with Priya.\n` +
        `The voice audio is recorded and will be ready to play right here and in the Call Recordings dashboard!`
      );
    } catch (err: any) {
      alert(`Test call error: ${err.message}`);
    } finally {
      setDispatchingTestCall(false);
    }
  };

  const handleToggleTestAudio = (audioUrl: string) => {
    if (playingTestAudio) {
      testAudioRef.current?.pause();
      setPlayingTestAudio(false);
    } else {
      if (testAudioRef.current) {
        testAudioRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      testAudioRef.current = audio;
      audio.onended = () => setPlayingTestAudio(false);
      audio.play().then(() => setPlayingTestAudio(true)).catch((err) => {
        console.warn("Audio playback error:", err);
        setPlayingTestAudio(false);
      });
    }
  };

  const handleStartCall = async () => {
    if (!selectedStudentId) return;
    setInitiating(true);
    try {
      if (callMode === "LIVE_VOBIZ") {
        const res = await startVerification({
          student_id: selectedStudentId,
          scenario: "LIVE_VOBIZ",
          custom_student_phone: customStudentPhone || undefined,
          custom_parent_phone: customParentPhone || undefined,
          custom_student_reason: customStudentReason || undefined,
          custom_parent_reason: customParentReason || undefined,
        });
        setToastMessage(`Live Voice AI Call initiated to ${customStudentPhone || "student"}!`);
        setTimeout(() => setToastMessage(null), 5000);
        setCallModal(false);
        loadData();
        // Inspect the record immediately to watch live status
        handleInspectDetail(res.id);
      } else {
        // Run test simulation
        const res = await simulateCall({
          student_id: selectedStudentId,
          scenario: callMode,
          custom_student_phone: customStudentPhone || undefined,
          custom_parent_phone: customParentPhone || undefined,
          custom_student_reason: customStudentReason || undefined,
          custom_parent_reason: customParentReason || undefined,
        });

        setToastMessage(`Voice AI verification executed! Verdict: ${res.verification_status}`);
        setTimeout(() => setToastMessage(null), 4000);
        setCallModal(false);
        loadData();
        setSelectedDetail(res);
        setDetailModal(true);
      }
    } catch (err: any) {
      alert(err.message || "Failed to initiate call sequence");
    } finally {
      setInitiating(false);
    }
  };

  const handleInspectDetail = async (id: number) => {
    setLoadingDetail(true);
    setDetailModal(true);
    try {
      const data = await getVerificationDetail(id);
      setSelectedDetail(data);
    } catch (err: any) {
      alert(err.message || "Failed to load detail");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleRetry = async (id: number) => {
    try {
      await retryCall(id);
      setToastMessage(`Retry dialed for verification #${id}`);
      setTimeout(() => setToastMessage(null), 4000);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to retry call");
    }
  };

  const playCallAudio = (targetKey: string, b64Src?: string) => {
    if (playingAudio === targetKey) {
      audioObj?.pause();
      setPlayingAudio(null);
    } else {
      audioObj?.pause();
      if (!b64Src) {
        setToastMessage("Audio recording is not available for this call.");
        setTimeout(() => setToastMessage(null), 3000);
        return;
      }
      const audio = new Audio(b64Src);
      audio.onended = () => setPlayingAudio(null);
      audio.play().catch(console.error);
      setAudioObj(audio);
      setPlayingAudio(targetKey);
    }
  };

  const closeDetailModal = () => {
    audioObj?.pause();
    setPlayingAudio(null);
    setSelectedDetail(null);
    setDetailModal(false);
  };

  // Filter list
  const filteredList = verifications.filter((v) => {
    if (filterStatus === "ALL") return true;
    return v.verification_status === filterStatus;
  });

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-xl shadow-lg animate-fade-in">
          <CheckCircle size={18} />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className={`text-2xl font-bold ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Voice AI Verification Center
            </h1>
            {telephonyConfig?.is_configured ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Vobiz Telephony Ready
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Simulation Mode
              </span>
            )}
          </div>
          <p className={`text-sm mt-1 ${muted}`}>
            Automated dual-call voice agent with semantic contradiction detection for student absences
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setAiModalStudentId(selectedStudentId || undefined);
              setAiModalOpen(true);
            }}
            className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3 text-indigo-600 dark:text-indigo-400 font-semibold border-indigo-200 dark:border-indigo-900 shadow-sm"
          >
            <Sparkles size={14} className="text-indigo-600" />
            <span>Ask AI About Student</span>
          </button>
          {onNavigate && (
            <button
              onClick={() => onNavigate("call-recordings")}
              className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3 text-indigo-600 dark:text-indigo-400 font-semibold"
            >
              <Headphones size={14} />
              <span>Call Recordings Hub</span>
            </button>
          )}
          <button
            onClick={openTelephonySettings}
            className={`btn-secondary flex items-center gap-1.5 text-xs py-2 px-3 ${
              telephonyConfig?.is_configured ? "border-green-200 dark:border-green-900" : "border-amber-200"
            }`}
          >
            <Settings size={14} />
            <span>Telephony Settings</span>
            <span
              className={`w-2 h-2 rounded-full ${
                telephonyConfig?.is_configured ? "bg-green-500" : "bg-amber-400 animate-ping"
              }`}
            />
          </button>
          <button onClick={loadData} className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            onClick={() => {
              if (students.length > 0 && !selectedStudentId) {
                const s = students[0];
                setSelectedStudentId(s.student_id || s.roll_number || "");
                setCustomStudentPhone(s.student_no || "+917569254406");
                setCustomParentPhone(s.parent_phone || "+917569254406");
              }
              setCallModal(true);
            }}
            className="btn-primary flex items-center gap-2 text-xs py-2 px-3.5 shadow-md shadow-indigo-600/20"
          >
            <PhoneCall size={15} /> Make Voice AI Call
          </button>
        </div>
      </div>

      {/* Real-Time Conversational Voice Agent Studio */}
      <VoiceAgentStudio
        darkMode={darkMode}
        selectedStudentId={selectedStudentId}
        onStudentSelect={handleStudentSelect}
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Verifications",
            value: stats ? stats.total_verifications : verifications.length,
            icon: <Phone size={18} />,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
          },
          {
            label: "Verified Genuine (Match)",
            value: stats ? stats.matched : verifications.filter((v) => v.verification_status === "MATCHED").length,
            icon: <CheckCircle size={18} />,
            color: "text-green-600",
            bg: "bg-green-50",
          },
          {
            label: "Bunking Flagged (Mismatch)",
            value: stats ? stats.mismatched_suspicious : verifications.filter((v) => v.verification_status === "MISMATCHED").length,
            icon: <ShieldAlert size={18} />,
            color: "text-red-600",
            bg: "bg-red-50",
          },
          {
            label: "Unanswered / Pending",
            value: stats ? stats.unanswered_pending + stats.in_progress : verifications.filter((v) => v.verification_status !== "MATCHED" && v.verification_status !== "MISMATCHED").length,
            icon: <Clock size={18} />,
            color: "text-yellow-600",
            bg: "bg-yellow-50",
          },
        ].map((s) => (
          <div key={s.label} className={`stat-card ${dm ? "bg-gray-900 border-gray-800" : ""}`}>
            <div className="flex items-start justify-between mb-3">
              <p className={`text-xs font-semibold ${muted}`}>{s.label}</p>
              <div className={`w-8 h-8 rounded-lg ${s.bg} ${s.color} flex items-center justify-center`}>{s.icon}</div>
            </div>
            <p className={`text-2xl font-bold ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* 1-Click Interactive Test Bench */}
      <div className={`p-4 rounded-xl border ${dm ? "bg-gray-900 border-gray-800" : "bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/50 border-indigo-100"}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-600" />
            <div>
              <h3 className={`text-sm font-bold ${heading}`}>Interactive Test Scenarios</h3>
              <p className={`text-xs ${muted}`}>Simulate dual-call speech dialogues and AI contradiction matching with 1 click</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setSelectedStudentId(students[0]?.student_id || "21CS001");
                setCallMode("MATCH");
                setCustomStudentReason("Viral fever and vomiting");
                setCustomParentReason("Viral fever and doctor prescription");
                handleStartCall();
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-700 font-semibold hover:bg-green-100 transition-colors flex items-center gap-1.5"
            >
              <CheckCircle size={13} />
              <span>Test Scenario A (Match)</span>
            </button>

            <button
              onClick={() => {
                const target = students.find((s) => s.student_id === "21CS003") || students[1] || students[0];
                setSelectedStudentId(target?.student_id || "21CS003");
                setCallMode("MISMATCH");
                handleStartCall();
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 font-semibold hover:bg-red-100 transition-colors flex items-center gap-1.5"
            >
              <ShieldAlert size={13} />
              <span>Test Scenario B (Mismatch / Bunking)</span>
            </button>

            <button
              onClick={() => {
                const target = students.find((s) => s.student_id === "22EC004") || students[2] || students[0];
                setSelectedStudentId(target?.student_id || "22EC004");
                setCallMode("NO_ANSWER_STUDENT");
                handleStartCall();
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-700 font-semibold hover:bg-yellow-100 transition-colors flex items-center gap-1.5"
            >
              <PhoneOff size={13} />
              <span>Test Scenario C (Unanswered)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {["ALL", "MATCHED", "MISMATCHED", "NOT_ANSWERED", "IN_PROGRESS"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterStatus(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterStatus === tab
                ? dm ? "bg-indigo-900 text-white" : "bg-indigo-600 text-white"
                : dm ? "bg-gray-900 border border-gray-800 text-gray-400" : "bg-white border border-gray-200 text-gray-600"
            }`}
          >
            {tab.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Verification History & Dual Call Records Hub */}
      <div className={`${card} p-5`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b dark:border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`font-bold text-base ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Dual Call Records &amp; Transcripts (Student &amp; Parent)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {filteredList.length} Records
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${muted}`}>
              Compare student spoken statements (Up) vs parent explanations (Below) with audio playback and AI contradiction detection
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setHistoryViewMode("stacked_cards")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  historyViewMode === "stacked_cards"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
              >
                <ArrowDownUp size={13} />
                <span>Stacked (Up &amp; Below)</span>
              </button>
              <button
                onClick={() => setHistoryViewMode("table")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  historyViewMode === "table"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
              >
                <FileText size={13} />
                <span>Table View</span>
              </button>
            </div>

            {onNavigate && (
              <button
                onClick={() => onNavigate("call-recordings")}
                className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold"
              >
                <Headphones size={13} />
                <span>Recordings Hub</span>
              </button>
            )}
          </div>
        </div>

        {/* VIEW 1: STACKED CARDS (UP AND BELOW VIEW) */}
        {historyViewMode === "stacked_cards" ? (
          <div className="space-y-5">
            {filteredList.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-500">
                No verifications found for filter "{filterStatus}". Click "Make Voice AI Call" above to start one!
              </div>
            ) : (
              filteredList.map((v) => {
                const isMatch = v.verification_status === "MATCHED";
                const isMismatch = v.verification_status === "MISMATCHED" || v.is_bunking_suspected === 1;
                const isUnanswered = v.verification_status === "NOT_ANSWERED" || v.verification_status === "UNVERIFIED";

                const sKey = `${v.id}-STUDENT`;
                const pKey = `${v.id}-PARENT`;
                const sPlaying = playingAudio === sKey;
                const pPlaying = playingAudio === pKey;

                const sAudio = v.student_audio_b64 || v.student_call?.audio_base64 || v.student_call?.recording_url;
                const pAudio = v.parent_audio_b64 || v.parent_call?.audio_base64 || v.parent_call?.recording_url;

                const sText = v.student_transcript || v.student_call?.transcript_text || v.student_reason || "Call in progress...";
                const pText = v.parent_transcript || v.parent_call?.transcript_text || v.parent_reason || "Call in progress...";

                const matchScore = v.consistency_score !== undefined && v.consistency_score !== null
                  ? Math.round(v.consistency_score * 100)
                  : isMatch
                  ? 95
                  : isMismatch
                  ? 18
                  : 0;

                return (
                  <div
                    key={v.id}
                    className={`rounded-2xl border transition-all ${
                      isMismatch
                        ? dm ? "bg-red-950/10 border-red-900/40" : "bg-red-50/20 border-red-200"
                        : isMatch
                        ? dm ? "bg-green-950/10 border-green-900/40" : "bg-green-50/20 border-green-200"
                        : dm ? "bg-gray-800/30 border-gray-700" : "bg-gray-50/40 border-gray-200"
                    }`}
                  >
                    {/* Header */}
                    <div className="p-4 border-b dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0 ${
                            isMatch ? "bg-green-600" : isMismatch ? "bg-red-600" : "bg-amber-500"
                          }`}
                        >
                          {v.student_name ? v.student_name.charAt(0) : "S"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm ${heading}`}>{v.student_name}</span>
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold">
                              {v.roll_number || v.student_id}
                            </span>
                            <span className={`text-xs ${muted}`}>
                              {v.class_name || "CSE"} &bull; {v.department || "CSE"}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            Record #{v.id} &bull; Teacher: {v.teacher_name || "Dr. Rajesh Kumar"} &bull; {new Date(v.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Match Meter */}
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">AI Match Score</span>
                          <span className={`font-mono text-xs font-bold ${matchScore >= 70 ? "text-green-600" : matchScore <= 35 ? "text-red-600" : "text-amber-600"}`}>
                            {matchScore}% Match
                          </span>
                        </div>

                        {/* Verdict Badge */}
                        {isMatch ? (
                          <span className="badge badge-success flex items-center gap-1 text-xs py-1 px-2.5">
                            <CheckCircle size={13} />
                            <span>VERIFIED GENUINE (MATCH)</span>
                          </span>
                        ) : isMismatch ? (
                          <span className="badge badge-danger flex items-center gap-1 text-xs py-1 px-2.5">
                            <ShieldAlert size={13} />
                            <span>SUSPECTED BUNKING (REPORTED TO HOD)</span>
                          </span>
                        ) : (
                          <span className="badge badge-warning flex items-center gap-1 text-xs py-1 px-2.5">
                            <Clock size={13} />
                            <span>{v.verification_status}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stacked "Up and Below" Dual Call Audio & Transcripts */}
                    <div className="p-4 space-y-3.5">
                      {/* UP (TOP): Student Call */}
                      <div className={`p-3.5 rounded-xl border ${dm ? "bg-gray-900 border-gray-700" : "bg-white border-indigo-100 shadow-sm"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                              Student (Up / Top)
                            </span>
                            <span className={`text-xs font-bold ${heading}`}>Student Recording &amp; Speech</span>
                            <span className="text-[11px] font-mono text-gray-500">
                              Phone: <strong className={heading}>{v.student_phone || "+917569254406"}</strong>
                            </span>
                            <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.2 rounded">College DB</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => playCallAudio(sKey, sAudio)}
                              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                                sPlaying ? "bg-red-600 text-white animate-pulse" : "bg-indigo-600 text-white hover:bg-indigo-700"
                              }`}
                            >
                              {sPlaying ? <Pause size={12} /> : <Play size={12} />}
                              <span>{sPlaying ? "Pause" : "Play Recording"}</span>
                            </button>
                            <span className="text-[11px] font-mono text-gray-500">
                              {v.student_duration_seconds || v.student_call?.duration_seconds || 42}s
                            </span>
                          </div>
                        </div>

                        <div className={`p-2.5 rounded-lg text-xs leading-relaxed ${dm ? "bg-gray-800 text-gray-200" : "bg-gray-50 text-gray-800"}`}>
                          <span className="text-[10px] uppercase font-bold text-indigo-600 block mb-0.5">Spoken Statement (Transcribed by Sarvam saaras:v3)</span>
                          {sText}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="flex items-center justify-center py-0.5">
                        <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1" />
                        <span className="mx-3 text-[11px] font-bold text-gray-400 flex items-center gap-1">
                          <ArrowDownUp size={12} />
                          <span>Compare With Parent Statement Below</span>
                        </span>
                        <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1" />
                      </div>

                      {/* BELOW (DOWN): Parent Call */}
                      <div className={`p-3.5 rounded-xl border ${dm ? "bg-gray-900 border-gray-700" : "bg-white border-purple-100 shadow-sm"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                              Parent (Below / Down)
                            </span>
                            <span className={`text-xs font-bold ${heading}`}>Parent Recording &amp; Explanation</span>
                            <span className="text-[11px] font-mono text-gray-500">
                              Phone: <strong className={heading}>{v.parent_phone || "+919876543211"}</strong>
                            </span>
                            <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.2 rounded">College DB</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => playCallAudio(pKey, pAudio)}
                              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                                pPlaying ? "bg-red-600 text-white animate-pulse" : "bg-purple-600 text-white hover:bg-purple-700"
                              }`}
                            >
                              {pPlaying ? <Pause size={12} /> : <Play size={12} />}
                              <span>{pPlaying ? "Pause" : "Play Recording"}</span>
                            </button>
                            <span className="text-[11px] font-mono text-gray-500">
                              {v.parent_duration_seconds || v.parent_call?.duration_seconds || 56}s
                            </span>
                          </div>
                        </div>

                        <div className={`p-2.5 rounded-lg text-xs leading-relaxed ${dm ? "bg-gray-800 text-gray-200" : "bg-gray-50 text-gray-800"}`}>
                          <span className="text-[10px] uppercase font-bold text-purple-600 block mb-0.5">Parent Statement (Transcribed by Sarvam saaras:v3)</span>
                          {pText}
                        </div>
                      </div>

                      {/* AI Reasoning & Conflicts Callout */}
                      <div className={`p-3 rounded-lg border text-xs ${
                        isMatch
                          ? "bg-green-50/70 dark:bg-green-950/20 border-green-200 dark:border-green-900/40 text-green-800 dark:text-green-200"
                          : isMismatch
                          ? "bg-red-50/70 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-200"
                          : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                      }`}>
                        <div className="flex items-center gap-1.5 font-bold mb-1">
                          <Bot size={14} />
                          <span>AI Contradiction Engine (Gemini gemini-3.5-flash):</span>
                        </div>
                        <p>{v.comparison_summary || "Verification complete."}</p>

                        {v.conflicting_statements && v.conflicting_statements.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300">
                            <strong>Conflicting Points Detected:</strong>
                            <ul className="list-disc pl-5 mt-0.5 space-y-0.5">
                              {v.conflicting_statements.map((c, i) => (
                                <li key={i}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="text-xs">
                          {isMismatch ? (
                            <span className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                              <ShieldAlert size={14} /> Reported to HOD for Disciplinary Review
                            </span>
                          ) : isMatch ? (
                            <span className="text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
                              <CheckCircle size={14} /> Genuine Absence &bull; Not Reported to HOD
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">
                              Pending verification completion
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {isUnanswered && (
                            <button
                              onClick={() => handleRetry(v.id)}
                              className="btn-secondary text-xs px-2.5 py-1 flex items-center gap-1 text-yellow-600"
                            >
                              <RotateCw size={12} /> Retry
                            </button>
                          )}
                          <button
                            onClick={() => handleInspectDetail(v.id)}
                            className="btn-primary text-xs px-3 py-1 flex items-center gap-1"
                          >
                            <span>Full Evidence</span>
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* VIEW 2: COMPACT TABLE VIEW */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b text-xs font-semibold ${dm ? "text-gray-400 border-gray-800 bg-gray-800/40" : "text-gray-500 border-gray-100 bg-gray-50"}`}>
                  <th className="text-left py-3 px-4">Student</th>
                  <th className="text-left py-3 px-4">Class &amp; Department</th>
                  <th className="text-left py-3 px-4">Parent</th>
                  <th className="text-left py-3 px-4">Student Reason</th>
                  <th className="text-left py-3 px-4">Parent Explanation</th>
                  <th className="text-left py-3 px-4">AI Verdict</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={`py-12 text-center text-xs ${muted}`}>
                      No verifications found for filter "{filterStatus}". Click "Make Voice AI Call" above to start one!
                    </td>
                  </tr>
                ) : (
                  filteredList.map((v) => (
                    <tr key={v.id} className={`transition-colors ${dm ? "hover:bg-gray-800/40" : "hover:bg-gray-50/80"}`}>
                      <td className="py-3 px-4 text-xs font-semibold">
                        <div className={heading}>{v.student_name}</div>
                        <div className={`font-mono text-[11px] ${muted}`}>{v.roll_number || v.student_id}</div>
                      </td>

                      <td className="py-3 px-4 text-xs">
                        <div className={heading}>{v.class_name || "B.Tech CSE"}</div>
                        <div className={muted}>{v.department || "CSE"}</div>
                      </td>

                      <td className="py-3 px-4 text-xs">
                        <div className={heading}>{v.parent_name || "Parent"}</div>
                        <div className={`font-mono text-[11px] ${muted}`}>{v.parent_phone || "+91 98765 43211"}</div>
                      </td>

                      <td className={`py-3 px-4 text-xs max-w-xs truncate ${muted}`}>
                        {v.student_reason || "Calling in progress..."}
                      </td>

                      <td className={`py-3 px-4 text-xs max-w-xs truncate ${muted}`}>
                        {v.parent_reason || "Calling in progress..."}
                      </td>

                      <td className="py-3 px-4 text-xs">
                        <span
                          className={`badge ${
                            v.verification_status === "MATCHED"
                              ? "badge-success"
                              : v.verification_status === "MISMATCHED"
                              ? "badge-danger"
                              : v.verification_status === "NOT_ANSWERED"
                              ? "badge-warning"
                              : "badge-info"
                          }`}
                        >
                          {v.verification_status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {v.verification_status === "NOT_ANSWERED" && (
                            <button
                              onClick={() => handleRetry(v.id)}
                              className="btn-secondary text-[11px] px-2 py-1 flex items-center gap-1 text-yellow-600"
                              title="Retry unanswered call"
                            >
                              <RotateCw size={11} /> Retry
                            </button>
                          )}
                          <button
                            onClick={() => handleInspectDetail(v.id)}
                            className="btn-primary text-[11px] px-2.5 py-1 flex items-center gap-1"
                          >
                            <span>Evidence</span>
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Call Setup Modal */}
      {callModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl p-6 my-8 ${dm ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b dark:border-gray-800">
              <div className="flex items-center gap-2">
                <PhoneCall size={18} className="text-indigo-600" />
                <h3 className={`font-bold text-base ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Trigger Voice AI Absence Verification
                </h3>
              </div>
              <button onClick={() => setCallModal(false)} className={`p-1.5 rounded-lg ${dm ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}>
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Select student */}
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${muted}`}>Select Absent Student</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                  className={`w-full ${inputClass}`}
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.student_id || s.roll_number}>
                      {s.name} ({s.roll_number || s.student_id}) — {s.class_name || "CSE"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Phone Numbers from College Database */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`block text-xs font-semibold ${muted}`}>
                      Student Phone <span className="text-indigo-600 font-bold">*</span>
                    </label>
                    <span className="text-[10px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                      College DB
                    </span>
                  </div>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="e.g. +919876543210 (or your phone)"
                      value={customStudentPhone}
                      onChange={(e) => setCustomStudentPhone(e.target.value)}
                      className={`w-full pl-9 ${inputClass} font-mono`}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Fetched from student's college database profile</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`block text-xs font-semibold ${muted}`}>Parent Phone</label>
                    <span className="text-[10px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                      College DB
                    </span>
                  </div>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="e.g. +919876543211 (or your phone)"
                      value={customParentPhone}
                      onChange={(e) => setCustomParentPhone(e.target.value)}
                      className={`w-full pl-9 ${inputClass} font-mono`}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Dials parent after student response is recorded</p>
                </div>
              </div>

              {/* Mode Selector */}
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${muted}`}>Calling & Verification Mode</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: "LIVE_VOBIZ", label: "Real Phone Call (Vobiz)", icon: <PhoneCall size={13} className="text-green-600" /> },
                    { id: "MATCH", label: "Simulation: Match (Genuine)", icon: <CheckCircle size={13} className="text-blue-600" /> },
                    { id: "MISMATCH", label: "Simulation: Mismatch (Bunk)", icon: <ShieldAlert size={13} className="text-red-600" /> },
                    { id: "NO_ANSWER_STUDENT", label: "Simulation: Unanswered", icon: <PhoneOff size={13} className="text-yellow-600" /> },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setCallMode(m.id as any)}
                      className={`p-2.5 rounded-lg border text-left font-medium transition-all flex items-center gap-2 ${
                        callMode === m.id
                          ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold"
                          : dm ? "border-gray-800 bg-gray-800/40 text-gray-400" : "border-gray-200 bg-gray-50 text-gray-600"
                      }`}
                    >
                      {m.icon}
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {callMode === "LIVE_VOBIZ" && (
                <div className={`p-3 rounded-xl border text-xs ${
                  telephonyConfig?.is_configured
                    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900 text-green-800 dark:text-green-200"
                    : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {telephonyConfig?.is_configured ? "Ready to Place Live Outbound Calls" : "Vobiz Carrier Not Configured"}
                    </span>
                    <button onClick={openTelephonySettings} className="underline text-indigo-600 font-bold ml-2">
                      Configure Keys
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] opacity-90">
                    {telephonyConfig?.is_configured
                      ? `Agent will dial ${customStudentPhone} using caller ID ${telephonyConfig.vobiz_from_number}. Pick up the phone when it rings!`
                      : "To dial physical phone numbers, please enter your Vobiz Auth ID and Auth Token in Telephony Settings."}
                  </p>
                </div>
              )}

              {/* Optional Explanation Fields for testing */}
              {callMode !== "LIVE_VOBIZ" && (
                <>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${muted}`}>Student Stated Reason (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Viral fever and weakness"
                      value={customStudentReason}
                      onChange={(e) => setCustomStudentReason(e.target.value)}
                      className={`w-full ${inputClass}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${muted}`}>Parent Stated Explanation (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Left home for college in the morning"
                      value={customParentReason}
                      onChange={(e) => setCustomParentReason(e.target.value)}
                      className={`w-full ${inputClass}`}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2.5">
              <button onClick={() => setCallModal(false)} className="btn-secondary flex-1 py-2 text-xs">
                Cancel
              </button>
              <button
                onClick={handleStartCall}
                disabled={initiating}
                className="btn-primary flex-1 py-2 text-xs flex items-center justify-center gap-1.5"
              >
                {initiating ? <RefreshCw size={14} className="animate-spin" /> : <PhoneCall size={14} />}
                <span>
                  {initiating
                    ? "Dispatching..."
                    : callMode === "LIVE_VOBIZ"
                    ? `Dial Phone ${customStudentPhone}`
                    : "Execute Simulation"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Telephony & Multi-AI Settings Modal */}
      {telephonyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl p-6 my-8 ${dm ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                  <Sliders size={20} />
                </div>
                <div>
                  <h3 className={`font-bold text-base ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Telephony & Multi-AI Provider Settings
                  </h3>
                  <p className={`text-xs ${muted}`}>
                    Configure Vobiz Carrier, Indic & Fast STT, Contradiction Reasoning LLMs, and Voice Synthesis
                  </p>
                </div>
              </div>
              <button onClick={() => setTelephonyModal(false)} className={`p-1.5 rounded-lg ${dm ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}>
                <X size={16} />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 dark:border-gray-800 mt-4 mb-4 overflow-x-auto gap-1">
              {[
                { id: "carrier", label: "Carrier (Vobiz)", icon: <Phone size={14} />, ready: telephonyConfig?.is_configured },
                { id: "stt", label: "Speech-to-Text", icon: <Mic size={14} />, ready: telephonyConfig?.sarvam_configured || telephonyConfig?.deepgram_configured },
                { id: "llm", label: "Reasoning Brain", icon: <Cpu size={14} />, ready: telephonyConfig?.groq_configured || telephonyConfig?.openai_configured },
                { id: "tts", label: "Voice Synthesis", icon: <Volume2 size={14} />, ready: telephonyConfig?.cartesia_configured || telephonyConfig?.elevenlabs_configured },
                { id: "testcall", label: "Test Call Bench", icon: <PhoneForwarded size={14} /> },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveSettingsTab(t.id as any)}
                  className={`flex items-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-t-lg border-b-2 whitespace-nowrap transition-colors ${
                    activeSettingsTab === t.id
                      ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                  {t.ready && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                </button>
              ))}
            </div>

            {/* TAB 1: CARRIER (VOBIZ) */}
            {activeSettingsTab === "carrier" && (
              <div className="space-y-4">
                <p className={`text-xs ${muted}`}>
                  Configure your Vobiz Cloud Telephony API credentials to place physical telephone calls to students and parents with two-way voice recording.
                </p>

                {carrierStatusMsg && (
                  <div
                    className={`p-3 rounded-xl border text-xs ${
                      carrierStatusMsg.ok
                        ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900 text-green-800 dark:text-green-200"
                        : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900 text-red-800 dark:text-red-200"
                    }`}
                  >
                    {carrierStatusMsg.text}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${muted}`}>
                      Vobiz Auth ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MANKZMZGQ2YJQ5ZD... or your Vobiz Auth ID"
                      value={authIdInput}
                      onChange={(e) => setAuthIdInput(e.target.value)}
                      className={`w-full font-mono text-xs ${inputClass}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${muted}`}>
                      Vobiz Auth Token <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showAuthToken ? "text" : "password"}
                        placeholder={telephonyConfig?.vobiz_auth_token_masked || "Enter Vobiz Auth Token"}
                        value={authTokenInput}
                        onChange={(e) => setAuthTokenInput(e.target.value)}
                        className={`w-full font-mono text-xs pr-10 ${inputClass}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAuthToken(!showAuthToken)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showAuthToken ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${muted}`}>
                        Caller ID / From Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. +917569254406"
                        value={fromNumberInput}
                        onChange={(e) => setFromNumberInput(e.target.value)}
                        className={`w-full font-mono text-xs ${inputClass}`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${muted}`}>
                        Public Webhook URL (Tunnel)
                      </label>
                      <input
                        type="text"
                        placeholder="https://...trycloudflare.com"
                        value={webhookUrlInput}
                        onChange={(e) => setWebhookUrlInput(e.target.value)}
                        className={`w-full font-mono text-xs ${inputClass}`}
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleTestCarrier}
                      disabled={testingCarrier}
                      className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                    >
                      {testingCarrier ? <RefreshCw size={13} className="animate-spin" /> : <Key size={13} />}
                      <span>{testingCarrier ? "Verifying..." : "Verify Carrier Connection"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SPEECH-TO-TEXT (STT) */}
            {activeSettingsTab === "stt" && (
              <div className="space-y-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${muted}`}>Active STT Provider</label>
                  <select
                    value={activeSttProvider}
                    onChange={(e) => setActiveSttProvider(e.target.value)}
                    className={`w-full text-xs font-medium ${inputClass}`}
                  >
                    <option value="auto">Auto-Cascade (Sarvam AI Saaras -&gt; Deepgram Nova-2 -&gt; OpenAI Whisper)</option>
                    <option value="sarvam">Sarvam AI Saaras (Optimized for Indian Accents &amp; Indic Languages)</option>
                    <option value="deepgram">Deepgram Nova-2 (Fast sub-second streaming transcription)</option>
                    <option value="openai">OpenAI Whisper-1 (Accurate multilingual STT)</option>
                  </select>
                </div>

                {/* Sarvam AI Card */}
                <div className={`p-4 rounded-xl border ${dm ? "bg-gray-800/40 border-gray-700" : "bg-purple-50/40 border-purple-100"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Bot size={16} className="text-purple-600" />
                      <span className={`text-xs font-bold ${heading}`}>Sarvam AI (Indic Speech-To-Text)</span>
                    </div>
                    {telephonyConfig?.sarvam_configured ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Unconfigured</span>
                    )}
                  </div>
                  <p className={`text-[11px] mb-3 ${muted}`}>
                    Transcribes spoken voice statements into text using Sarvam AI Indic STT (Saaras:v3 / Saarika:v2.5) with native accent understanding.
                  </p>

                  {sarvamStatusMsg && (
                    <div className={`p-2 rounded-lg border mb-3 text-xs ${
                      sarvamStatusMsg.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
                    }`}>
                      {sarvamStatusMsg.text}
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${muted}`}>Sarvam Subscription Key</label>
                      <div className="relative">
                        <input
                          type={showSarvamKey ? "text" : "password"}
                          placeholder={telephonyConfig?.sarvam_api_key_masked || "Enter Sarvam API Key"}
                          value={sarvamKeyInput}
                          onChange={(e) => setSarvamKeyInput(e.target.value)}
                          className={`w-full font-mono text-xs pr-10 ${inputClass}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSarvamKey(!showSarvamKey)}
                          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                          {showSarvamKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${muted}`}>STT Model</label>
                        <select
                          value={sarvamModelInput}
                          onChange={(e) => setSarvamModelInput(e.target.value)}
                          className={`w-full text-xs ${inputClass}`}
                        >
                          <option value="saaras:v3">Saaras:v3 (Recommended - Accurate Indic STT)</option>
                          <option value="saarika:v2.5">Saarika:v2.5 (Conversational Speech-To-Text)</option>
                          <option value="saaras:v4">Saaras:v4 (Next-Gen Frontier Indic)</option>
                          <option value="saaras:v3-realtime">Saaras:v3-realtime (Low Latency Streaming)</option>
                          <option value="saarika:flash">Saarika:flash (High-Speed Turnaround)</option>
                          <option value="saarika:v2">Saarika:v2 (Legacy STT)</option>
                        </select>
                      </div>
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${muted}`}>Language Code</label>
                        <select
                          value={sarvamLangInput}
                          onChange={(e) => setSarvamLangInput(e.target.value)}
                          className={`w-full text-xs ${inputClass}`}
                        >
                          <option value="en-IN">English (India) - en-IN</option>
                          <option value="hi-IN">Hindi - hi-IN</option>
                          <option value="te-IN">Telugu - te-IN</option>
                          <option value="ta-IN">Tamil - ta-IN</option>
                          <option value="kn-IN">Kannada - kn-IN</option>
                          <option value="mr-IN">Marathi - mr-IN</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleTestSarvam}
                        disabled={testingSarvam || !sarvamKeyInput}
                        className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 whitespace-nowrap"
                      >
                        {testingSarvam ? <RefreshCw size={12} className="animate-spin" /> : <Key size={12} />}
                        <span>Verify Sarvam Key</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Deepgram Card */}
                <div className={`p-4 rounded-xl border ${dm ? "bg-gray-800/40 border-gray-700" : "bg-blue-50/40 border-blue-100"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-blue-600" />
                      <span className={`text-xs font-bold ${heading}`}>Deepgram (Nova-2 Speech-To-Text)</span>
                    </div>
                    {telephonyConfig?.deepgram_configured ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Optional</span>
                    )}
                  </div>
                  <p className={`text-[11px] mb-3 ${muted}`}>
                    Ultra-fast real-time speech-to-text with smart punctuation and low latency.
                  </p>

                  {deepgramStatusMsg && (
                    <div className={`p-2 rounded-lg border mb-3 text-xs ${
                      deepgramStatusMsg.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
                    }`}>
                      {deepgramStatusMsg.text}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showDeepgramKey ? "text" : "password"}
                        placeholder={telephonyConfig?.deepgram_api_key_masked || "Enter Deepgram API Key"}
                        value={deepgramKeyInput}
                        onChange={(e) => setDeepgramKeyInput(e.target.value)}
                        className={`w-full font-mono text-xs pr-10 ${inputClass}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowDeepgramKey(!showDeepgramKey)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showDeepgramKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleTestDeepgram}
                      disabled={testingDeepgram || !deepgramKeyInput}
                      className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {testingDeepgram ? <RefreshCw size={12} className="animate-spin" /> : <Key size={12} />}
                      <span>Verify Key</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: REASONING BRAIN (LLM) */}
            {activeSettingsTab === "llm" && (
              <div className="space-y-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${muted}`}>Active LLM Auditor Brain</label>
                  <select
                    value={activeLlmProvider}
                    onChange={(e) => setActiveLlmProvider(e.target.value)}
                    className={`w-full text-xs font-medium ${inputClass}`}
                  >
                    <option value="auto">Auto-Detect (Google Gemini 2.5 -&gt; Groq Llama 3.3 -&gt; OpenAI GPT-4o-mini -&gt; Built-in)</option>
                    <option value="gemini">Google Gemini (Gemini 2.5 Flash / 1.5 Pro - Advanced Multimodal Reasoning)</option>
                    <option value="groq">Groq Llama 3.3 70B (Fastest ~500 tok/s real-time semantic analysis)</option>
                    <option value="openai">OpenAI GPT-4o-mini (Deep reasoning, nuanced contradiction detection)</option>
                    <option value="local">Built-in Semantic Engine (Offline, zero external API cost)</option>
                  </select>
                </div>

                {/* Google Gemini Card */}
                <div className={`p-4 rounded-xl border ${dm ? "bg-gray-800/40 border-gray-700" : "bg-purple-50/40 border-purple-100"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-purple-600" />
                      <span className={`text-xs font-bold ${heading}`}>Google Gemini (Reasoning &amp; Contradiction Auditor)</span>
                    </div>
                    {telephonyConfig?.gemini_configured ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Unconfigured</span>
                    )}
                  </div>
                  <p className={`text-[11px] mb-3 ${muted}`}>
                    Google DeepMind Gemini reasoning brain. Analyzes student vs parent verbal statements to detect attendance contradictions and bunking.
                  </p>

                  {geminiStatusMsg && (
                    <div className={`p-2 rounded-lg border mb-3 text-xs ${
                      geminiStatusMsg.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
                    }`}>
                      {geminiStatusMsg.text}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className={`block text-[11px] font-medium mb-1 ${muted}`}>Model Selection</label>
                      <select
                        value={geminiModelInput}
                        onChange={(e) => setGeminiModelInput(e.target.value)}
                        className={`w-full text-xs ${inputClass}`}
                      >
                        <option value="gemini-3.5-flash">Gemini 3.5 Flash (Recommended - Fastest &amp; Next-Gen Reasoning)</option>
                        <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite (Lightweight Fast Inference)</option>
                        <option value="gemini-3.8-flash">Gemini 3.8 Flash (Frontier Multimodal)</option>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash (Standard Flash)</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning &amp; Complex Fact-Checking)</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-[11px] font-medium mb-1 ${muted}`}>API Key</label>
                      <div className="relative">
                        <input
                          type={showGeminiKey ? "text" : "password"}
                          placeholder={telephonyConfig?.gemini_api_key_masked || "Enter Google Gemini API Key"}
                          value={geminiKeyInput}
                          onChange={(e) => setGeminiKeyInput(e.target.value)}
                          className={`w-full font-mono text-xs pr-10 ${inputClass}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowGeminiKey(!showGeminiKey)}
                          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                          {showGeminiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        Compatible with all Gemini API keys (e.g. <code className="text-purple-500 font-semibold">AQ.Ab...</code> or <code className="text-purple-500 font-semibold">AIzaSy...</code>).
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleTestGemini}
                      disabled={testingGemini || !geminiKeyInput}
                      className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {testingGemini ? <RefreshCw size={12} className="animate-spin" /> : <Key size={12} />}
                      <span>Verify Gemini</span>
                    </button>
                  </div>
                </div>

                {/* Groq Card */}
                <div className={`p-4 rounded-xl border ${dm ? "bg-gray-800/40 border-gray-700" : "bg-amber-50/40 border-amber-100"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-amber-600" />
                      <span className={`text-xs font-bold ${heading}`}>Groq API (Llama 3.3 70B Versatile)</span>
                    </div>
                    {telephonyConfig?.groq_configured ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Unconfigured</span>
                    )}
                  </div>
                  <p className={`text-[11px] mb-3 ${muted}`}>
                    Lightning-fast inference engine for instantaneous contradiction matching between student and parent explanations.
                  </p>

                  {groqStatusMsg && (
                    <div className={`p-2 rounded-lg border mb-3 text-xs ${
                      groqStatusMsg.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
                    }`}>
                      {groqStatusMsg.text}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showGroqKey ? "text" : "password"}
                        placeholder={telephonyConfig?.groq_api_key_masked || "Enter Groq API Key (gsk_...)"}
                        value={groqKeyInput}
                        onChange={(e) => setGroqKeyInput(e.target.value)}
                        className={`w-full font-mono text-xs pr-10 ${inputClass}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowGroqKey(!showGroqKey)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showGroqKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleTestGroq}
                      disabled={testingGroq || !groqKeyInput}
                      className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {testingGroq ? <RefreshCw size={12} className="animate-spin" /> : <Key size={12} />}
                      <span>Verify Key</span>
                    </button>
                  </div>
                </div>

                {/* OpenAI Card */}
                <div className={`p-4 rounded-xl border ${dm ? "bg-gray-800/40 border-gray-700" : "bg-emerald-50/40 border-emerald-100"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Cpu size={16} className="text-emerald-600" />
                      <span className={`text-xs font-bold ${heading}`}>OpenAI API (GPT-4o-mini &amp; Whisper)</span>
                    </div>
                    {telephonyConfig?.openai_configured ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Unconfigured</span>
                    )}
                  </div>
                  <p className={`text-[11px] mb-3 ${muted}`}>
                    High-accuracy reasoning and structured contradiction scoring (also powers Whisper STT transcription).
                  </p>

                  {openaiStatusMsg && (
                    <div className={`p-2 rounded-lg border mb-3 text-xs ${
                      openaiStatusMsg.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
                    }`}>
                      {openaiStatusMsg.text}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showOpenaiKey ? "text" : "password"}
                        placeholder={telephonyConfig?.openai_api_key_masked || "Enter OpenAI API Key (sk-...)"}
                        value={openaiKeyInput}
                        onChange={(e) => setOpenaiKeyInput(e.target.value)}
                        className={`w-full font-mono text-xs pr-10 ${inputClass}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showOpenaiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleTestOpenAI}
                      disabled={testingOpenai || !openaiKeyInput}
                      className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {testingOpenai ? <RefreshCw size={12} className="animate-spin" /> : <Key size={12} />}
                      <span>Verify Key</span>
                    </button>
                  </div>
                </div>

                {/* Built-in Semantic Engine */}
                <div className={`p-3.5 rounded-xl border ${dm ? "bg-gray-800/30 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle size={14} className="text-green-600" />
                    <span className={`text-xs font-bold ${heading}`}>Built-in Offline Semantic Engine</span>
                  </div>
                  <p className={`text-[11px] ${muted}`}>
                    Always operational with zero external API dependency. Performs semantic intent extraction across 6 categories (medical illness, emergency, family functions, commute, parental awareness, and permission denial).
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: VOICE SYNTHESIS (TTS) */}
            {activeSettingsTab === "tts" && (
              <div className="space-y-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${muted}`}>Active Text-to-Speech Voice</label>
                  <select
                    value={activeTtsProvider}
                    onChange={(e) => setActiveTtsProvider(e.target.value)}
                    className={`w-full text-xs font-medium ${inputClass}`}
                  >
                    <option value="vobiz_native">Vobiz Native Indian English (en-IN Woman, carrier synthesis, 0ms latency)</option>
                    <option value="sarvam_bulbul">Sarvam Bulbul Indic TTS (Natural Indian accents &amp; Indic dialects)</option>
                    <option value="cartesia">Cartesia Sonic (Sub-100ms ultra-realistic conversational voice)</option>
                    <option value="elevenlabs">ElevenLabs Multilingual (Studio-quality emotive voice)</option>
                  </select>
                </div>

                {/* Sarvam Bulbul Speaker & Persona Card */}
                <div className={`p-4 rounded-xl border ${dm ? "bg-gray-800/40 border-gray-700" : "bg-orange-50/40 border-orange-100"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Volume2 size={16} className="text-orange-600" />
                      <span className={`text-xs font-bold ${heading}`}>Sarvam AI Bulbul (Indic Voice Personas)</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Native Indian</span>
                  </div>
                  <p className={`text-[11px] mb-3 ${muted}`}>
                    Select natural Indian voice personas and adjust speaking speed for realistic college outbound calling.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-[11px] font-medium mb-1 ${muted}`}>Voice Persona / Speaker</label>
                      <select
                        value={sarvamSpeakerInput}
                        onChange={(e) => setSarvamSpeakerInput(e.target.value)}
                        className={`w-full text-xs ${inputClass}`}
                      >
                        <option value="meera">Meera (Female - Natural Indian English / Hindi, warm tone)</option>
                        <option value="pavithra">Pavithra (Female - Professional South Indian English accent)</option>
                        <option value="arvind">Arvind (Male - North Indian / English, authoritative officer)</option>
                        <option value="amartya">Amartya (Male - Clear diction, expressive college registrar)</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-[11px] font-medium mb-1 ${muted}`}>Speaking Pace / Speed</label>
                      <select
                        value={sarvamPaceInput}
                        onChange={(e) => setSarvamPaceInput(e.target.value)}
                        className={`w-full text-xs ${inputClass}`}
                      >
                        <option value="0.85">0.85x (Deliberate &amp; Calm - Best for elderly parents)</option>
                        <option value="1.0">1.0x (Normal Pace - Recommended default)</option>
                        <option value="1.15">1.15x (Brisk &amp; Prompt - Quick calls)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Cartesia Card */}
                <div className={`p-4 rounded-xl border ${dm ? "bg-gray-800/40 border-gray-700" : "bg-rose-50/40 border-rose-100"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Volume2 size={16} className="text-rose-600" />
                      <span className={`text-xs font-bold ${heading}`}>Cartesia AI (Sonic TTS &amp; Voice Cloning)</span>
                    </div>
                    {telephonyConfig?.cartesia_configured ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Optional</span>
                    )}
                  </div>
                  <p className={`text-[11px] mb-3 ${muted}`}>
                    State-of-the-art sub-100ms real-time conversational voice synthesis and voice cloning.
                  </p>

                  {cartesiaStatusMsg && (
                    <div className={`p-2 rounded-lg border mb-3 text-xs ${
                      cartesiaStatusMsg.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
                    }`}>
                      {cartesiaStatusMsg.text}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className={`block text-[11px] font-medium mb-1 ${muted}`}>Cartesia API Key</label>
                      <div className="relative">
                        <input
                          type={showCartesiaKey ? "text" : "password"}
                          placeholder={telephonyConfig?.cartesia_api_key_masked || "Enter Cartesia API Key"}
                          value={cartesiaKeyInput}
                          onChange={(e) => setCartesiaKeyInput(e.target.value)}
                          className={`w-full font-mono text-xs pr-10 ${inputClass}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCartesiaKey(!showCartesiaKey)}
                          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                          {showCartesiaKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className={`block text-[11px] font-medium mb-1 ${muted}`}>Cloned Voice ID (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. 79a125e8-cd45-4c13-8a67-188112f4dd22"
                        value={cartesiaVoiceIdInput}
                        onChange={(e) => setCartesiaVoiceIdInput(e.target.value)}
                        className={`w-full font-mono text-xs ${inputClass}`}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleTestCartesia}
                      disabled={testingCartesia || !cartesiaKeyInput}
                      className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {testingCartesia ? <RefreshCw size={12} className="animate-spin" /> : <Key size={12} />}
                      <span>Verify Key</span>
                    </button>
                  </div>
                </div>

                {/* ElevenLabs Card */}
                <div className={`p-4 rounded-xl border ${dm ? "bg-gray-800/40 border-gray-700" : "bg-cyan-50/40 border-cyan-100"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Volume2 size={16} className="text-cyan-600" />
                      <span className={`text-xs font-bold ${heading}`}>ElevenLabs (Studio Voice &amp; Custom Cloned Voice)</span>
                    </div>
                    {telephonyConfig?.elevenlabs_configured ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Optional</span>
                    )}
                  </div>
                  <p className={`text-[11px] mb-3 ${muted}`}>
                    Ultra-natural human speech synthesis with voice cloning for college officials, HODs, or counselors.
                  </p>

                  {elevenlabsStatusMsg && (
                    <div className={`p-2 rounded-lg border mb-3 text-xs ${
                      elevenlabsStatusMsg.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
                    }`}>
                      {elevenlabsStatusMsg.text}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className={`block text-[11px] font-medium mb-1 ${muted}`}>ElevenLabs API Key</label>
                      <div className="relative">
                        <input
                          type={showElevenlabsKey ? "text" : "password"}
                          placeholder={telephonyConfig?.elevenlabs_api_key_masked || "Enter ElevenLabs API Key"}
                          value={elevenlabsKeyInput}
                          onChange={(e) => setElevenlabsKeyInput(e.target.value)}
                          className={`w-full font-mono text-xs pr-10 ${inputClass}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowElevenlabsKey(!showElevenlabsKey)}
                          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                          {showElevenlabsKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className={`block text-[11px] font-medium mb-1 ${muted}`}>Voice / Cloned Voice ID</label>
                      <div className="flex gap-1.5">
                        <select
                          value={["Rachel", "Adam", "Bella", "Antoni", "Nicole", "George", "Brian"].includes(elevenlabsVoiceIdInput) ? elevenlabsVoiceIdInput : "custom"}
                          onChange={(e) => {
                            if (e.target.value !== "custom") setElevenlabsVoiceIdInput(e.target.value);
                          }}
                          className={`text-xs ${inputClass}`}
                        >
                          <option value="Rachel">Rachel (Calm &amp; Professional Female)</option>
                          <option value="Adam">Adam (Deep &amp; Authoritative Male)</option>
                          <option value="Bella">Bella (Soft &amp; Empathetic Female)</option>
                          <option value="Antoni">Antoni (Clear &amp; Articulate Male)</option>
                          <option value="Nicole">Nicole (Friendly Counselor Female)</option>
                          <option value="George">George (Warm British Male)</option>
                          <option value="Brian">Brian (Deep Narrative Male)</option>
                          <option value="custom">Custom Cloned Voice ID</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Custom Voice ID"
                          value={elevenlabsVoiceIdInput}
                          onChange={(e) => setElevenlabsVoiceIdInput(e.target.value)}
                          className={`flex-1 font-mono text-xs ${inputClass}`}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleTestElevenLabs}
                      disabled={testingElevenlabs || !elevenlabsKeyInput}
                      className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {testingElevenlabs ? <RefreshCw size={12} className="animate-spin" /> : <Key size={12} />}
                      <span>Verify Key</span>
                    </button>
                  </div>
                </div>

                {/* Voice Cloning Info Banner */}
                <div className={`p-3.5 rounded-xl border ${dm ? "bg-gray-800/30 border-gray-700" : "bg-purple-50/50 border-purple-200"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Bot size={14} className="text-purple-600" />
                    <span className={`text-xs font-bold ${heading}`}>Voice Cloning &amp; Personas Guide</span>
                  </div>
                  <p className={`text-[11px] ${muted} leading-relaxed`}>
                    • <strong>Sarvam AI Bulbul</strong>: Pre-trained Indian voices (<strong>Meera</strong>, <strong>Pavithra</strong>, <strong>Arvind</strong>, <strong>Amartya</strong>) across English, Hindi, Telugu, Tamil, and Kannada.<br />
                    • <strong>Cartesia Sonic</strong>: Clone any voice via Cartesia Voice Designer and paste the generated Voice ID.<br />
                    • <strong>ElevenLabs</strong>: Clone institutional staff, HOD, or principal voices via ElevenLabs VoiceLab and paste the Cloned Voice ID.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 5: TEST CALL BENCH */}
            {activeSettingsTab === "testcall" && (
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border ${dm ? "bg-gray-800/40 border-gray-700" : "bg-indigo-50/50 border-indigo-100"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <PhoneForwarded size={16} className="text-indigo-600" />
                    <span className={`text-sm font-bold ${heading}`}>Make an Immediate Outbound Test Call</span>
                  </div>
                  <p className={`text-xs mb-3 ${muted}`}>
                    Enter your mobile number below to test the active telephony carrier and voice prompt in real time. Your phone will ring and the Voice AI agent will greet you and record the entire conversation.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="+917569254406"
                      value={testPhoneInput}
                      onChange={(e) => setTestPhoneInput(e.target.value)}
                      className={`flex-1 font-mono text-xs ${inputClass}`}
                    />
                    <button
                      type="button"
                      onClick={handleDispatchTestCall}
                      disabled={dispatchingTestCall || !testPhoneInput}
                      className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 whitespace-nowrap shadow-md shadow-indigo-600/20"
                    >
                      {dispatchingTestCall ? <RefreshCw size={13} className="animate-spin" /> : <PhoneCall size={13} />}
                      <span>{dispatchingTestCall ? "Calling..." : "Call My Phone"}</span>
                    </button>
                  </div>
                </div>

                {/* Latest Test Call Audio Player Widget */}
                {lastTestCall && lastTestCall.audio_url && (
                  <div className={`p-4 rounded-xl border transition-all ${dm ? "bg-indigo-950/20 border-indigo-800" : "bg-indigo-50/70 border-indigo-200"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-indigo-600 text-white">
                          Test Call Audio Recording
                        </span>
                        <span className={`text-xs font-mono ${muted}`}>Phone: {lastTestCall.phone}</span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-500">UUID: {lastTestCall.call_uuid ? `${lastTestCall.call_uuid.slice(0, 12)}...` : "Active"}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      <button
                        type="button"
                        onClick={() => handleToggleTestAudio(lastTestCall.audio_url!)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md transition-all ${
                          playingTestAudio
                            ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25"
                        }`}
                      >
                        {playingTestAudio ? <Pause size={14} /> : <Play size={14} />}
                        <span>{playingTestAudio ? "Pause Recording" : "Play Test Call Voice Audio"}</span>
                      </button>

                      {onNavigate && (
                        <button
                          type="button"
                          onClick={() => {
                            setTelephonyModal(false);
                            onNavigate("recordings");
                          }}
                          className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"
                        >
                          <Headphones size={13} />
                          <span>View in Call Recordings</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className={`p-3 rounded-lg border text-[11px] ${dm ? "bg-gray-800/20 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                  <span className="font-bold">Carrier Notice:</span> All calls are recorded with bi-directional audio capture. When you hang up, the recording is saved and playable both here and on the Call Recordings page.
                </div>
              </div>
            )}

            {/* Modal Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-4 mt-5 border-t dark:border-gray-800">
              <span className={`text-[11px] ${muted}`}>
                Active: <span className="font-semibold text-gray-700 dark:text-gray-300">{activeSttProvider.toUpperCase()} STT</span> &middot; <span className="font-semibold text-gray-700 dark:text-gray-300">{activeLlmProvider.toUpperCase()} LLM</span>
              </span>

              <div className="flex gap-2">
                <button onClick={() => setTelephonyModal(false)} className="btn-secondary text-xs py-2 px-3.5">
                  Cancel
                </button>
                <button
                  onClick={handleSaveTelephonyConfig}
                  disabled={savingConfig}
                  className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                >
                  {savingConfig ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>{savingConfig ? "Saving..." : "Save All Settings"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Evidence Modal */}
      {detailModal && selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`w-full max-w-3xl rounded-2xl border shadow-2xl p-6 my-8 ${dm ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
            <div className="flex items-start justify-between border-b pb-4 mb-5 dark:border-gray-800">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`badge ${
                      selectedDetail.verification_status === "MATCHED"
                        ? "badge-success"
                        : selectedDetail.verification_status === "MISMATCHED"
                        ? "badge-danger"
                        : "badge-warning"
                    }`}
                  >
                    {selectedDetail.verification_status}
                  </span>
                  <span className="text-xs text-gray-400">Verification #{selectedDetail.id}</span>
                </div>
                <h3 className={`text-xl font-bold mt-1 ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Verification Evidence: {selectedDetail.student_name}
                </h3>
                <p className={`text-xs ${muted}`}>
                  Class: {selectedDetail.class_name || "CSE-4A"} &middot; Roll: {selectedDetail.roll_number} &middot; Parent: {selectedDetail.parent_name}
                </p>
              </div>
              <button onClick={closeDetailModal} className={`p-1.5 rounded-lg ${dm ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}>
                <X size={18} />
              </button>
            </div>

            {/* AI Summary Banner */}
            <div className={`p-3.5 rounded-xl border mb-5 ${
              selectedDetail.verification_status === "MATCHED"
                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50 text-green-900 dark:text-green-200"
                : selectedDetail.verification_status === "MISMATCHED"
                ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 text-red-900 dark:text-red-200"
                : "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900/50 text-yellow-900 dark:text-yellow-200"
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <Bot size={16} />
                <span className="font-bold text-xs uppercase tracking-wider">AI Semantic Summary</span>
              </div>
              <p className="text-xs leading-relaxed">{selectedDetail.comparison_summary}</p>
            </div>

            {/* Audio Players & Transcripts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              {/* Student Call */}
              <div className={`p-4 rounded-xl border ${dm ? "bg-gray-800/40 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                <div className="flex items-center justify-between mb-2.5">
                  <span className={`text-xs font-bold ${heading}`}>Student Call Recording</span>
                  {selectedDetail.student_call?.audio_base64 && (
                    <button
                      onClick={() => playCallAudio("STUDENT", selectedDetail.student_call?.audio_base64)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 ${
                        playingAudio === "STUDENT" ? "bg-red-600 text-white" : "bg-indigo-600 text-white"
                      }`}
                    >
                      {playingAudio === "STUDENT" ? <Pause size={12} /> : <Play size={12} />}
                      <span>{playingAudio === "STUDENT" ? "Pause" : "Play Recording"}</span>
                    </button>
                  )}
                </div>
                <div className="text-[11px] text-gray-500 mb-2">
                  Status: <span className="font-semibold text-gray-700 dark:text-gray-300">{selectedDetail.student_call?.status || "PENDING"}</span> &middot;
                  Duration: {selectedDetail.student_call?.duration_seconds || 0}s &middot;
                  Phone: <span className="font-mono">{selectedDetail.student_phone || "+917569254406"}</span>
                </div>
                <div className={`p-3 rounded-lg text-xs leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto border ${
                  dm ? "bg-gray-900 border-gray-700 text-gray-300" : "bg-white border-gray-200 text-gray-700"
                }`}>
                  {selectedDetail.student_call?.transcript_text || "Dialing in progress..."}
                </div>
              </div>

              {/* Parent Call */}
              <div className={`p-4 rounded-xl border ${dm ? "bg-gray-800/40 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                <div className="flex items-center justify-between mb-2.5">
                  <span className={`text-xs font-bold ${heading}`}>Parent Call Recording</span>
                  {selectedDetail.parent_call?.audio_base64 && (
                    <button
                      onClick={() => playCallAudio("PARENT", selectedDetail.parent_call?.audio_base64)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 ${
                        playingAudio === "PARENT" ? "bg-red-600 text-white" : "bg-indigo-600 text-white"
                      }`}
                    >
                      {playingAudio === "PARENT" ? <Pause size={12} /> : <Play size={12} />}
                      <span>{playingAudio === "PARENT" ? "Pause" : "Play Recording"}</span>
                    </button>
                  )}
                </div>
                <div className="text-[11px] text-gray-500 mb-2">
                  Status: <span className="font-semibold text-gray-700 dark:text-gray-300">{selectedDetail.parent_call?.status || "PENDING"}</span> &middot;
                  Duration: {selectedDetail.parent_call?.duration_seconds || 0}s &middot;
                  Phone: <span className="font-mono">{selectedDetail.parent_phone || "+917569254406"}</span>
                </div>
                <div className={`p-3 rounded-lg text-xs leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto border ${
                  dm ? "bg-gray-900 border-gray-700 text-gray-300" : "bg-white border-gray-200 text-gray-700"
                }`}>
                  {selectedDetail.parent_call?.transcript_text || "Waiting for student call completion..."}
                </div>
              </div>
            </div>

            {/* Conflicting Statements Callout (if mismatch) */}
            {selectedDetail.conflicting_statements && selectedDetail.conflicting_statements.length > 0 && (
              <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 mb-5">
                <div className="flex items-center gap-2 mb-2 text-red-700 dark:text-red-300 font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle size={15} />
                  <span>Conflicting Statements Detected</span>
                </div>
                <ul className="list-disc pl-5 text-xs text-red-800 dark:text-red-200 space-y-1">
                  {selectedDetail.conflicting_statements.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t dark:border-gray-800">
              <span className={`text-xs ${muted}`}>
                Consistency Match Score:{" "}
                <span className="font-bold text-gray-900 dark:text-white">
                  {selectedDetail.consistency_score ? `${(selectedDetail.consistency_score * 100).toFixed(0)}%` : "N/A"}
                </span>
              </span>
              <button onClick={closeDetailModal} className="btn-secondary text-xs py-1.5 px-4">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ask Student AI Assistant Modal */}
      <AskStudentAIModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        darkMode={darkMode}
        initialStudentId={aiModalStudentId}
      />
    </div>
  );
}
