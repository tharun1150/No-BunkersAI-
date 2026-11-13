import { useState, useEffect } from "react";
import {
  ShieldCheck,
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  AlertTriangle,
  Building,
  User,
  Scan,
  Users,
  Check,
  X,
  Plus,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import {
  OutingRequest,
  createStudentOuting,
  getStudentOutings,
  getParentOutingRequests,
  submitParentAction,
  getHODOutingRequests,
  submitHODAction,
  getSecurityDashboardStats,
  getSecurityApprovedList,
  getSecurityGatesAndGuards,
  verifyGateScan,
  getGateLogs,
  SecurityDashboardStats,
  GateItem,
  GuardItem,
  GateScanResponse,
} from "../../services/outingApi";
import type { Role } from "../../data/mockData";

interface Props {
  darkMode: boolean;
  role: Role;
}

export default function OutingManagement({ darkMode, role }: Props) {
  const dm = darkMode;
  const card = `rounded-xl border ${
    dm ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
  } shadow-sm`;
  const muted = dm ? "text-gray-400" : "text-gray-500";
  const heading = dm ? "text-white" : "text-gray-900";
  const inputClass = `w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${
    dm
      ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500"
      : "bg-white border-gray-200 text-gray-700 placeholder-gray-400 focus:border-indigo-500"
  }`;

  // Common State
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // Student State
  const [studentId, setStudentId] = useState("21CSE088");
  const [studentName, setStudentName] = useState("Rahul Kumar");
  const [studentDept, setStudentDept] = useState("CSE");
  const [myRequests, setMyRequests] = useState<OutingRequest[]>([]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedPassForQR, setSelectedPassForQR] = useState<OutingRequest | null>(null);

  // Student Form
  const [form, setForm] = useState({
    outing_type: "Day Outing",
    destination: "City Center & Technical Book House",
    reason: "Purchasing project hardware components and reference textbooks",
    departure_date: new Date().toISOString().split("T")[0],
    departure_time: "10:30 AM",
    expected_return_date: new Date().toISOString().split("T")[0],
    expected_return_time: "05:30 PM",
  });

  // Parent State
  const [parentRequests, setParentRequests] = useState<OutingRequest[]>([]);

  // HOD State
  const [hodDept, setHodDept] = useState("CSE");
  const [hodRequests, setHodRequests] = useState<OutingRequest[]>([]);

  // Security Admin & Gate State
  const [securityTab, setSecurityTab] = useState<"dashboard" | "scanner">("scanner");
  const [securityStats, setSecurityStats] = useState<SecurityDashboardStats | null>(null);
  const [securityApprovedList, setSecurityApprovedList] = useState<OutingRequest[]>([]);
  const [gates, setGates] = useState<GateItem[]>([]);
  const [guards, setGuards] = useState<GuardItem[]>([]);
  const [selectedGateId, setSelectedGateId] = useState<number>(1);
  const [selectedGuardId, setSelectedGuardId] = useState<number>(1);
  const [scanTokenInput, setScanTokenInput] = useState("");
  const [scanResult, setScanResult] = useState<GateScanResponse | null>(null);
  const [gateLogs, setGateLogs] = useState<any[]>([]);

  // -----------------------------------------------------------------
  // Loaders
  // -----------------------------------------------------------------
  const loadData = async () => {
    setLoading(true);
    try {
      if (role === "student") {
        const reqs = await getStudentOutings(studentId);
        setMyRequests(reqs);
      } else if (role === "parent") {
        const reqs = await getParentOutingRequests();
        setParentRequests(reqs);
      } else if (role === "faculty") {
        const reqs = await getHODOutingRequests(hodDept);
        setHodRequests(reqs);
      } else if (role === "admin") {
        const [stats, list, gatesData, logs] = await Promise.all([
          getSecurityDashboardStats().catch(() => null),
          getSecurityApprovedList().catch(() => []),
          getSecurityGatesAndGuards().catch(() => ({ gates: [], guards: [] })),
          getGateLogs(15).catch(() => []),
        ]);
        setSecurityStats(stats);
        setSecurityApprovedList(list);
        setGates(gatesData.gates);
        setGuards(gatesData.guards);
        if (gatesData.gates.length > 0 && !selectedGateId) {
          setSelectedGateId(gatesData.gates[0].id);
        }
        if (gatesData.guards.length > 0 && !selectedGuardId) {
          setSelectedGuardId(gatesData.guards[0].id);
        }
        setGateLogs(logs);
      }
    } catch (err: any) {
      console.warn("Outing fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [role, hodDept]);

  // -----------------------------------------------------------------
  // Student Actions
  // -----------------------------------------------------------------
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createStudentOuting({
        student_id: studentId,
        student_name: studentName,
        roll_number: studentId,
        department: studentDept,
        ...form,
      });
      setNotification({
        type: "success",
        message: `Outing Request #${created.request_no} submitted! Sent to parent for approval.`,
      });
      setIsRequestModalOpen(false);
      loadData();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    }
  };

  // -----------------------------------------------------------------
  // Parent Actions
  // -----------------------------------------------------------------
  const handleParentAction = async (id: number, action: "APPROVE" | "REJECT") => {
    try {
      const updated = await submitParentAction(id, action, action === "APPROVE" ? "Approved by Father" : "Declined");
      setNotification({
        type: "success",
        message:
          action === "APPROVE"
            ? `Approved Request #${updated.request_no}! Forwarded to ${updated.department} HOD.`
            : `Request #${updated.request_no} rejected.`,
      });
      loadData();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    }
  };

  // -----------------------------------------------------------------
  // HOD Actions
  // -----------------------------------------------------------------
  const handleHODAction = async (id: number, action: "APPROVE" | "REJECT") => {
    try {
      const updated = await submitHODAction(id, action, action === "APPROVE" ? "Approved by HOD. Gate QR Pass Issued." : "Declined by HOD");
      setNotification({
        type: "success",
        message:
          action === "APPROVE"
            ? `HOD Approved Request #${updated.request_no}! Gate QR Pass is now live.`
            : `Request #${updated.request_no} rejected by HOD.`,
      });
      loadData();
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    }
  };

  // -----------------------------------------------------------------
  // Gate Scanner Action
  // -----------------------------------------------------------------
  const handleScanSubmit = async (e?: React.FormEvent, tokenToUse?: string) => {
    if (e) e.preventDefault();
    const token = tokenToUse || scanTokenInput;
    if (!token.trim()) return;

    try {
      const res = await verifyGateScan(token.trim(), selectedGuardId, selectedGateId, "AUTO");
      setScanResult(res);
      setScanTokenInput("");
      const logs = await getGateLogs(15);
      setGateLogs(logs);
      const stats = await getSecurityDashboardStats().catch(() => null);
      setSecurityStats(stats);
    } catch (err: any) {
      setScanResult({
        status: "DENIED",
        message: err.message || "Invalid or Unapproved QR Pass",
      });
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Notifications */}
      {notification && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl text-sm ${
            notification.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200 dark:bg-green-950/40 dark:border-green-800 dark:text-green-300"
              : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
            ) : (
              <XCircle size={18} className="text-red-600 dark:text-red-400" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-75">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck size={22} />
            </div>
            <h1 className={`text-2xl font-bold ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Student Outing & Gate Security System
            </h1>
          </div>
          <p className={`text-xs mt-1 ${muted}`}>
            Role-based multi-tier approval: Student Request → Parent Approval → Respective HOD → Gate Scanner
          </p>
        </div>

        <div className="flex items-center gap-2">
          {role === "student" && (
            <button
              onClick={() => setIsRequestModalOpen(true)}
              className="btn-primary text-sm flex items-center gap-2 px-4 py-2"
            >
              <Plus size={16} /> Raise Outing Request
            </button>
          )}
          <button
            onClick={loadData}
            className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"
            title="Refresh requests"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 1. STUDENT VIEW                                                   */}
      {/* ================================================================= */}
      {role === "student" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`${card} p-4 flex items-center gap-3`}>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <div className={`text-sm font-bold ${heading}`}>Student Submits</div>
                <div className={`text-xs ${muted}`}>Destination & timings recorded</div>
              </div>
            </div>
            <div className={`${card} p-4 flex items-center gap-3`}>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <div className={`text-sm font-bold ${heading}`}>Parent Accepts</div>
                <div className={`text-xs ${muted}`}>Must approve before HOD queue</div>
              </div>
            </div>
            <div className={`${card} p-4 flex items-center gap-3`}>
              <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/60 text-green-600 flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <div className={`text-sm font-bold ${heading}`}>HOD Approves & QR Pass</div>
                <div className={`text-xs ${muted}`}>Scan pass at campus gate</div>
              </div>
            </div>
          </div>

          <div className={`${card} p-5`}>
            <h2 className={`text-base font-bold mb-3 ${heading}`}>My Outing Requests</h2>
            {myRequests.length === 0 ? (
              <div className="py-12 text-center">
                <ShieldCheck size={38} className={`mx-auto mb-2 ${muted}`} />
                <p className={`text-sm ${muted}`}>No outing requests submitted yet.</p>
                <button
                  onClick={() => setIsRequestModalOpen(true)}
                  className="btn-primary mt-3 text-xs px-4 py-2 inline-flex items-center gap-1.5"
                >
                  <Plus size={14} /> Submit First Request
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-indigo-200 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-600">{req.request_no}</span>
                        <span className="badge badge-primary text-[10px]">{req.outing_type}</span>
                        <span
                          className={`badge text-[10px] ${
                            req.overall_status === "APPROVED"
                              ? "badge-success"
                              : req.overall_status.includes("REJECTED")
                              ? "badge-danger"
                              : "badge-warning"
                          }`}
                        >
                          {req.overall_status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className={`text-sm font-bold ${heading}`}>{req.destination}</div>
                      <div className={`text-xs ${muted}`}>
                        Departure: <strong>{req.departure_date} at {req.departure_time}</strong> • Return by:{" "}
                        <strong>{req.expected_return_date} {req.expected_return_time}</strong>
                      </div>
                      <div className="text-xs text-gray-500 italic">"{req.reason}"</div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Approval Status indicators */}
                      <div className="text-right text-xs">
                        <div>
                          Parent:{" "}
                          <span
                            className={
                              req.parent_status === "APPROVED"
                                ? "text-green-600 font-bold"
                                : req.parent_status === "REJECTED"
                                ? "text-red-600 font-bold"
                                : "text-amber-500 font-semibold"
                            }
                          >
                            {req.parent_status}
                          </span>
                        </div>
                        <div>
                          HOD ({req.department}):{" "}
                          <span
                            className={
                              req.hod_status === "APPROVED"
                                ? "text-green-600 font-bold"
                                : req.hod_status === "REJECTED"
                                ? "text-red-600 font-bold"
                                : "text-amber-500 font-semibold"
                            }
                          >
                            {req.hod_status}
                          </span>
                        </div>
                      </div>

                      {req.overall_status === "APPROVED" && req.pass_record && (
                        <button
                          onClick={() => setSelectedPassForQR(req)}
                          className="btn-primary text-xs px-3 py-2 flex items-center gap-1.5"
                        >
                          <QrCode size={16} /> View Gate Pass
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 2. PARENT VIEW                                                    */}
      {/* ================================================================= */}
      {role === "parent" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <AlertTriangle size={18} className="shrink-0 text-amber-600" />
            <span>
              <strong>Parent Authorization Required:</strong> Outing requests for your ward require your consent. Once
              accepted, the request will immediately forward to their Respective Department HOD for final approval.
            </span>
          </div>

          <div className={`${card} p-5`}>
            <h2 className={`text-base font-bold mb-3 ${heading}`}>Outing Permission Requests</h2>
            {parentRequests.length === 0 ? (
              <div className="py-12 text-center text-gray-400">No requests pending parent action.</div>
            ) : (
              <div className="space-y-3">
                {parentRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-indigo-600">{req.request_no}</span>
                        <span className="badge badge-primary text-[10px]">{req.department}</span>
                        <span className={`badge text-[10px] ${req.parent_status === "APPROVED" ? "badge-success" : req.parent_status === "REJECTED" ? "badge-danger" : "badge-warning"}`}>
                          Parent: {req.parent_status}
                        </span>
                      </div>
                      <h3 className={`text-sm font-bold ${heading}`}>
                        {req.student_name} ({req.roll_number || req.student_id})
                      </h3>
                      <p className="text-xs text-indigo-600 font-medium">Destination: {req.destination}</p>
                      <p className={`text-xs ${muted}`}>
                        Timing: {req.departure_date} {req.departure_time} to {req.expected_return_date} {req.expected_return_time}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 italic">"{req.reason}"</p>
                    </div>

                    {req.parent_status === "PENDING" ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleParentAction(req.id, "REJECT")}
                          className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center gap-1"
                        >
                          <X size={14} /> Reject
                        </button>
                        <button
                          onClick={() => handleParentAction(req.id, "APPROVE")}
                          className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1"
                        >
                          <Check size={14} /> Accept & Send to HOD
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs font-semibold text-gray-400">
                        Actioned: {req.parent_status}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 3. FACULTY / RESPECTIVE HOD VIEW                                 */}
      {/* ================================================================= */}
      {role === "faculty" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20">
            <div className="flex items-center gap-2">
              <Building size={18} className="text-indigo-600" />
              <span className="text-sm font-bold">Respective Department Filter:</span>
              <select
                value={hodDept}
                onChange={(e) => setHodDept(e.target.value)}
                className="px-3 py-1.5 rounded-lg border text-xs font-bold bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-300"
              >
                <option value="CSE">CSE Department</option>
                <option value="ECE">ECE Department</option>
                <option value="AIML">AIML Department</option>
                <option value="IT">IT Department</option>
              </select>
            </div>
            <span className="text-xs text-gray-500">
              Only parent-approved requests for {hodDept} students are routed here.
            </span>
          </div>

          <div className={`${card} p-5`}>
            <h2 className={`text-base font-bold mb-3 ${heading}`}>{hodDept} Outing Approval Queue</h2>
            {hodRequests.length === 0 ? (
              <div className="py-12 text-center text-gray-400">No pending parent-approved requests for {hodDept}.</div>
            ) : (
              <div className="space-y-3">
                {hodRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-indigo-600">{req.request_no}</span>
                        <span className="badge badge-success text-[10px]">Parent Approved</span>
                        <span className={`badge text-[10px] ${req.hod_status === "APPROVED" ? "badge-success" : req.hod_status === "REJECTED" ? "badge-danger" : "badge-warning"}`}>
                          HOD: {req.hod_status}
                        </span>
                      </div>
                      <h3 className={`text-sm font-bold ${heading}`}>
                        {req.student_name} ({req.roll_number || req.student_id}) — {req.department}
                      </h3>
                      <p className="text-xs text-indigo-600 font-medium">Destination: {req.destination}</p>
                      <p className={`text-xs ${muted}`}>
                        Window: {req.departure_date} {req.departure_time} to {req.expected_return_date} {req.expected_return_time}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 italic">"{req.reason}"</p>
                    </div>

                    {req.hod_status === "PENDING" ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleHODAction(req.id, "REJECT")}
                          className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center gap-1"
                        >
                          <X size={14} /> Reject
                        </button>
                        <button
                          onClick={() => handleHODAction(req.id, "APPROVE")}
                          className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1"
                        >
                          <Check size={14} /> Approve & Issue Pass
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs font-bold text-green-600">
                        Pass Active: {req.pass_record?.qr_token.slice(0, 15)}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 4. ADMIN VIEW (SECURITY COMMAND CENTER & GATE SCANNER)           */}
      {/* ================================================================= */}
      {role === "admin" && (
        <div className="space-y-5">
          {/* Sub tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-800 gap-6">
            <button
              onClick={() => setSecurityTab("scanner")}
              className={`pb-2.5 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                securityTab === "scanner"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Scan size={16} /> Gate Scanner Station
            </button>
            <button
              onClick={() => setSecurityTab("dashboard")}
              className={`pb-2.5 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                securityTab === "dashboard"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <ShieldAlert size={16} /> Security Control Center
            </button>
          </div>

          {/* TAB 1: GATE SCANNER STATION */}
          {securityTab === "scanner" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left Column: Scanner Terminal */}
              <div className={`lg:col-span-2 ${card} p-6 space-y-4`}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 dark:border-gray-800">
                  <div>
                    <h2 className={`text-base font-bold ${heading}`}>Gate Scanner Terminal</h2>
                    <p className={`text-xs ${muted}`}>Scan student cryptographic QR code for authorized Exit & Return</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedGateId}
                      onChange={(e) => setSelectedGateId(Number(e.target.value))}
                      className="px-2.5 py-1.5 rounded-lg border text-xs font-semibold bg-gray-50 dark:bg-gray-800"
                    >
                      {gates.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.gate_name} ({g.location_code})
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedGuardId}
                      onChange={(e) => setSelectedGuardId(Number(e.target.value))}
                      className="px-2.5 py-1.5 rounded-lg border text-xs font-semibold bg-gray-50 dark:bg-gray-800"
                    >
                      {guards.map((gd) => (
                        <option key={gd.id} value={gd.id}>
                          {gd.name} ({gd.badge_number})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Simulated Scanner Device Area */}
                <div className="p-6 rounded-2xl bg-gray-950 text-white flex flex-col items-center justify-center text-center relative overflow-hidden border border-gray-800 min-h-64">
                  <div className="w-44 h-44 rounded-xl border-2 border-dashed border-indigo-400/80 flex flex-col items-center justify-center relative p-3">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-400" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-400" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-400" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-400" />
                    <QrCode size={56} className="text-indigo-400 animate-pulse mb-2" />
                    <span className="text-[11px] text-gray-300 font-mono">Camera Scanner Ready</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-3 max-w-sm">
                    Hold student's digital QR pass inside scanner or enter token to simulate terminal check
                  </p>
                </div>

                {/* Scan Input & Action */}
                <form onSubmit={(e) => handleScanSubmit(e)} className="flex items-center gap-2">
                  <input
                    placeholder="Enter or paste student pass token (e.g. PASS_...)"
                    value={scanTokenInput}
                    onChange={(e) => setScanTokenInput(e.target.value)}
                    className={inputClass}
                  />
                  <button type="submit" className="btn-primary text-xs px-5 py-2.5 shrink-0 flex items-center gap-1.5">
                    <Scan size={14} /> Scan & Verify
                  </button>
                </form>

                {/* Scan Verification Result Banner */}
                {scanResult && (
                  <div
                    className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                      scanResult.status === "ALLOWED_EXIT"
                        ? "bg-green-50 border-green-300 text-green-900 dark:bg-green-950/60 dark:border-green-800 dark:text-green-200"
                        : scanResult.status === "ALLOWED_RETURN"
                        ? "bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-200"
                        : "bg-red-50 border-red-300 text-red-900 dark:bg-red-950/60 dark:border-red-800 dark:text-red-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm flex items-center gap-1.5">
                        {scanResult.status.startsWith("ALLOWED") ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        <span>{scanResult.status.replace(/_/g, " ")}</span>
                      </div>
                      <span className="font-mono text-[11px]">
                        {scanResult.exit_timestamp || scanResult.return_timestamp || "Just now"}
                      </span>
                    </div>
                    <div>{scanResult.message}</div>
                    {scanResult.student_name && (
                      <div className="pt-2 border-t border-current/20 font-medium">
                        Student: <strong>{scanResult.student_name}</strong> ({scanResult.department}) • Roll: {scanResult.roll_number || scanResult.student_id}
                        {scanResult.destination && <div>Destination: {scanResult.destination}</div>}
                        {scanResult.expected_return && <div>Curfew Return: {scanResult.expected_return}</div>}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Quick Pass Tokens & Recent Scans */}
              <div className="space-y-4">
                <div className={`${card} p-4`}>
                  <h3 className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${heading}`}>
                    Active Approved Passes (Quick Test)
                  </h3>
                  {securityApprovedList.length === 0 ? (
                    <div className="text-xs text-gray-400">No active approved passes found.</div>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {securityApprovedList.map((req) => (
                        <div
                          key={req.id}
                          className="p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 text-xs flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <div>
                            <div className="font-bold">{req.student_name}</div>
                            <div className="text-[11px] text-gray-500 font-mono">
                              {req.pass_record?.pass_status || req.overall_status}
                            </div>
                          </div>
                          {req.pass_record?.qr_token && (
                            <button
                              onClick={() => handleScanSubmit(undefined, req.pass_record?.qr_token)}
                              className="btn-secondary text-[11px] px-2.5 py-1 text-indigo-600 hover:bg-indigo-50"
                            >
                              Scan Pass
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`${card} p-4`}>
                  <h3 className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${heading}`}>
                    Live Gate Scan Logs
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
                    {gateLogs.map((log) => (
                      <div key={log.id} className="p-2 rounded bg-gray-50 dark:bg-gray-800/60 space-y-0.5">
                        <div className="flex items-center justify-between font-semibold">
                          <span>{log.student_name || log.student_id}</span>
                          <span
                            className={
                              log.scan_result.startsWith("ALLOWED") ? "text-green-600" : "text-red-500"
                            }
                          >
                            {log.scan_type} • {log.scan_result}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {log.gate_name} • {log.timestamp}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SECURITY COMMAND CENTER DASHBOARD */}
          {securityTab === "dashboard" && (
            <div className="space-y-4">
              {securityStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className={`${card} p-4`}>
                    <div className="text-xs text-gray-500">Approved Today</div>
                    <div className="text-2xl font-bold text-indigo-600 mt-1">{securityStats.total_approved_today}</div>
                  </div>
                  <div className={`${card} p-4`}>
                    <div className="text-xs text-gray-500">Outside Campus</div>
                    <div className="text-2xl font-bold text-amber-500 mt-1">{securityStats.students_currently_outside}</div>
                  </div>
                  <div className={`${card} p-4`}>
                    <div className="text-xs text-gray-500">Safely Returned</div>
                    <div className="text-2xl font-bold text-green-600 mt-1">{securityStats.students_returned_today}</div>
                  </div>
                  <div className={`${card} p-4`}>
                    <div className="text-xs text-gray-500">Overdue Curfew</div>
                    <div className="text-2xl font-bold text-red-600 mt-1">{securityStats.overdue_students}</div>
                  </div>
                </div>
              )}

              <div className={`${card} p-5`}>
                <h3 className={`text-base font-bold mb-3 ${heading}`}>All HOD-Approved Outings Feed</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-left text-gray-400 dark:border-gray-800">
                        <th className="py-2.5">Pass ID</th>
                        <th className="py-2.5">Student</th>
                        <th className="py-2.5">Dept</th>
                        <th className="py-2.5">Destination</th>
                        <th className="py-2.5">Status</th>
                        <th className="py-2.5">Exit Time</th>
                        <th className="py-2.5">Return Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {securityApprovedList.map((req) => (
                        <tr key={req.id} className="border-b border-gray-50 dark:border-gray-800/50">
                          <td className="py-2.5 font-mono text-indigo-600 font-bold">{req.request_no}</td>
                          <td className="py-2.5 font-semibold">{req.student_name}</td>
                          <td className="py-2.5">{req.department}</td>
                          <td className="py-2.5 text-gray-500">{req.destination}</td>
                          <td className="py-2.5">
                            <span className="badge badge-primary">{req.overall_status}</span>
                          </td>
                          <td className="py-2.5 font-mono text-gray-500">
                            {req.pass_record?.actual_exit_at ? new Date(req.pass_record.actual_exit_at).toLocaleTimeString() : "-"}
                          </td>
                          <td className="py-2.5 font-mono text-gray-500">
                            {req.pass_record?.actual_return_at ? new Date(req.pass_record.actual_return_at).toLocaleTimeString() : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 1: RAISE OUTING REQUEST (STUDENT)                          */}
      {/* ================================================================= */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className={`w-full max-w-lg rounded-2xl border ${
              dm ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"
            } shadow-2xl p-6`}
          >
            <div className="flex items-center justify-between mb-4 border-b pb-3 dark:border-gray-800">
              <h2 className="text-lg font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Raise Student Outing Request
              </h2>
              <button onClick={() => setIsRequestModalOpen(false)} className="p-1 hover:opacity-75">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Student Name</label>
                  <input
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Roll Number / ID</label>
                  <input
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Department</label>
                  <select
                    value={studentDept}
                    onChange={(e) => setStudentDept(e.target.value)}
                    className={inputClass}
                  >
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="AIML">AI & ML</option>
                    <option value="IT">IT</option>
                    <option value="MECH">Mechanical</option>
                    <option value="CIVIL">Civil</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Outing Type</label>
                  <select
                    value={form.outing_type}
                    onChange={(e) => setForm({ ...form, outing_type: e.target.value })}
                    className={inputClass}
                  >
                    <option value="Day Outing">Day Outing</option>
                    <option value="Overnight Outing">Overnight Outing</option>
                    <option value="Emergency Outing">Emergency Outing</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block">Destination *</label>
                <input
                  required
                  placeholder="e.g. City Center Mall / Home"
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block">Reason *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="State the purpose of outing..."
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Departure Date & Time</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={form.departure_date}
                      onChange={(e) => setForm({ ...form, departure_date: e.target.value })}
                      className={inputClass}
                    />
                    <input
                      value={form.departure_time}
                      onChange={(e) => setForm({ ...form, departure_time: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Expected Return Time</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={form.expected_return_date}
                      onChange={(e) => setForm({ ...form, expected_return_date: e.target.value })}
                      className={inputClass}
                    />
                    <input
                      value={form.expected_return_time}
                      onChange={(e) => setForm({ ...form, expected_return_time: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs px-5 py-2">
                  Submit to Parent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 2: DIGITAL QR PASS (STUDENT)                               */}
      {/* ================================================================= */}
      {selectedPassForQR && selectedPassForQR.pass_record && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div
            className={`w-full max-w-sm rounded-2xl border ${
              dm ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"
            } shadow-2xl p-6 text-center space-y-4`}
          >
            <div className="flex items-center justify-between border-b pb-2 dark:border-gray-800">
              <span className="font-mono text-xs font-bold text-indigo-600">
                {selectedPassForQR.request_no}
              </span>
              <button onClick={() => setSelectedPassForQR(null)} className="p-1 hover:opacity-75">
                <X size={16} />
              </button>
            </div>

            <div>
              <div className="badge badge-success text-xs font-bold px-3 py-1">
                CAMPUS EXIT PERMITTED
              </div>
              <h3 className={`text-lg font-bold mt-2 ${heading}`}>{selectedPassForQR.student_name}</h3>
              <p className={`text-xs ${muted}`}>
                {selectedPassForQR.department} • {selectedPassForQR.roll_number || selectedPassForQR.student_id}
              </p>
            </div>

            {/* Dynamic QR Code display */}
            <div className="p-4 bg-white rounded-xl inline-block shadow-inner border border-gray-200">
              <div className="w-48 h-48 bg-gray-900 rounded-lg flex flex-col items-center justify-center p-3 text-white">
                <QrCode size={120} className="text-white" />
                <span className="text-[9px] font-mono mt-1 text-gray-400">Scan at Security Gate</span>
              </div>
            </div>

            <div className="text-left text-xs space-y-1 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 font-mono">
              <div className="truncate">
                <span className="text-gray-400">Token:</span> {selectedPassForQR.pass_record.qr_token}
              </div>
              <div>
                <span className="text-gray-400">Destination:</span> {selectedPassForQR.destination}
              </div>
              <div>
                <span className="text-gray-400">Return By:</span> {selectedPassForQR.expected_return_time}
              </div>
            </div>

            <button
              onClick={() => setSelectedPassForQR(null)}
              className="btn-primary w-full text-xs py-2"
            >
              Close Pass
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
