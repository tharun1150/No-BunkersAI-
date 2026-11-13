import { useState, useEffect } from "react";
import {
  Brain,
  Bot,
  Sparkles,
  Send,
  X,
  Calendar,
  Clock,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Volume2,
  Pause,
  Play,
  User,
  Phone,
  ShieldAlert,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  askStudentAI,
  getStudents,
  BackendStudent,
  StudentAIQueryResponse,
} from "../../services/studentApi";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  initialStudentId?: string;
}

export default function AskStudentAIModal({
  isOpen,
  onClose,
  darkMode,
  initialStudentId,
}: Props) {
  const [students, setStudents] = useState<BackendStudent[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId || "");
  const [questionInput, setQuestionInput] = useState<string>(
    "How many periods did he attend today and what is his total attendance percentage till today?"
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<StudentAIQueryResponse | null>(null);
  const [speaking, setSpeaking] = useState<boolean>(false);

  const dm = darkMode;
  const heading = dm ? "text-white" : "text-gray-900";
  const muted = dm ? "text-gray-400" : "text-gray-500";
  const inputClass = `px-3.5 py-2 rounded-xl border text-sm outline-none transition-all ${
    dm ? "bg-gray-800 border-gray-700 text-white focus:border-indigo-500" : "bg-white border-gray-200 text-gray-800 focus:border-indigo-500"
  }`;

  useEffect(() => {
    if (!isOpen) {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
      return;
    }

    getStudents().then((data) => {
      setStudents(data);
      if (!selectedStudentId && data.length > 0) {
        const defaultId = initialStudentId || data[0].student_id || data[0].roll_number || "";
        setSelectedStudentId(defaultId);
        handleAsk(defaultId, questionInput);
      } else if (selectedStudentId) {
        handleAsk(selectedStudentId, questionInput);
      }
    }).catch(console.error);
  }, [isOpen, initialStudentId]);

  const handleAsk = async (studentId: string, query: string) => {
    if (!studentId || !query.trim()) return;
    setLoading(true);
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    try {
      const res = await askStudentAI(studentId, query);
      setResult(res);
    } catch (err: any) {
      alert(`AI Inquiry Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeakToggle = () => {
    if (!result?.ai_answer) return;
    if (speaking) {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(result.ai_answer);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis?.speak(utterance);
      setSpeaking(true);
    }
  };

  const presetQuestions = [
    "How many periods did he attend today?",
    "What is his total attendance percentage till today?",
    "Which periods did he bunk or miss today?",
    "How many classes does he need to reach 75%?",
    "Give me his complete academic & subject breakdown.",
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className={`w-full max-w-3xl rounded-2xl border shadow-2xl p-6 my-8 ${
          dm ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
        } animate-fade-in`}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Bot size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-bold text-lg ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  AI Student Academic &amp; Attendance Intelligence
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                  Gemini 3.5 Flash Active
                </span>
              </div>
              <p className={`text-xs ${muted}`}>
                Live ground-truth RAG querying college database for today's periods, cumulative attendance, academics, and bunk alerts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg ${dm ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Student Selector & Query Bench */}
        <div className="space-y-4 my-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className={`block text-xs font-semibold mb-1.5 ${muted}`}>Select Target Student</label>
              <select
                value={selectedStudentId}
                onChange={(e) => {
                  setSelectedStudentId(e.target.value);
                  handleAsk(e.target.value, questionInput);
                }}
                className={`w-full ${inputClass}`}
              >
                {students.map((s) => (
                  <option key={s.id} value={s.student_id || s.roll_number}>
                    {s.name} ({s.roll_number || s.student_id}) &bull; {s.department || "CSE"}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={`block text-xs font-semibold mb-1.5 ${muted}`}>Inquiry / Question to AI</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. How many periods today? Total attendance till date?"
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAsk(selectedStudentId, questionInput);
                  }}
                  className={`flex-1 ${inputClass}`}
                />
                <button
                  type="button"
                  onClick={() => handleAsk(selectedStudentId, questionInput)}
                  disabled={loading}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 whitespace-nowrap shadow-md shadow-indigo-600/20"
                >
                  {loading ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>Ask AI</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick preset questions */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className={`text-[11px] font-bold ${muted} whitespace-nowrap flex items-center gap-1`}>
              <Sparkles size={12} className="text-indigo-600" /> Samples:
            </span>
            {presetQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuestionInput(q);
                  handleAsk(selectedStudentId, q);
                }}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium whitespace-nowrap transition-colors ${
                  dm ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700" : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-indigo-50"
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* AI Answer & Live Database Cards */}
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw size={28} className="animate-spin text-indigo-600 mx-auto mb-3" />
            <p className={`text-sm font-semibold ${heading}`}>Querying College Database &amp; Consulting Gemini 3.5 Flash...</p>
            <p className={`text-xs mt-1 ${muted}`}>Aggregating today's period schedule, cumulative attendance, and academic metrics</p>
          </div>
        ) : result ? (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* AI Answer Card */}
            <div className={`p-4 rounded-xl border ${
              dm ? "bg-indigo-950/20 border-indigo-900/50" : "bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-white border-indigo-100"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
                  <Bot size={16} />
                  <span>Google Gemini Live Response:</span>
                </div>
                <button
                  type="button"
                  onClick={handleSpeakToggle}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                    speaking ? "bg-red-600 text-white animate-pulse" : "btn-secondary text-indigo-600"
                  }`}
                >
                  {speaking ? <Pause size={12} /> : <Volume2 size={12} />}
                  <span>{speaking ? "Stop Speech" : "Listen to AI Answer"}</span>
                </button>
              </div>
              <p className={`text-xs leading-relaxed font-sans whitespace-pre-wrap ${heading}`}>
                {result.ai_answer}
              </p>
            </div>

            {/* Ground Truth Metric Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className={`p-3 rounded-xl border ${dm ? "bg-gray-800/40 border-gray-700" : "bg-indigo-50/50 border-indigo-100"}`}>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Today's Periods</span>
                <span className="text-xl font-bold text-indigo-600 font-mono mt-0.5 block">
                  {result.metrics.today_periods_attended} / {result.metrics.today_periods_total}
                </span>
                <span className="text-[10px] text-gray-500">
                  {result.metrics.today_periods_absent > 0 ? `Missed ${result.metrics.today_periods_absent} period(s)` : "100% Attended today"}
                </span>
              </div>

              <div className={`p-3 rounded-xl border ${dm ? "bg-gray-800/40 border-gray-700" : "bg-purple-50/50 border-purple-100"}`}>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Attendance Till Today</span>
                <span className={`text-xl font-bold font-mono mt-0.5 block ${
                  result.metrics.is_at_risk ? "text-red-600" : "text-green-600"
                }`}>
                  {result.metrics.attendance_percentage}%
                </span>
                <span className="text-[10px] text-gray-500">
                  {result.metrics.classes_attended} / {result.metrics.total_classes_till_date} classes
                </span>
              </div>

              <div className={`p-3 rounded-xl border ${dm ? "bg-gray-800/40 border-gray-700" : "bg-amber-50/50 border-amber-100"}`}>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">75% Criteria Standing</span>
                <span className={`text-xs font-bold mt-1 block ${
                  result.metrics.is_at_risk ? "text-red-600" : "text-green-600"
                }`}>
                  {result.metrics.is_at_risk ? "CRITICAL (BELOW 75%)" : "SAFE (ABOVE 75%)"}
                </span>
                <span className="text-[10px] text-gray-500">
                  {result.metrics.is_at_risk ? `Needs ${result.metrics.classes_needed_for_75} classes to safe` : "Eligible for exams"}
                </span>
              </div>

              <div className={`p-3 rounded-xl border ${dm ? "bg-gray-800/40 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Phone &amp; Parent</span>
                <span className="text-xs font-mono font-bold mt-1 block truncate">
                  {result.metrics.student_phone || "+917569254406"}
                </span>
                <span className="text-[10px] text-gray-500 truncate block">
                  Parent: {result.metrics.parent_name || "Parent"}
                </span>
              </div>
            </div>

            {/* Today's Period-by-Period Timetable */}
            <div className={`p-4 rounded-xl border ${dm ? "bg-gray-850 border-gray-800" : "bg-gray-50/60 border-gray-200"}`}>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Calendar size={14} className="text-indigo-600" />
                  <span className={heading}>Today's Period Timetable &amp; Live Presence:</span>
                </div>
                <span className="text-[11px] font-mono text-gray-500">{result.metrics.today_date}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {result.today_schedule.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      item.status === "Present"
                        ? "bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800"
                        : item.status === "Absent"
                        ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800"
                        : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800"
                    }`}
                  >
                    <span className="text-[10px] font-bold text-gray-500 block">{item.period.split(" ")[0]} {item.period.split(" ")[1] || ""}</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white block mt-0.5 truncate" title={item.subject}>
                      {item.subject}
                    </span>
                    <span className={`inline-block text-[10px] font-extrabold uppercase mt-1 px-1.5 py-0.2 rounded ${
                      item.status === "Present"
                        ? "text-green-700 bg-green-100 dark:bg-green-900"
                        : item.status === "Absent"
                        ? "text-red-700 bg-red-100 dark:bg-red-900"
                        : "text-amber-700 bg-amber-100 dark:bg-amber-900"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Subject-Wise Academic Breakdown */}
            <div className={`p-4 rounded-xl border ${dm ? "bg-gray-850 border-gray-800" : "bg-white border-gray-200"}`}>
              <div className="flex items-center gap-1.5 font-bold text-xs mb-2.5">
                <BookOpen size={14} className="text-indigo-600" />
                <span className={heading}>Subject-Wise Academic Attendance Breakdown:</span>
              </div>

              <div className="space-y-2">
                {result.subject_breakdown.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 border-b last:border-0 dark:border-gray-800">
                    <div>
                      <span className={`font-semibold ${heading}`}>{s.subject}</span>
                      <span className={`text-[11px] ${muted} ml-2`}>({s.faculty})</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs text-gray-500">
                        {s.attended}/{s.total} classes
                      </span>
                      <span className={`font-mono font-bold text-xs ${
                        s.percentage >= 75 ? "text-green-600" : "text-red-600"
                      }`}>
                        {s.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t dark:border-gray-800">
          <span className={`text-[11px] ${muted}`}>
            Connected to PostgreSQL &bull; Model: <strong className={heading}>gemini-3.5-flash</strong>
          </span>
          <button onClick={onClose} className="btn-secondary text-xs py-2 px-4 rounded-xl">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
