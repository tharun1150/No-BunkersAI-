import { useState } from "react";
import { Plus, Check, X, Paperclip } from "lucide-react";
import { leaveRequests } from "../../data/mockData";
import type { Role } from "../../data/mockData";

interface Props { darkMode: boolean; role: Role; }

export default function LeaveRequests({ darkMode, role }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [requests, setRequests] = useState(leaveRequests);

  const dm = darkMode;
  const card = `rounded-xl border ${dm ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} shadow-sm`;
  const muted = dm ? "text-gray-400" : "text-gray-500";
  const heading = dm ? "text-white" : "text-gray-900";
  const inputClass = `w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors ${dm ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-indigo-500"}`;

  const isStudent = role === "student" || role === "parent";

  const handleStatusChange = (id: string, status: "approved" | "rejected") => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Leave Requests</h1>
          <p className={`text-sm mt-1 ${muted}`}>{isStudent ? "Apply and track your leave requests" : "Review student leave applications"}</p>
        </div>
        {isStudent && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Apply Leave
          </button>
        )}
      </div>

      {/* Apply form */}
      {showForm && isStudent && (
        <div className={`${card} p-5`}>
          <h2 className={`font-bold text-sm mb-4 ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Apply for Leave</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={`text-xs font-semibold mb-1.5 block ${muted}`}>Subject</label>
              <select className={inputClass}><option>All Subjects</option><option>Machine Learning</option><option>Database Systems</option><option>Python Programming</option></select>
            </div>
            <div>
              <label className={`text-xs font-semibold mb-1.5 block ${muted}`}>Start Date</label>
              <input type="date" className={inputClass} defaultValue="2026-08-25" />
            </div>
            <div>
              <label className={`text-xs font-semibold mb-1.5 block ${muted}`}>End Date</label>
              <input type="date" className={inputClass} defaultValue="2026-08-26" />
            </div>
            <div>
              <label className={`text-xs font-semibold mb-1.5 block ${muted}`}>Attachment (Optional)</label>
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer ${dm ? "border-gray-700 text-gray-400" : "border-gray-200 text-gray-400"}`}>
                <Paperclip size={15} />
                <span className="text-sm">Upload document</span>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className={`text-xs font-semibold mb-1.5 block ${muted}`}>Reason</label>
              <textarea className={inputClass} rows={3} placeholder="Describe the reason for leave..." />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button className="btn-primary">Submit Request</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending", count: requests.filter(r => r.status === "pending").length, color: "text-yellow-600", bg: dm ? "bg-yellow-900/10 border-yellow-900/30" : "bg-yellow-50 border-yellow-100" },
          { label: "Approved", count: requests.filter(r => r.status === "approved").length, color: "text-green-600", bg: dm ? "bg-green-900/10 border-green-900/30" : "bg-green-50 border-green-100" },
          { label: "Rejected", count: requests.filter(r => r.status === "rejected").length, color: "text-red-500", bg: dm ? "bg-red-900/10 border-red-900/30" : "bg-red-50 border-red-100" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 text-center ${s.bg}`}>
            <div className={`text-2xl font-bold ${s.color}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.count}</div>
            <div className={`text-xs mt-1 ${muted}`}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className={`${card} p-5`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b text-xs font-semibold ${dm ? "text-gray-500 border-gray-700" : "text-gray-400 border-gray-100"}`}>
                {!isStudent && <th className="text-left py-2 pr-4">Student</th>}
                <th className="text-left py-2 pr-4">Subject</th>
                <th className="text-left py-2 pr-4">Dates</th>
                <th className="text-left py-2 pr-4">Reason</th>
                <th className="text-left py-2 pr-4">Status</th>
                {!isStudent && <th className="text-left py-2">Action</th>}
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id} className={`table-row text-xs ${dm ? "text-gray-300 border-gray-700" : "text-gray-700 border-gray-50"}`}>
                  {!isStudent && (
                    <td className="py-3 pr-4">
                      <div className={`font-semibold ${heading}`}>{r.studentName}</div>
                      <div className={`text-xs ${muted}`}>{r.department}</div>
                    </td>
                  )}
                  <td className="py-3 pr-4">{r.subject}</td>
                  <td className="py-3 pr-4">
                    <div>{r.startDate}</div>
                    {r.endDate !== r.startDate && <div className={muted}>to {r.endDate}</div>}
                  </td>
                  <td className={`py-3 pr-4 max-w-48 ${muted}`}>{r.reason}</td>
                  <td className="py-3 pr-4">
                    <span className={`badge ${r.status === "approved" ? "badge-success" : r.status === "rejected" ? "badge-danger" : "badge-warning"}`}>
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </span>
                  </td>
                  {!isStudent && r.status === "pending" && (
                    <td className="py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => handleStatusChange(r.id, "approved")} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                          <Check size={14} />
                        </button>
                        <button onClick={() => handleStatusChange(r.id, "rejected")} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                  {!isStudent && r.status !== "pending" && <td className="py-3" />}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
