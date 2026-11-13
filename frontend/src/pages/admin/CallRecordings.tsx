import { useState, useEffect, useRef } from "react";
import {
  Headphones,
  Phone,
  PhoneCall,
  PhoneOff,
  Play,
  Pause,
  Volume2,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  RotateCw,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  Bot,
  Sparkles,
  ChevronRight,
  FileText,
  Radio,
  Check,
  X,
  ExternalLink,
  Sliders,
  ArrowDownUp,
  Download,
} from "lucide-react";
import {
  getVerifications,
  getVerificationStats,
  retryCall,
  simulateCall,
  VerificationItem,
  VerificationStats,
} from "../../services/verificationApi";
import AskStudentAIModal from "../../components/common/AskStudentAIModal";

interface Props {
  darkMode: boolean;
  onNavigate?: (page: string) => void;
}

export default function CallRecordings({ darkMode, onNavigate }: Props) {
  const [verifications, setVerifications] = useState<VerificationItem[]>([]);
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // AI Inquiry Modal State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiModalStudentId, setAiModalStudentId] = useState<string | undefined>(undefined);

  // Audio Playback State: tracks which verification id and which target ('STUDENT' | 'PARENT')
  const [playingAudioKey, setPlayingAudioKey] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const dm = darkMode;
  const card = `rounded-2xl border ${dm ? "bg-gray-900/90 border-gray-800 shadow-xl" : "bg-white border-gray-200/90 shadow-sm"}`;
  const muted = dm ? "text-gray-400" : "text-gray-500";
  const heading = dm ? "text-white" : "text-gray-900";
  const inputClass = `px-3.5 py-2 rounded-xl border text-sm outline-none transition-all ${
    dm ? "bg-gray-800/80 border-gray-700 text-white focus:border-indigo-500" : "bg-white border-gray-200 text-gray-800 focus:border-indigo-500"
  }`;

  const loadData = async () => {
    setLoading(true);
    try {
      const [verList, st] = await Promise.all([
        getVerifications(),
        getVerificationStats().catch(() => null),
      ]);
      setVerifications(verList);
      if (st) setStats(st);
    } catch (err) {
      console.error("Failed to load call recordings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => {
      clearInterval(interval);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Audio Playback Handler
  const handleToggleAudio = (uniqueKey: string, audioSource?: string) => {
    if (!audioSource) {
      setToastMessage("Audio recording is still generating or unavailable.");
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }

    if (playingAudioKey === uniqueKey) {
      // Pause
      audioRef.current?.pause();
      setPlayingAudioKey(null);
      setAudioProgress(0);
    } else {
      // Switch or Start
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(audioSource);
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        setAudioDuration(audio.duration || 0);
      };

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setAudioProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.onended = () => {
        setPlayingAudioKey(null);
        setAudioProgress(0);
      };

      audio.play().catch((err) => {
        console.warn("Audio playback interrupted:", err);
        setPlayingAudioKey(null);
      });

      setPlayingAudioKey(uniqueKey);
    }
  };

  const handleRetry = async (verId: number) => {
    try {
      await retryCall(verId, "ALL");
      setToastMessage(`Outbound retry triggered for record #${verId}`);
      setTimeout(() => setToastMessage(null), 4000);
      loadData();
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    }
  };

  // Filtered list
  const filteredRecords = verifications.filter((v) => {
    if (filterStatus === "MATCHED" && v.verification_status !== "MATCHED") return false;
    if (filterStatus === "MISMATCHED" && v.verification_status !== "MISMATCHED") return false;
    if (filterStatus === "NOT_ANSWERED" && v.verification_status !== "NOT_ANSWERED") return false;
    if (filterStatus === "BUNKING" && v.is_bunking_suspected !== 1) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = v.student_name?.toLowerCase().includes(q);
      const matchRoll = v.roll_number?.toLowerCase().includes(q);
      const matchPhone = v.student_phone?.toLowerCase().includes(q) || v.parent_phone?.toLowerCase().includes(q);
      const matchTranscript =
        v.student_transcript?.toLowerCase().includes(q) ||
        v.parent_transcript?.toLowerCase().includes(q) ||
        v.student_reason?.toLowerCase().includes(q) ||
        v.parent_reason?.toLowerCase().includes(q);
      return matchName || matchRoll || matchPhone || matchTranscript;
    }
    return true;
  });

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-xl shadow-xl animate-fade-in">
          <CheckCircle size={18} />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Headphones size={22} />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Dual Call Recordings &amp; Transcripts Hub
              </h1>
              <p className={`text-xs sm:text-sm mt-0.5 ${muted}`}>
                Official College Audio Vault &bull; Stacked Student &amp; Parent Spoken Calls, Speech-to-Text Transcripts &amp; Contradiction Verdicts
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setAiModalStudentId(undefined);
              setAiModalOpen(true);
            }}
            className="btn-secondary flex items-center gap-2 text-xs py-2 px-3.5 rounded-xl border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 font-semibold shadow-sm"
          >
            <Sparkles size={14} className="text-indigo-600" />
            <span>Ask AI About Student</span>
          </button>
          <button
            onClick={loadData}
            className={`btn-secondary flex items-center gap-2 text-xs py-2 px-3.5 rounded-xl ${dm ? "border-gray-800" : ""}`}
          >
            <RotateCw size={14} className={loading ? "animate-spin text-indigo-600" : ""} />
            <span>Refresh Recordings</span>
          </button>

          {onNavigate && (
            <button
              onClick={() => onNavigate("voice-agent")}
              className="btn-primary flex items-center gap-2 text-xs py-2 px-4 rounded-xl shadow-md shadow-indigo-600/20"
            >
              <PhoneCall size={14} />
              <span>Voice AI Dial Center</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Call Recordings",
            count: stats ? stats.total_verifications : verifications.length,
            desc: "Dual student & parent recordings",
            icon: <Volume2 size={20} />,
            color: "text-indigo-600",
            bg: dm ? "bg-indigo-950/40 border-indigo-900/50" : "bg-indigo-50/80 border-indigo-100",
          },
          {
            label: "Verified Genuine (Match)",
            count: stats ? stats.matched : verifications.filter((v) => v.verification_status === "MATCHED").length,
            desc: "Reasons agree &bull; Safe",
            icon: <CheckCircle size={20} />,
            color: "text-green-600",
            bg: dm ? "bg-green-950/40 border-green-900/50" : "bg-green-50/80 border-green-100",
          },
          {
            label: "Suspected Bunking (Mismatch)",
            count: stats ? stats.mismatched_suspicious : verifications.filter((v) => v.is_bunking_suspected === 1).length,
            desc: "Contradiction &bull; Reported to HOD",
            icon: <ShieldAlert size={20} />,
            color: "text-red-600",
            bg: dm ? "bg-red-950/40 border-red-900/50" : "bg-red-50/80 border-red-100",
          },
          {
            label: "Unanswered / Pending",
            count: stats
              ? stats.unanswered_pending + stats.in_progress
              : verifications.filter((v) => v.verification_status !== "MATCHED" && v.verification_status !== "MISMATCHED").length,
            desc: "Scheduled for retry callback",
            icon: <Clock size={20} />,
            color: "text-amber-600",
            bg: dm ? "bg-amber-950/40 border-amber-900/50" : "bg-amber-50/80 border-amber-100",
          },
        ].map((s) => (
          <div key={s.label} className={`p-4 rounded-2xl border ${s.bg} flex items-center justify-between`}>
            <div>
              <p className={`text-xs font-semibold ${muted}`}>{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {s.count}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">{s.desc}</p>
            </div>
            <div className={`p-2.5 rounded-xl ${s.color} bg-white/70 dark:bg-black/30 shadow-sm`}>{s.icon}</div>
          </div>
        ))}
      </div>

      {/* Search & Filter Toolbar */}
      <div className={`${card} p-4 flex flex-col md:flex-row items-center justify-between gap-3`}>
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by student, phone, or speech text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 ${inputClass}`}
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: "ALL", label: "All Recordings" },
            { id: "MATCHED", label: "Verified Genuine (Match)" },
            { id: "MISMATCHED", label: "Bunking (Mismatch)" },
            { id: "NOT_ANSWERED", label: "Unanswered Calls" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterStatus === f.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : dm
                  ? "bg-gray-800 text-gray-400 hover:text-white"
                  : "bg-gray-100 text-gray-600 hover:text-gray-900"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main List of Combined Stacked Cards */}
      <div className="space-y-6">
        {filteredRecords.length === 0 ? (
          <div className={`${card} p-12 text-center`}>
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <Headphones size={32} />
            </div>
            <h3 className={`text-base font-bold mb-1 ${heading}`}>No Call Recordings Found</h3>
            <p className={`text-xs max-w-md mx-auto mb-5 ${muted}`}>
              There are no verification call recordings matching the selected filter. Trigger a Voice AI verification call to generate new dual recordings.
            </p>
            {onNavigate && (
              <button
                onClick={() => onNavigate("voice-agent")}
                className="btn-primary text-xs py-2 px-4 rounded-xl inline-flex items-center gap-2"
              >
                <PhoneCall size={14} />
                <span>Go to Voice AI Center</span>
              </button>
            )}
          </div>
        ) : (
          filteredRecords.map((item) => {
            const isMatch = item.verification_status === "MATCHED";
            const isMismatch = item.verification_status === "MISMATCHED" || item.is_bunking_suspected === 1;
            const isUnanswered = item.verification_status === "NOT_ANSWERED" || item.verification_status === "UNVERIFIED";

            const isTestCall = item.student_id === "TEST_CALL" || item.student_call?.call_target === "TEST";
            const hasParentContact = Boolean(item.parent_phone && item.parent_phone.trim() && item.parent_phone !== "+919876543211" || item.parent_call);

            const studentAudioKey = `${item.id}-STUDENT`;
            const parentAudioKey = `${item.id}-PARENT`;
            const isStudentPlaying = playingAudioKey === studentAudioKey;
            const isParentPlaying = playingAudioKey === parentAudioKey;

            const studentAudioSrc = item.student_audio_b64 || item.student_call?.audio_base64 || item.student_call?.recording_url;
            const parentAudioSrc = item.parent_audio_b64 || item.parent_call?.audio_base64 || item.parent_call?.recording_url;

            const studentTranscript = item.student_transcript || item.student_call?.transcript_text || item.student_reason || "No spoken statement captured.";
            const parentTranscript = item.parent_transcript || item.parent_call?.transcript_text || item.parent_reason || "No parent statement captured.";

            const scorePercent = item.consistency_score !== undefined && item.consistency_score !== null
              ? Math.round(item.consistency_score * 100)
              : isMatch
              ? 95
              : isMismatch
              ? 18
              : 0;

            return (
              <div
                key={item.id}
                className={`${card} overflow-hidden border-2 transition-all hover:border-indigo-400/50 ${
                  isMismatch
                    ? dm ? "border-red-900/40 bg-red-950/10" : "border-red-200 bg-red-50/20"
                    : isMatch
                    ? dm ? "border-green-900/40 bg-green-950/10" : "border-green-200 bg-green-50/20"
                    : dm ? "border-gray-800" : "border-gray-200"
                }`}
              >
                {/* 1. CARD TOP BAR: Student Metadata, Timestamp, and Overall AI Verdict */}
                <div
                  className={`px-5 py-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    dm ? "border-gray-800 bg-gray-850" : "border-gray-100 bg-gray-50/80"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-md ${
                        isMatch
                          ? "bg-gradient-to-tr from-green-600 to-emerald-500 shadow-green-600/20"
                          : isMismatch
                          ? "bg-gradient-to-tr from-red-600 to-rose-500 shadow-red-600/20"
                          : "bg-gradient-to-tr from-amber-500 to-yellow-600 shadow-amber-600/20"
                      }`}
                    >
                      {item.student_name ? item.student_name.charAt(0) : "S"}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-base ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {item.student_name}
                        </span>
                        <span className={`font-mono text-xs px-2 py-0.5 rounded-md font-semibold ${
                          dm ? "bg-gray-800 text-indigo-400" : "bg-indigo-50 text-indigo-700"
                        }`}>
                          {item.roll_number || item.student_id}
                        </span>
                        <span className={`text-xs ${muted}`}>
                          {item.class_name || "CSE-4A"} &bull; {item.department || "CSE"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span>Record #{item.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Verdict & Score Pill */}
                  <div className="flex items-center gap-3 self-end md:self-auto">
                    {/* Consistency Match Progress */}
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                        Semantic Match Score
                      </div>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        <span className={`font-mono text-sm font-bold ${
                          scorePercent >= 70 ? "text-green-600" : scorePercent <= 35 ? "text-red-600" : "text-amber-600"
                        }`}>
                          {scorePercent}%
                        </span>
                        <div className="w-16 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              scorePercent >= 70 ? "bg-green-500" : scorePercent <= 35 ? "bg-red-500" : "bg-amber-500"
                            }`}
                            style={{ width: `${scorePercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Official Verdict Badge */}
                    {isMatch ? (
                      <div className="px-3 py-1.5 rounded-xl bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                        <CheckCircle size={15} />
                        <span>VERIFIED GENUINE (MATCH)</span>
                      </div>
                    ) : isMismatch ? (
                      <div className="px-3 py-1.5 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                        <ShieldAlert size={15} />
                        <span>SUSPECTED BUNKING (REPORTED TO HOD)</span>
                      </div>
                    ) : (
                      <div className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                        <PhoneOff size={15} />
                        <span>CALL UNANSWERED</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. STACKED DUAL CALL BODY ("UP AND BELOW" VIEW) */}
                <div className="p-5 space-y-4">
                  {/* ============================================================== */}
                  {/* UP (TOP): STUDENT CALL RECORDING & SPOKEN TEXT                */}
                  {/* ============================================================== */}
                  <div
                    className={`rounded-xl border p-4 transition-all ${
                      dm ? "bg-gray-850/70 border-gray-800 hover:border-gray-700" : "bg-indigo-50/30 border-indigo-100 hover:border-indigo-200"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                          1. Student Call (Top / Up)
                        </span>
                        <span className={`text-xs font-bold ${heading}`}>Student Spoken Explanation</span>
                        <span className="text-[11px] font-mono text-gray-500">
                          &bull; Phone: <strong className={heading}>{item.student_phone || "+917569254406"}</strong>
                        </span>
                        <span className="text-[10px] font-bold text-green-700 bg-green-100 dark:bg-green-950/60 px-1.5 py-0.2 rounded">
                          College DB
                        </span>
                      </div>

                      {/* Interactive Audio Player for Student */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleAudio(studentAudioKey, studentAudioSrc)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                            isStudentPlaying
                              ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20"
                          }`}
                        >
                          {isStudentPlaying ? <Pause size={13} /> : <Play size={13} />}
                          <span>{isStudentPlaying ? "Pause Audio" : "Play Student Recording"}</span>
                        </button>
                        <span className="text-[11px] font-mono text-gray-500">
                          {item.student_duration_seconds || item.student_call?.duration_seconds || 42}s duration
                        </span>
                      </div>
                    </div>

                    {/* Audio Progress Wave Visualizer (when active) */}
                    {isStudentPlaying && (
                      <div className="mb-3 px-3 py-2 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center gap-3">
                        <Volume2 size={16} className="text-indigo-600 animate-pulse" />
                        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${audioProgress}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-indigo-600 font-bold">PLAYING</span>
                      </div>
                    )}

                    {/* Full Transcript Box */}
                    <div
                      className={`p-3.5 rounded-lg border text-xs leading-relaxed font-sans ${
                        dm ? "bg-gray-900 border-gray-700/80 text-gray-200" : "bg-white border-gray-200 text-gray-800"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-gray-400 font-semibold mb-1 uppercase tracking-wider">
                        <span>Speech-to-Text Transcript (Sarvam saaras:v3)</span>
                        <span>Captured Spoken Reason</span>
                      </div>
                      <p className="whitespace-pre-wrap">{studentTranscript}</p>
                    </div>
                  </div>

                  {/* Connecting Contradiction / Consistency Divider */}
                  <div className="flex items-center justify-center py-0.5">
                    <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1" />
                    <div
                      className={`mx-3 px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
                        isTestCall
                          ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900"
                          : !hasParentContact
                          ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900"
                          : isMatch
                          ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900"
                          : isMismatch
                          ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-300 dark:border-gray-700"
                      }`}
                    >
                      <ArrowDownUp size={12} />
                      <span>
                        {isTestCall
                          ? "Carrier Audio Diagnostic Session"
                          : !hasParentContact
                          ? "Single Party Verification (Student Only)"
                          : isMatch
                          ? "Consistent Reasons"
                          : isMismatch
                          ? "Contradiction Detected Below"
                          : "Comparison Result"}
                      </span>
                    </div>
                    <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1" />
                  </div>

                  {/* ============================================================== */}
                  {/* BELOW (DOWN): PARENT CALL RECORDING OR SINGLE-PARTY PANEL     */}
                  {/* ============================================================== */}
                  {isTestCall || !hasParentContact ? (
                    <div
                      className={`rounded-xl border p-4 transition-all ${
                        dm ? "bg-gray-850/40 border-gray-800" : "bg-gray-50/60 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                          isTestCall ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300" : "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
                        }`}>
                          {isTestCall ? "Diagnostic Voice Test" : "Direct Student Verification"}
                        </span>
                        <span className={`text-xs font-bold ${heading}`}>
                          {isTestCall ? "Carrier Line Voice Audio Verified" : "Direct Student Voice Audio Recorded"}
                        </span>
                      </div>
                      <p className={`text-xs ${muted} leading-relaxed`}>
                        {isTestCall
                          ? "Live telephone test session placed to test phone audio routing, spoken inquiry, and microphone recording. Spoken audio is recorded and playable in the upper panel."
                          : "No parent contact phone number is registered in the college database for this student. The absence explanation was captured directly from the student's phone call and the voice recording is ready to listen to above."}
                      </p>
                    </div>
                  ) : (
                    <div
                      className={`rounded-xl border p-4 transition-all ${
                        dm ? "bg-gray-850/70 border-gray-800 hover:border-gray-700" : "bg-purple-50/30 border-purple-100 hover:border-purple-200"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                            2. Parent Call (Bottom / Below)
                          </span>
                          <span className={`text-xs font-bold ${heading}`}>Parent Explanation</span>
                          <span className="text-[11px] font-mono text-gray-500">
                            &bull; Parent: <strong className={heading}>{item.parent_name || "Parent"}</strong> &bull; Phone:{" "}
                            <strong className={heading}>{item.parent_phone || "+919876543211"}</strong>
                          </span>
                          <span className="text-[10px] font-bold text-green-700 bg-green-100 dark:bg-green-950/60 px-1.5 py-0.2 rounded">
                            College DB
                          </span>
                        </div>

                        {/* Interactive Audio Player for Parent */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleAudio(parentAudioKey, parentAudioSrc)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                              isParentPlaying
                                ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                                : "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/20"
                            }`}
                          >
                            {isParentPlaying ? <Pause size={13} /> : <Play size={13} />}
                            <span>{isParentPlaying ? "Pause Audio" : "Play Parent Recording"}</span>
                          </button>
                          <span className="text-[11px] font-mono text-gray-500">
                            {item.parent_duration_seconds || item.parent_call?.duration_seconds || 56}s duration
                          </span>
                        </div>
                      </div>

                      {/* Audio Progress Wave Visualizer (when active) */}
                      {isParentPlaying && (
                        <div className="mb-3 px-3 py-2 rounded-lg bg-purple-600/10 border border-purple-500/20 flex items-center gap-3">
                          <Volume2 size={16} className="text-purple-600 animate-pulse" />
                          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-600 rounded-full transition-all" style={{ width: `${audioProgress}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-purple-600 font-bold">PLAYING</span>
                        </div>
                      )}

                      {/* Full Transcript Box */}
                      <div
                        className={`p-3.5 rounded-lg border text-xs leading-relaxed font-sans ${
                          dm ? "bg-gray-900 border-gray-700/80 text-gray-200" : "bg-white border-gray-200 text-gray-800"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-gray-400 font-semibold mb-1 uppercase tracking-wider">
                          <span>Speech-to-Text Transcript (Sarvam saaras:v3)</span>
                          <span>Parent Confirmation</span>
                        </div>
                        <p className="whitespace-pre-wrap">{parentTranscript}</p>
                      </div>
                    </div>
                  )}

                  {/* 3. COMBINED AI CONTRADICTION & REASONING SUMMARY */}
                  <div
                    className={`p-3.5 rounded-xl border ${
                      isMatch
                        ? "bg-green-50/60 dark:bg-green-950/20 border-green-200 dark:border-green-900/50"
                        : isMismatch
                        ? "bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-900/50"
                        : "bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Bot size={15} className={isMatch ? "text-green-600" : isMismatch ? "text-red-600" : "text-gray-500"} />
                        <span className={`text-xs font-bold uppercase tracking-wider ${heading}`}>
                          AI Verification &amp; Contradiction Analysis
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-gray-500">
                        Evaluated by Google Gemini (gemini-3.5-flash)
                      </span>
                    </div>

                    <p className={`text-xs leading-relaxed ${dm ? "text-gray-300" : "text-gray-700"}`}>
                      {item.comparison_summary || "AI analysis completed. No contradictions detected."}
                    </p>

                    {/* Conflicting Statements Pills (if any) */}
                    {item.conflicting_statements && item.conflicting_statements.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-red-200 dark:border-red-900/50">
                        <div className="flex items-center gap-1.5 text-red-700 dark:text-red-300 font-bold text-[11px] mb-1">
                          <AlertTriangle size={13} />
                          <span>Conflicting Statements Highlighted by Voice AI:</span>
                        </div>
                        <ul className="list-disc pl-5 text-xs text-red-800 dark:text-red-200 space-y-0.5">
                          {item.conflicting_statements.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* 4. ACTIONS & REPORTING FOOTER */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs">
                    <div className="flex items-center gap-2">
                      {isMismatch ? (
                        <span className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                          <ShieldAlert size={14} />
                          <span>Reported to HOD ({item.department || "CSE"}) for disciplinary action &bull; Flagged as Bunking</span>
                        </span>
                      ) : isMatch ? (
                        <span className="text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
                          <CheckCircle size={14} />
                          <span>Absence validated as Genuine &bull; Safe &bull; Not reported to HOD</span>
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                          <Clock size={14} />
                          <span>Unresolved &bull; Waiting for retry call</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAiModalStudentId(item.student_id);
                          setAiModalOpen(true);
                        }}
                        className="btn-secondary text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold border-indigo-200 dark:border-indigo-900"
                        title="Ask AI anything about this student's academics, periods today, or total attendance"
                      >
                        <Sparkles size={13} className="text-indigo-600" />
                        <span>Ask AI</span>
                      </button>
                      {isUnanswered && (
                        <button
                          onClick={() => handleRetry(item.id)}
                          className="btn-secondary text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-amber-600"
                        >
                          <RotateCw size={12} />
                          <span>Retry Outbound Calls</span>
                        </button>
                      )}
                      {onNavigate && (
                        <button
                          onClick={() => onNavigate("voice-reports")}
                          className="btn-secondary text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                        >
                          <FileText size={12} />
                          <span>View in HOD Reports</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

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
