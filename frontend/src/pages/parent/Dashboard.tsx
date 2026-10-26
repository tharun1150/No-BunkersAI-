import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Bell, MessageSquare, ClipboardList, Calendar, AlertTriangle } from "lucide-react";
import { monthlyTrend, notifications } from "../../data/mockData";

interface Props { darkMode: boolean; onNavigate: (p: string) => void; }

export default function ParentDashboard({ darkMode, onNavigate }: Props) {
  const dm = darkMode;
  const card = `rounded-xl border ${dm ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} shadow-sm`;
  const muted = dm ? "text-gray-400" : "text-gray-500";
  const heading = dm ? "text-white" : "text-gray-900";

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Welcome, Mr. Kumar 👋</h1>
        <p className={`text-sm mt-1 ${muted}`}>21 August 2026 — Monitoring your child's attendance</p>
      </div>

      {/* Child info */}
      <div className={`${card} p-5 flex items-center gap-4`}>
        <div className="w-14 h-14 rounded-full bg-indigo-600 text-white text-xl font-bold flex items-center justify-center shrink-0">RK</div>
        <div className="flex-1">
          <h2 className={`font-bold text-lg ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Rahul Kumar</h2>
          <p className={`text-sm ${muted}`}>CSE — 4th Year, Section A &middot; Roll: 21CS001</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-yellow-600" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>72%</div>
          <div className={`text-xs ${muted}`}>Overall Attendance</div>
          <span className="badge badge-warning mt-1">Warning</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Today's Status", value: "Absent", sub: "Machine Learning", color: "text-red-500", bg: "bg-red-50 border-red-100" },
          { label: "Classes Today", value: "5", sub: "Scheduled", color: "text-indigo-600", bg: "" },
          { label: "Present Today", value: "3", sub: "Classes attended", color: "text-green-600", bg: "" },
          { label: "Absent Today", value: "2", sub: "Classes missed", color: "text-red-500", bg: "" },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.bg || ""} ${dm ? "bg-gray-900 border-gray-800" : ""}`}>
            <p className={`text-xs font-semibold mb-1 ${muted}`}>{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.value}</p>
            <p className={`text-xs mt-1 ${muted}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Chart */}
        <div className={`md:col-span-2 ${card} p-5`}>
          <h2 className={`font-bold text-sm mb-4 ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Attendance Trend</h2>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={monthlyTrend}>
              <defs>
                <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d97706" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={[60, 100]} />
              <CartesianGrid strokeDasharray="3 3" stroke={dm ? "#1e293b" : "#f1f5f9"} />
              <Tooltip contentStyle={{ fontSize: 12, background: dm ? "#1e293b" : "white", border: "1px solid #e2e8f0", borderRadius: 8, color: dm ? "#f1f5f9" : "#0f172a" }} />
              <Area type="monotone" dataKey="attendance" stroke="#d97706" fill="url(#pg)" strokeWidth={2} dot={false} name="Attendance %" />
            </AreaChart>
          </ResponsiveContainer>
          <div className={`mt-2 flex items-center gap-2 p-3 rounded-lg ${dm ? "bg-yellow-900/20" : "bg-yellow-50"} border ${dm ? "border-yellow-900/30" : "border-yellow-100"}`}>
            <AlertTriangle size={14} className="text-yellow-600 shrink-0" />
            <p className={`text-xs ${dm ? "text-yellow-300" : "text-yellow-700"}`}>Rahul's attendance has dropped from 81% to 72% over the last 2 months. Immediate attention needed to avoid academic consequences.</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className={`${card} p-5`}>
          <h2 className={`font-bold text-sm mb-4 ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Quick Actions</h2>
          <div className="space-y-2">
            {[
              { icon: <MessageSquare size={16} />, label: "Contact Faculty", color: "text-indigo-600", bg: "bg-indigo-50 hover:bg-indigo-100" },
              { icon: <ClipboardList size={16} />, label: "Apply for Leave", color: "text-purple-600", bg: "bg-purple-50 hover:bg-purple-100" },
              { icon: <Calendar size={16} />, label: "View Attendance", color: "text-green-600", bg: "bg-green-50 hover:bg-green-100", action: "attendance" },
              { icon: <Bell size={16} />, label: "All Notifications", color: "text-yellow-600", bg: "bg-yellow-50 hover:bg-yellow-100", action: "notifications" },
            ].map(action => (
              <button
                key={action.label}
                onClick={() => action.action && onNavigate(action.action)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${action.bg} ${action.color}`}
              >
                {action.icon}
                <span className="text-sm font-semibold">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className={`${card} p-5`}>
        <h2 className={`font-bold text-sm mb-4 ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Recent Alerts</h2>
        <div className="space-y-3">
          {notifications.slice(0, 4).map(n => (
            <div key={n.id} className={`flex items-start gap-3 p-3 rounded-xl ${n.severity === "error" ? (dm ? "bg-red-900/10 border-red-900/30" : "bg-red-50 border-red-100") : n.severity === "warning" ? (dm ? "bg-yellow-900/10 border-yellow-900/30" : "bg-yellow-50 border-yellow-100") : (dm ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-100")} border`}>
              <span className="text-base">{n.severity === "error" ? "🔴" : n.severity === "warning" ? "🟡" : "🔵"}</span>
              <div>
                <div className={`text-xs font-semibold ${heading}`}>{n.title}</div>
                <div className={`text-xs mt-0.5 ${muted}`}>{n.message}</div>
                <div className={`text-xs mt-1 ${muted}`}>{n.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
