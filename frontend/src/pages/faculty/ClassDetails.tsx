import { useState } from "react";
import { Users, TrendingUp, AlertTriangle, BookOpen } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { students, attendanceTrend30Days } from "../../data/mockData";

interface Props { darkMode: boolean; }

const tabs = ["Overview", "Students", "Analytics"];

export default function ClassDetails({ darkMode }: Props) {
  const [tab, setTab] = useState("Overview");
  const dm = darkMode;
  const card = `rounded-xl border ${dm ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} shadow-sm`;
  const muted = dm ? "text-gray-400" : "text-gray-500";
  const heading = dm ? "text-white" : "text-gray-900";
  const chartData = attendanceTrend30Days.slice(-14);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <h1 className={`text-2xl font-bold ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Class Details</h1>
        <p className={`text-sm mt-1 ${muted}`}>CSE-4A — Machine Learning</p>
      </div>

      {/* Info Card */}
      <div className={`${card} p-5`}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Class", value: "CSE-4A" },
            { label: "Subject", value: "Machine Learning" },
            { label: "Faculty", value: "Dr. Rajesh Kumar" },
            { label: "Students", value: "62" },
            { label: "Avg. Attendance", value: "89%" },
          ].map(item => (
            <div key={item.label}>
              <div className={`text-xs font-semibold mb-1 ${muted}`}>{item.label}</div>
              <div className={`text-sm font-bold ${heading}`}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex gap-1 p-1 rounded-xl w-fit ${dm ? "bg-gray-800" : "bg-gray-100"}`}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? (dm ? "bg-gray-700 text-white" : "bg-white text-gray-900 shadow-sm") : muted}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className={`${card} p-5`}>
            <h3 className={`font-bold text-sm mb-4 ${heading}`}>Attendance Trend (14 Days)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={[60, 100]} />
                <CartesianGrid strokeDasharray="3 3" stroke={dm ? "#1e293b" : "#f1f5f9"} />
                <Tooltip contentStyle={{ fontSize: 12, background: dm ? "#1e293b" : "white", border: "1px solid #e2e8f0", borderRadius: 8 }} />
                <Area type="monotone" dataKey="attendance" stroke="#4f46e5" fill="url(#g)" strokeWidth={2} dot={false} name="%" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className={`${card} p-5`}>
            <h3 className={`font-bold text-sm mb-4 ${heading}`}>Class Summary</h3>
            <div className="space-y-3">
              {[
                { label: "Total Students", value: "62", icon: <Users size={16} />, color: "text-indigo-600" },
                { label: "Classes Conducted", value: "51", icon: <BookOpen size={16} />, color: "text-purple-600" },
                { label: "Avg Attendance", value: "89%", icon: <TrendingUp size={16} />, color: "text-green-600" },
                { label: "At-Risk Students", value: "8", icon: <AlertTriangle size={16} />, color: "text-red-500" },
              ].map(s => (
                <div key={s.label} className={`flex items-center justify-between p-3 rounded-lg ${dm ? "bg-gray-800" : "bg-gray-50"}`}>
                  <div className={`flex items-center gap-2 text-sm ${muted}`}><span className={s.color}>{s.icon}</span>{s.label}</div>
                  <span className={`font-bold text-sm ${heading}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "Students" && (
        <div className={`${card} p-5`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b text-xs font-semibold ${dm ? "text-gray-500 border-gray-700" : "text-gray-400 border-gray-100"}`}>
                  <th className="text-left py-2 pr-4">Roll No</th>
                  <th className="text-left py-2 pr-4">Name</th>
                  <th className="text-left py-2 pr-4">Attendance %</th>
                  <th className="text-left py-2 pr-4">Present</th>
                  <th className="text-left py-2 pr-4">Absent</th>
                  <th className="text-left py-2">Risk</th>
                </tr>
              </thead>
              <tbody>
                {students.slice(0, 10).map(s => (
                  <tr key={s.id} className={`table-row text-xs ${dm ? "text-gray-300 border-gray-700" : "text-gray-700 border-gray-50"} ${s.attendance < 75 ? (dm ? "bg-red-900/10" : "bg-red-50/50") : ""}`}>
                    <td className="py-3 pr-4 font-mono font-medium">{s.rollNo}</td>
                    <td className="py-3 pr-4 font-semibold">{s.name}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="progress-bar w-16">
                          <div className="progress-fill" style={{ width: `${s.attendance}%`, background: s.attendance >= 85 ? "#16a34a" : s.attendance >= 75 ? "#d97706" : "#dc2626" }} />
                        </div>
                        <span className={`font-bold ${s.attendance < 75 ? "text-red-500" : s.attendance < 85 ? "text-yellow-600" : "text-green-600"}`}>{s.attendance}%</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-green-600 font-medium">{s.present}</td>
                    <td className="py-3 pr-4 text-red-500 font-medium">{s.absent}</td>
                    <td className="py-3">
                      <span className={`badge ${s.status === "safe" ? "badge-success" : s.status === "warning" ? "badge-warning" : "badge-danger"}`}>
                        {s.status === "safe" ? "Safe" : s.status === "warning" ? "Warning" : "Critical"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "Analytics" && (
        <div className={`${card} p-5`}>
          <h3 className={`font-bold text-sm mb-4 ${heading}`}>Attendance Distribution</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[{ label: "Safe (≥85%)", value: "34", color: "text-green-600", bg: "bg-green-50" },
              { label: "Warning (75-84%)", value: "20", color: "text-yellow-600", bg: "bg-yellow-50" },
              { label: "Critical (<75%)", value: "8", color: "text-red-500", bg: "bg-red-50" }].map(s => (
              <div key={s.label} className={`text-center rounded-xl p-4 ${dm ? "bg-gray-800" : s.bg}`}>
                <div className={`text-2xl font-bold ${s.color}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.value}</div>
                <div className={`text-xs mt-1 ${muted}`}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
