import { useState, useEffect } from "react";
import {
  ShieldAlert,
  PhoneCall,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Pause,
  Clock,
  User,
  Phone,
  FileText,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  X,
  Volume2,
  Check,
  Send,
  AlertOctagon,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  getHODIncidentReports,
  submitHODAction,
  HODIncidentItem,
} from "../../services/verificationApi";

interface Props {
  darkMode: boolean;
  departmentOverride?: string;
}

export default function VoiceReports({ darkMode, departmentOverride }: Props) {
  const [department, setDepartment] = useState(departmentOverride || "CSE");
  const [reports, setReports] = useState<HODIncidentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<HODIncidentItem | null>(null);
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING_REVIEW" | "CRITICAL" | "RESOLVED">("ALL");
  const [search, setSearch] = useState("");

  // Audio Playback state
  const [playingStudentAudio, setPlayingStudentAudio] = useState(false);
  const [playingParentAudio, setPlayingParentAudio] = useState(false);
  const [studentAudioObj, setStudentAudioObj] = useState<HTMLAudioElement | null>(null);
  const [parentAudioObj, setParentAudioObj] = useState<HTMLAudioElement | null>(null);

  // HOD Action state
  const [actionDecision, setActionDecision] = useState<"APPROVED" | "REJECTED" | "ESCALATED" | "DISMISSED">("APPROVED");
  const [actionRemarks, setActionRemarks] = useState("");
  const [reviewerName, setReviewerName] = useState("Dr. K. V. Sharma (HOD)");
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const dm = darkMode;
  const card = `rounded-xl border ${dm ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} shadow-sm`;
  const muted = dm ? "text-gray-400" : "text-gray-500";
  const heading = dm ? "text-white" : "text-gray-900";
  const inputClass = `px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${
    dm ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-700"
  }`;

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await getHODIncidentReports(department);
      setReports(data);
    } catch (err) {
      console.error("Failed to load HOD reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [department]);

  // Audio management
  const toggleStudentAudio = () => {
    if (!selectedReport) return;
    if (playingStudentAudio) {
      studentAudioObj?.pause();
      setPlayingStudentAudio(false);
    } else {
      if (playingParentAudio) {
        parentAudioObj?.pause();
        setPlayingParentAudio(false);
      }
      const audioSrc = selectedReport.student_audio_b64 || "";
      if (!audioSrc) return;
      const audio = new Audio(audioSrc);
      audio.onended = () => setPlayingStudentAudio(false);
      audio.play().catch(console.error);
      setStudentAudioObj(audio);
      setPlayingStudentAudio(true);
    }
  };

  const toggleParentAudio = () => {
    if (!selectedReport) return;
    if (playingParentAudio) {
      parentAudioObj?.pause();
      setPlayingParentAudio(false);
    } else {
      if (playingStudentAudio) {
        studentAudioObj?.pause();
        setPlayingStudentAudio(false);
      }
      const audioSrc = selectedReport.parent_audio_b64 || "";
      if (!audioSrc) return;
      const audio = new Audio(audioSrc);
      audio.onended = () => setPlayingParentAudio(false);
      audio.play().catch(console.error);
      setParentAudioObj(audio);
      setPlayingParentAudio(true);
    }
  };

  const closeModal = () => {
    studentAudioObj?.pause();
    parentAudioObj?.pause();
    setPlayingStudentAudio(false);
    setPlayingParentAudio(false);
    setSelectedReport(null);
  };

  const handleHODSubmit = async () => {
    if (!selectedReport) return;
    setSubmitting(true);
    try {
      const res = await submitHODAction(selectedReport.report_id, {
        decision: actionDecision,
        remarks: actionRemarks || `Reviewed and ${actionDecision} by HOD.`,
        reviewed_by: reviewerName,
      });
      setToastMessage(res.message);
      setTimeout(() => setToastMessage(null), 4000);
      closeModal();
      loadReports();
    } catch (err: any) {
      alert(err.message || "Failed to submit decision");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered reports
  const filteredReports = reports.filter((r) => {
    if (activeTab === "PENDING_REVIEW" && r.report_status !== "PENDING_REVIEW") return false;
    if (activeTab === "CRITICAL" && r.severity !== "CRITICAL") return false;
    if (activeTab === "RESOLVED" && r.report_status !== "RESOLVED") return false;

    if (search.trim()) {
      const query = search.toLowerCase();
      return (
        r.student_name.toLowerCase().includes(query) ||
        r.student_id.toLowerCase().includes(query) ||
        (r.roll_number && r.roll_number.toLowerCase().includes(query)) ||
        (r.parent_name && r.parent_name.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const pendingCount = reports.filter((r) => r.report_status === "PENDING_REVIEW").length;
  const criticalCount = reports.filter((r) => r.severity === "CRITICAL").length;
  const resolvedCount = reports.filter((r) => r.report_status === "RESOLVED").length;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg animate-fade-in">
          <CheckCircle size={18} />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-2xl font-bold ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Voice AI Verification Reports
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
              HOD Dashboard
            </span>
          </div>
          <p className={`text-sm mt-1 ${muted}`}>
            AI-driven automated absence calls & semantic mismatch investigation for {department} Department
          </p>
        </div>

        {/* Department Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${muted}`}>Department:</span>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className={inputClass}
            >
              <option value="CSE">CSE (Computer Science)</option>
              <option value="ECE">ECE (Electronics)</option>
              <option value="AIML">AIML (AI & Machine Learning)</option>
              <option value="IT">IT (Information Tech)</option>
            </select>
          </div>
          <button onClick={loadReports} className="btn-secondary p-2.5 rounded-lg" title="Refresh">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Reports", value: reports.length, icon: <FileText size={20} />, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Pending Investigation", value: pendingCount, icon: <Clock size={20} />, color: "text-yellow-600", bg: "bg-yellow-50" },
          { label: "Critical Mismatches", value: criticalCount, icon: <ShieldAlert size={20} />, color: "text-red-600", bg: "bg-red-50" },
          { label: "Reviewed & Resolved", value: resolvedCount, icon: <CheckCircle size={20} />, color: "text-green-600", bg: "bg-green-50" },
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

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tabs */}
        <div className={`flex rounded-xl p-1 border ${dm ? "bg-gray-900 border-gray-800" : "bg-gray-100 border-gray-200"}`}>
          {[
            { key: "ALL", label: `All Reports (${reports.length})` },
            { key: "PENDING_REVIEW", label: `Pending (${pendingCount})` },
            { key: "CRITICAL", label: `Critical (${criticalCount})` },
            { key: "RESOLVED", label: `Resolved (${resolvedCount})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? dm ? "bg-gray-800 text-white shadow" : "bg-white text-gray-900 shadow"
                  : muted
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className={`absolute left-3 top-3 ${muted}`} />
          <input
            type="text"
            placeholder="Search student, roll no, or parent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} pl-9 w-full sm:w-64`}
          />
        </div>
      </div>

      {/* Reports Feed / Table */}
      <div className={`${card} overflow-hidden`}>
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <RefreshCw size={24} className="animate-spin text-indigo-600 mb-2" />
            <p className={`text-sm ${muted}`}>Loading voice verification reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle size={36} className="mx-auto text-green-500 mb-3" />
            <h3 className={`text-base font-bold ${heading}`}>No Reports Found</h3>
            <p className={`text-xs mt-1 ${muted}`}>
              No suspicious absence cases found for the selected department and filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className={`border-b text-xs font-semibold ${dm ? "text-gray-400 border-gray-800 bg-gray-800/40" : "text-gray-500 border-gray-100 bg-gray-50"}`}>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Class & Teacher</th>
                  <th className="py-3 px-4">Student & Parent Calls</th>
                  <th className="py-3 px-4">AI Contradiction</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Status / Decision</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredReports.map((r) => (
                  <tr
                    key={r.report_id}
                    className={`transition-colors ${dm ? "hover:bg-gray-800/50" : "hover:bg-gray-50/80"}`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {r.student_name.charAt(0)}
                        </div>
                        <div>
                          <div className={`font-semibold text-xs ${heading}`}>{r.student_name}</div>
                          <div className={`text-xs ${muted}`}>{r.roll_number || r.student_id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      <div className={heading}>{r.class_name || "CSE-4A"}</div>
                      <div className={muted}>{r.teacher_name || "Dr. Rajesh Kumar"}</div>
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${r.student_call_status === "COMPLETED" ? "bg-green-500" : "bg-red-500"}`} />
                          <span className={muted}>Student: {r.student_call_status}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${r.parent_call_status === "COMPLETED" ? "bg-green-500" : "bg-red-500"}`} />
                          <span className={muted}>Parent: {r.parent_call_status}</span>
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs max-w-xs">
                      <div className="line-clamp-2 text-red-600 dark:text-red-400 font-medium">
                        {r.conflicting_statements.length > 0
                          ? r.conflicting_statements[0]
                          : r.reason_for_suspicion}
                      </div>
                      <span className={`text-[11px] ${muted}`}>Match Confidence: {Math.round(r.semantic_match_score * 100)}%</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`badge ${
                          r.severity === "CRITICAL"
                            ? "badge-danger"
                            : r.severity === "HIGH"
                            ? "badge-warning"
                            : "badge-info"
                        }`}
                      >
                        {r.severity}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      {r.report_status === "PENDING_REVIEW" ? (
                        <span className="badge badge-warning flex items-center gap-1 w-fit">
                          <Clock size={12} /> Pending HOD Review
                        </span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`badge ${
                              r.hod_decision === "APPROVED"
                                ? "badge-success"
                                : r.hod_decision === "REJECTED"
                                ? "badge-danger"
                                : "badge-info"
                            }`}
                          >
                            {r.hod_decision}
                          </span>
                          <span className={`text-[10px] ${muted}`}>By {r.reviewed_by}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedReport(r);
                          setActionDecision(r.hod_decision !== "PENDING" ? r.hod_decision : "APPROVED");
                          setActionRemarks(r.hod_remarks || "");
                        }}
                        className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1 ml-auto"
                      >
                        <span>Investigate</span>
                        <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Investigation Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`w-full max-w-4xl rounded-2xl border shadow-2xl p-6 my-8 ${dm ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b pb-4 mb-5 dark:border-gray-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${selectedReport.severity === "CRITICAL" ? "badge-danger" : "badge-warning"}`}>
                    {selectedReport.severity} Incident
                  </span>
                  <span className="text-xs text-gray-400">Report #{selectedReport.report_id}</span>
                </div>
                <h2 className={`text-xl font-bold mt-1 ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Suspicious Absence Investigation: {selectedReport.student_name}
                </h2>
                <p className={`text-xs ${muted}`}>
                  Class: {selectedReport.class_name || "CSE-4A"} &middot; Roll No: {selectedReport.roll_number} &middot; Teacher: {selectedReport.teacher_name || "Dr. Rajesh Kumar"}
                </p>
              </div>
              <button onClick={closeModal} className={`p-1.5 rounded-lg ${dm ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}>
                <X size={20} />
              </button>
            </div>

            {/* Profile Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {/* Student Info */}
              <div className={`p-3.5 rounded-xl border ${dm ? "bg-gray-800/60 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${muted}`}>Student Details</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-semibold">
                    {selectedReport.student_call_status}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className={muted}>Name:</span>
                    <span className={`font-semibold ${heading}`}>{selectedReport.student_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={muted}>Student ID:</span>
                    <span className={`font-mono ${heading}`}>{selectedReport.student_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={muted}>Registered Phone:</span>
                    <span className={`font-mono text-indigo-600 dark:text-indigo-400 font-semibold`}>
                      {selectedReport.student_phone || "+91 98765 43210"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Parent Info */}
              <div className={`p-3.5 rounded-xl border ${dm ? "bg-gray-800/60 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${muted}`}>Parent Details</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 font-semibold">
                    {selectedReport.parent_call_status}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className={muted}>Parent Name:</span>
                    <span className={`font-semibold ${heading}`}>{selectedReport.parent_name || "Parent/Guardian"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={muted}>Relationship:</span>
                    <span className={heading}>Father / Mother</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={muted}>Registered Phone:</span>
                    <span className={`font-mono text-indigo-600 dark:text-indigo-400 font-semibold`}>
                      {selectedReport.parent_phone || "+91 98765 43211"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Contradiction Alert Card */}
            <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/20 p-4 mb-5">
              <div className="flex items-start gap-3">
                <AlertOctagon className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={20} />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
                    AI Semantic Contradiction Analysis
                  </h4>
                  <p className="text-xs text-red-900 dark:text-red-200 mt-1 leading-relaxed">
                    {selectedReport.reason_for_suspicion}
                  </p>
                  {selectedReport.conflicting_statements.length > 0 && (
                    <div className="mt-2.5 space-y-1.5">
                      {selectedReport.conflicting_statements.map((stmt, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-red-800 dark:text-red-300 font-medium">
                          <span className="text-red-500 font-bold">•</span>
                          <span>{stmt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Transcripts and Audio Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Student Call Transcript & Audio */}
              <div className={`rounded-xl border p-4 flex flex-col ${dm ? "bg-gray-800/40 border-gray-700" : "bg-white border-gray-200"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <PhoneCall size={16} className="text-indigo-600" />
                    <span className={`text-xs font-bold ${heading}`}>Student Call Recording</span>
                  </div>
                  {/* Play audio button */}
                  <button
                    onClick={toggleStudentAudio}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold ${
                      playingStudentAudio
                        ? "bg-red-600 text-white"
                        : "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                    }`}
                  >
                    {playingStudentAudio ? <Pause size={13} /> : <Play size={13} />}
                    <span>{playingStudentAudio ? "Pause Recording" : "Play Audio"}</span>
                  </button>
                </div>
                {/* Transcript text box */}
                <div className={`flex-1 p-3 rounded-lg text-xs font-mono leading-relaxed overflow-y-auto max-h-56 ${dm ? "bg-gray-900 text-gray-300" : "bg-gray-50 text-gray-800"}`}>
                  {selectedReport.student_transcript ? (
                    <pre className="whitespace-pre-wrap font-sans">{selectedReport.student_transcript}</pre>
                  ) : (
                    <span className={muted}>No transcript recorded</span>
                  )}
                </div>
              </div>

              {/* Parent Call Transcript & Audio */}
              <div className={`rounded-xl border p-4 flex flex-col ${dm ? "bg-gray-800/40 border-gray-700" : "bg-white border-gray-200"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <PhoneCall size={16} className="text-purple-600" />
                    <span className={`text-xs font-bold ${heading}`}>Parent Call Recording</span>
                  </div>
                  {/* Play audio button */}
                  <button
                    onClick={toggleParentAudio}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold ${
                      playingParentAudio
                        ? "bg-red-600 text-white"
                        : "bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                    }`}
                  >
                    {playingParentAudio ? <Pause size={13} /> : <Play size={13} />}
                    <span>{playingParentAudio ? "Pause Recording" : "Play Audio"}</span>
                  </button>
                </div>
                {/* Transcript text box */}
                <div className={`flex-1 p-3 rounded-lg text-xs font-mono leading-relaxed overflow-y-auto max-h-56 ${dm ? "bg-gray-900 text-gray-300" : "bg-gray-50 text-gray-800"}`}>
                  {selectedReport.parent_transcript ? (
                    <pre className="whitespace-pre-wrap font-sans">{selectedReport.parent_transcript}</pre>
                  ) : (
                    <span className={muted}>No transcript recorded</span>
                  )}
                </div>
              </div>
            </div>

            {/* HOD Action and Remarks Form */}
            <div className={`p-4 rounded-xl border ${dm ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
              <h3 className={`text-sm font-bold mb-3 ${heading}`}>
                HOD Verdict & Official Review Action
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                {/* Decision selector */}
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${muted}`}>Action Decision</label>
                  <select
                    value={actionDecision}
                    onChange={(e) => setActionDecision(e.target.value as any)}
                    className={`w-full ${inputClass}`}
                  >
                    <option value="APPROVED">Approve Absence (Mark as Genuine Absence)</option>
                    <option value="REJECTED">Reject & Confirm Bunking (Disciplinary Flag)</option>
                    <option value="ESCALATED">Escalate to College Disciplinary Committee</option>
                    <option value="DISMISSED">Dismiss Report (Administrative Exception)</option>
                  </select>
                </div>

                {/* Reviewer Name */}
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${muted}`}>Reviewing Authority</label>
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    className={`w-full ${inputClass}`}
                  />
                </div>
              </div>

              {/* Remarks */}
              <div className="mb-4">
                <label className={`block text-xs font-semibold mb-1.5 ${muted}`}>Official Remarks & Investigation Notes</label>
                <textarea
                  rows={2}
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  placeholder="Enter remarks e.g., 'Student contacted parent to verify medical slip' or 'Called parent in-person to confirm bunking'..."
                  className={`w-full ${inputClass}`}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3">
                <button onClick={closeModal} className="btn-secondary text-xs px-4 py-2">
                  Cancel
                </button>
                <button
                  onClick={handleHODSubmit}
                  disabled={submitting}
                  className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Save Decision & Update Status</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
