import { Users, UserCheck, TrendingUp, AlertTriangle, ChevronRight, Building2 } from "lucide-react";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell } from "recharts";
import { adminStudentStats, deptAttendance, monthlyTrend, dailyAttendance } from "../../data/mockData";

interface Props { darkMode: boolean; onNavigate: (p: string) => void; }

const COLORS = ["#4f46e5", "#7c3aed", "#0f766e", "#b45309", "#0284c7", "#16a34a", "#dc2626"];

export default function AdminDashboard({ darkMode, onNavigate }: Props) {
  const dm = darkMode;
  const card = `rounded-xl border ${dm ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} shadow-sm`;
  const muted = dm ? "text-gray-400" : "text-gray-500";
  const heading = dm ? "text-white" : "text-gray-900";

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>College Overview</h1>
          <p className={`text-sm mt-1 ${muted}`}>Admin Dashboard — 21 August 2026</p>
        </div>
        <span className="badge badge-success">Live Data</span>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Students", value: "4,820", sub: "+124 this semester", icon: <Users size={20} />, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Faculty Members", value: "245", sub: "Active staff", icon: <UserCheck size={20} />, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Today's Attendance", value: "91.4%", sub: "4,403 present", icon: <TrendingUp size={20} />, color: "text-green-600", bg: "bg-green-50" },
          { label: "At-Risk Students", value: "183", sub: "Need intervention", icon: <AlertTriangle size={20} />, color: "text-red-500", bg: "bg-red-50" },
        ].map(s => (
          <div key={s.label} className={`stat-card ${dm ? "bg-gray-900 border-gray-800" : ""}`}>
            <div className="flex items-start justify-between mb-3">
              <p className={`text-xs font-semibold ${muted}`}>{s.label}</p>
              <div className={`w-8 h-8 rounded-lg ${s.bg} ${s.color} flex items-center justify-center`}>{s.icon}</div>
            </div>
            <p className={`text-2xl font-bold ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.value}</p>
            <p className={`text-xs mt-1 ${muted}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Monthly trend */}
        <div className={`${card} p-5`}>
          <h2 className={`font-bold text-sm mb-4 ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>College Attendance Trend</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={monthlyTrend}>
              <defs>
                <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={[70, 100]} />
              <CartesianGrid strokeDasharray="3 3" stroke={dm ? "#1e293b" : "#f1f5f9"} />
              <Tooltip contentStyle={{ fontSize: 12, background: dm ? "#1e293b" : "white", border: "1px solid #e2e8f0", borderRadius: 8, color: dm ? "#f1f5f9" : "#0f172a" }} />
              <Area type="monotone" dataKey="attendance" stroke="#4f46e5" fill="url(#ag)" strokeWidth={2} dot={false} name="Attendance %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Department attendance */}
        <div className={`${card} p-5`}>
          <h2 className={`font-bold text-sm mb-4 ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Department Attendance</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={deptAttendance} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={[70, 100]} />
              <YAxis dataKey="dept" type="category" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={{ fontSize: 12, background: dm ? "#1e293b" : "white", border: "1px solid #e2e8f0", borderRadius: 8, color: dm ? "#f1f5f9" : "#0f172a" }} />
              <Bar dataKey="attendance" radius={[0, 4, 4, 0]} name="Attendance %">
                {deptAttendance.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily */}
      <div className={`${card} p-5`}>
        <h2 className={`font-bold text-sm mb-4 ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Daily Attendance This Week</h2>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={dailyAttendance}>
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <CartesianGrid strokeDasharray="3 3" stroke={dm ? "#1e293b" : "#f1f5f9"} />
            <Tooltip contentStyle={{ fontSize: 12, background: dm ? "#1e293b" : "white", border: "1px solid #e2e8f0", borderRadius: 8, color: dm ? "#f1f5f9" : "#0f172a" }} />
            <Bar dataKey="present" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Present" />
            <Bar dataKey="absent" fill="#fee2e2" radius={[4, 4, 0, 0]} name="Absent" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Department cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className={`font-bold text-sm ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Departments</h2>
          <button onClick={() => onNavigate("departments")} className="text-xs text-indigo-600 flex items-center gap-1">View All <ChevronRight size={14} /></button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {adminStudentStats.byDepartment.slice(0, 4).map((dept, i) => (
            <div key={dept.dept} className={`${card} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: COLORS[i] }}>
                    {dept.dept[0]}
                  </div>
                  <span className={`font-bold text-sm ${heading}`}>{dept.dept}</span>
                </div>
                <span className={`font-bold text-lg ${dept.attendance >= 88 ? "text-green-600" : dept.attendance >= 84 ? "text-yellow-600" : "text-red-500"}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {dept.attendance}%
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${dept.attendance}%`, background: COLORS[i] }} />
              </div>
              <div className={`text-xs mt-2 ${muted}`}>{dept.total} students</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
