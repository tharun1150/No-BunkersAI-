import { useState } from "react";
import { Phone, PhoneCall, X, CheckCircle, Clock, PhoneOff } from "lucide-react";
import { voiceCallHistory } from "../../data/mockData";

interface Props { darkMode: boolean; }

export default function VoiceAgent({ darkMode }: Props) {
  const [callModal, setCallModal] = useState(false);
  const [calling, setCalling] = useState(false);

  const dm = darkMode;
  const card = `rounded-xl border ${dm ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} shadow-sm`;
  const muted = dm ? "text-gray-400" : "text-gray-500";
  const heading = dm ? "text-white" : "text-gray-900";

  const startCall = () => {
    setCalling(true);
    setTimeout(() => setCalling(false), 3000);
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AI Parent Communication</h1>
          <p className={`text-sm mt-1 ${muted}`}>Automated voice calls for attendance alerts</p>
        </div>
        <button onClick={() => setCallModal(true)} className="btn-primary flex items-center gap-2">
          <PhoneCall size={16} /> Start AI Call
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Calls Today", value: "32", icon: <Phone size={20} />, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Successful", value: "27", icon: <CheckCircle size={20} />, color: "text-green-600", bg: "bg-green-50" },
          { label: "Pending", value: "5", icon: <Clock size={20} />, color: "text-yellow-600", bg: "bg-yellow-50" },
        ].map(s => (
          <div key={s.label} className={`stat-card ${dm ? "bg-gray-900 border-gray-800" : ""}`}>
            <div className="flex items-start justify-between mb-3">
              <p className={`text-xs font-semibold ${muted}`}>{s.label}</p>
              <div className={`w-8 h-8 rounded-lg ${s.bg} ${s.color} flex items-center justify-center`}>{s.icon}</div>
            </div>
            <p className={`text-3xl font-bold ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Call History */}
      <div className={`${card} p-5`}>
        <h2 className={`font-bold text-sm mb-4 ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Call History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b text-xs font-semibold ${dm ? "text-gray-500 border-gray-700" : "text-gray-400 border-gray-100"}`}>
                <th className="text-left py-2 pr-4">Student</th>
                <th className="text-left py-2 pr-4">Parent</th>
                <th className="text-left py-2 pr-4">Phone</th>
                <th className="text-left py-2 pr-4">Reason</th>
                <th className="text-left py-2 pr-4">Date</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {voiceCallHistory.map((c, i) => (
                <tr key={i} className={`table-row text-xs ${dm ? "text-gray-300 border-gray-700" : "text-gray-700 border-gray-50"}`}>
                  <td className={`py-3 pr-4 font-semibold ${heading}`}>{c.student}</td>
                  <td className="py-3 pr-4">{c.parent}</td>
                  <td className={`py-3 pr-4 font-mono ${muted}`}>{c.phone}</td>
                  <td className={`py-3 pr-4 ${muted}`}>{c.reason}</td>
                  <td className="py-3 pr-4">{c.date}</td>
                  <td className="py-3">
                    <span className={`badge ${c.status === "Successful" ? "badge-success" : c.status === "No Answer" ? "badge-warning" : "badge-danger"}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Call Modal */}
      {callModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className={`w-full max-w-sm rounded-2xl border shadow-xl p-6 ${dm ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className={`font-bold text-lg ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AI Call Setup</h3>
              <button onClick={() => { setCallModal(false); setCalling(false); }} className={`p-1 rounded-lg ${dm ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}><X size={18} /></button>
            </div>

            <div className="space-y-3 mb-5">
              {[["Student", "Sai Teja"], ["Reason", "Attendance below 65%"], ["Parent", "Ravi Teja"], ["Phone", "+91 98765 43215"]].map(([l, v]) => (
                <div key={l} className={`flex justify-between p-3 rounded-xl ${dm ? "bg-gray-800" : "bg-gray-50"}`}>
                  <span className={`text-xs ${muted}`}>{l}</span>
                  <span className={`text-xs font-semibold ${heading}`}>{v}</span>
                </div>
              ))}
            </div>

            <div className={`text-center py-4 mb-5 rounded-xl border ${dm ? "border-gray-700 bg-gray-800" : "border-gray-100 bg-gray-50"}`}>
              <div className={`flex items-center justify-center gap-2 ${calling ? "text-green-600" : muted}`}>
                {calling ? <PhoneCall size={18} className="animate-bounce" /> : <Phone size={18} />}
                <span className="text-sm font-semibold">{calling ? "Calling parent..." : "AI Agent: Ready to call parent."}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={startCall} disabled={calling} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <PhoneCall size={16} /> {calling ? "Calling..." : "Start Call"}
              </button>
              <button onClick={() => { setCallModal(false); setCalling(false); }} className="btn-secondary flex items-center justify-center gap-2 px-4">
                <PhoneOff size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
