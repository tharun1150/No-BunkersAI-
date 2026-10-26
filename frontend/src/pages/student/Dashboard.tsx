import { TrendingUp, TrendingDown, BookOpen, AlertTriangle, CheckCircle2 } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { subjects, attendanceTrend30Days } from "../../data/mockData";

interface Props { darkMode: boolean; }

const chartData = attendanceTrend30Days.slice(-14);

function AttendanceBar({ pct }: { pct: number }) {
  const color = pct >= 85 ? "#16a34a" : pct >= 75 ? "#d97706" : "#dc2626";
  return (
    <div className="progress-bar flex-1">
      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function StudentDashboard({ darkMode }: Props) {
  const overall = 82.5;
  const present = 148;
  const absent = 32;
  const total = 180;
  const riskStatus = overall >= 85 ? "LOW" : overall >= 75 ? "MODERATE" : "HIGH";
  const classesNeeded = overall < 75 ? Math.ceil((0.75 * total - present) / 0.25) : 0;

  const dm = darkMode;
  const card = `rounded-xl border p-5 ${dm ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} shadow-sm`;
  const muted = dm ? "text-gray-400" : "text-gray-500";
  const heading = dm ? "text-white" : "text-gray-900";

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className={`text-2xl font-bold ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Good Morning, Rahul 👋
        </h1>
        <p className={`text-sm mt-1 ${muted}`}>Here's your attendance overview for August 2026</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Overall Attendance", value: `${overall}%`, sub: "Current semester", icon: <TrendingUp size={20} />, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Present", value: present, sub: "Classes attended", icon: <CheckCircle2 size={20} />, color: "text-green-600", bg: "bg-green-50" },
          { label: "Absent", value: absent, sub: "Classes missed", icon: <TrendingDown size={20} />, color: "text-red-500", bg: "bg-red-50" },
          { label: "Total Classes", value: total, sub: "Conducted so far", icon: <BookOpen size={20} />, color: "text-purple-600", bg: "bg-purple-50" },
        ].map(stat => (
          <div key={stat.label} className={`stat-card ${dm ? "bg-gray-900 border-gray-800" : ""}`}>
            <div className="flex items-start justify-between mb-3">
              <p className={`text-xs font-semibold ${muted}`}>{stat.label}</p>
              <div className={`w-8 h-8 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center`}>{stat.icon}</div>
            </div>
            <p className={`text-2xl font-bold ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{stat.value}</p>
            <p className={`text-xs mt-1 ${muted}`}>{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Attendance Chart */}
        <div className={`lg:col-span-2 ${card}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={`font-bold text-sm ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Attendance Trend</h2>
              <p className={`text-xs ${muted}`}>Last 14 days</p>
            </div>
            <span className="badge badge-info text-xs">Daily</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={[60, 100]} />
              <CartesianGrid strokeDasharray="3 3" stroke={dm ? "#1e293b" : "#f1f5f9"} />
              <Tooltip contentStyle={{ fontSize: 12, background: dm ? "#1e293b" : "white", border: "1px solid #e2e8f0", borderRadius: 8, color: dm ? "#f1f5f9" : "#0f172a" }} />
              <Area type="monotone" dataKey="attendance" stroke="#4f46e5" fill="url(#attGrad)" strokeWidth={2} dot={false} name="Attendance %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Card */}
        <div className={card}>
          <h2 className={`font-bold text-sm mb-4 ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Attendance Status</h2>
          <div className={`rounded-xl p-4 mb-4 text-center ${riskStatus === "LOW" ? "bg-green-50 border border-green-100" : riskStatus === "MODERATE" ? "bg-yellow-50 border border-yellow-100" : "bg-red-50 border border-red-100"}`}>
            <div className={`flex items-center justify-center gap-2 mb-1 ${riskStatus === "LOW" ? "text-green-600" : riskStatus === "MODERATE" ? "text-yellow-600" : "text-red-600"}`}>
              <AlertTriangle size={16} />
              <span className="text-xs font-semibold">ATTENDANCE RISK</span>
            </div>
            <div className={`text-2xl font-bold ${riskStatus === "LOW" ? "text-green-600" : riskStatus === "MODERATE" ? "text-yellow-600" : "text-red-600"}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {riskStatus}
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className={muted}>Current</span>
              <span className={`font-bold ${overall >= 75 ? "text-green-600" : "text-red-500"}`}>{overall}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className={muted}>Required</span>
              <span className="font-bold text-indigo-600">75%</span>
            </div>
            <div className="progress-bar mt-2">
              <div className="progress-fill" style={{ width: `${overall}%`, background: overall >= 85 ? "#16a34a" : overall >= 75 ? "#d97706" : "#dc2626" }} />
            </div>
            {classesNeeded > 0 && (
              <p className="text-xs text-red-500 font-medium mt-2">You need to attend {classesNeeded} more classes to reach 75%.</p>
            )}
            {overall >= 75 && (
              <p className={`text-xs ${muted} mt-2`}>You can miss {Math.floor((overall / 100 * total - 0.75 * total))} more classes while staying above 75%.</p>
            )}
          </div>
        </div>
      </div>

      {/* Subject Cards */}
      <div className={card}>
        <h2 className={`font-bold text-sm mb-4 ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Subject-wise Attendance</h2>
        <div className="space-y-4">
          {subjects.map(sub => {
            const color = sub.attendance >= 85 ? "#16a34a" : sub.attendance >= 75 ? "#d97706" : "#dc2626";
            const badge = sub.attendance >= 85 ? "badge-success" : sub.attendance >= 75 ? "badge-warning" : "badge-danger";
            const status = sub.attendance >= 85 ? "Safe" : sub.attendance >= 75 ? "Warning" : "Critical";
            return (
              <div key={sub.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className={`text-sm font-semibold ${heading}`}>{sub.name}</span>
                    <span className={`text-xs ml-2 ${muted}`}>{sub.code}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs ${muted}`}>{sub.present}P / {sub.absent}A</span>
                    <span className="font-bold text-sm" style={{ color }}>{sub.attendance}%</span>
                    <span className={`badge ${badge}`}>{status}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AttendanceBar pct={sub.attendance} />
                  <span className={`text-xs w-8 text-right ${muted}`}>{sub.attendance}%</span>
                </div>
                <div className={`text-xs mt-1 ${muted}`}>By {sub.faculty} &middot; Required: 75%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
