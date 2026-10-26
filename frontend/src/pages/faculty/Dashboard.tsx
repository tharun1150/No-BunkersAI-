import { Users, CalendarCheck, AlertTriangle, Clock, ChevronRight, BookOpen } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { todaysClasses, monthlyTrend } from "../../data/mockData";

interface Props { darkMode: boolean; onNavigate: (p: string) => void; }

export default function FacultyDashboard({ darkMode, onNavigate }: Props) {
  const dm = darkMode;
  const card = `rounded-xl border ${dm ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} shadow-sm`;
  const muted = dm ? "text-gray-400" : "text-gray-500";
  const heading = dm ? "text-white" : "text-gray-900";

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Good Morning, Dr. Kumar 👋</h1>
        <p className={`text-sm mt-1 ${muted}`}>Thursday, 21 August 2026 — Here's your daily overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Classes", value: "5", sub: "Scheduled", icon: <CalendarCheck size={20} />, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Total Students", value: "240", sub: "Across sections", icon: <Users size={20} />, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Avg. Attendance Today", value: "87%", sub: "Present students", icon: <BookOpen size={20} />, color: "text-green-600", bg: "bg-green-50" },
          { label: "At-Risk Students", value: "18", sub: "Below 75%", icon: <AlertTriangle size={20} />, color: "text-red-500", bg: "bg-red-50" },
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

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Today's Classes */}
        <div className={`lg:col-span-2 ${card} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`font-bold text-sm ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Today's Classes</h2>
            <button onClick={() => onNavigate("classes")} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {todaysClasses.map(cls => {
              const isPast = cls.time.includes("AM") && parseInt(cls.time) < 11;
              const isCurrent = cls.time === "11:00 AM";
              return (
                <div key={cls.id} className={`flex items-center gap-4 p-4 rounded-xl border ${dm ? "border-gray-700 bg-gray-800" : "border-gray-100 bg-gray-50"} ${isCurrent ? "border-indigo-200 bg-indigo-50" : ""}`}>
                  <div className="text-center w-16 shrink-0">
                    <div className={`text-xs font-bold ${isCurrent ? "text-indigo-600" : heading}`}>{cls.time}</div>
                    {isCurrent && <span className="badge badge-info text-xs" style={{ fontSize: 10 }}>Now</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm ${heading}`}>{cls.subject}</div>
                    <div className={`text-xs ${muted}`}>{cls.section} &middot; {cls.room} &middot; {cls.totalStudents} students</div>
                  </div>
                  {isPast || isCurrent ? (
                    <div className="text-right shrink-0">
                      <div className={`text-sm font-bold ${cls.attendance >= 85 ? "text-green-600" : "text-yellow-600"}`}>{cls.attendance}%</div>
                      <div className={`text-xs ${muted}`}>{cls.present}/{cls.totalStudents}</div>
                    </div>
                  ) : null}
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => onNavigate("mark-attendance")} className="btn-primary text-xs px-3 py-1.5">Mark</button>
                    <button onClick={() => onNavigate("classes")} className="btn-secondary text-xs px-3 py-1.5">View</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly trend */}
        <div className={`${card} p-5`}>
          <h2 className={`font-bold text-sm mb-4 ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Monthly Trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyTrend}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={[70, 100]} />
              <CartesianGrid strokeDasharray="3 3" stroke={dm ? "#1e293b" : "#f1f5f9"} />
              <Tooltip contentStyle={{ fontSize: 12, background: dm ? "#1e293b" : "white", border: "1px solid #e2e8f0", borderRadius: 8 }} />
              <Bar dataKey="attendance" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Attendance %" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className={muted}>Best Month</span>
              <span className={`font-semibold ${heading}`}>January — 88%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className={muted}>Overall Avg.</span>
              <span className={`font-semibold ${heading}`}>83.4%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick at-risk */}
      <div className={`${card} p-5`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`font-bold text-sm ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>At-Risk Students</h2>
          <button onClick={() => onNavigate("at-risk")} className="text-xs text-indigo-600 font-medium flex items-center gap-1">View All <ChevronRight size={14} /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b text-xs font-semibold ${dm ? "text-gray-500 border-gray-700" : "text-gray-400 border-gray-100"}`}>
                <th className="text-left py-2 pr-4">Student</th>
                <th className="text-left py-2 pr-4">Section</th>
                <th className="text-left py-2 pr-4">Attendance</th>
                <th className="text-left py-2 pr-4">Risk</th>
                <th className="text-left py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "Sai Teja", section: "CSE-4A", att: 62, risk: "Critical" },
                { name: "Kavya Nair", section: "CSE-4B", att: 68, risk: "High" },
                { name: "Divya Menon", section: "CSE-4A", att: 55, risk: "Critical" },
                { name: "Rahul Kumar", section: "CSE-4A", att: 72, risk: "Warning" },
              ].map(s => (
                <tr key={s.name} className={`table-row text-xs ${dm ? "text-gray-300 border-gray-700" : "text-gray-700 border-gray-50"}`}>
                  <td className="py-3 pr-4 font-medium">{s.name}</td>
                  <td className="py-3 pr-4">{s.section}</td>
                  <td className="py-3 pr-4">
                    <span className={`font-bold ${s.att < 65 ? "text-red-500" : s.att < 75 ? "text-yellow-600" : "text-green-600"}`}>{s.att}%</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`badge ${s.risk === "Critical" ? "badge-danger" : s.risk === "High" ? "badge-warning" : "badge-gray"}`}>{s.risk}</span>
                  </td>
                  <td className="py-3">
                    <button className="text-indigo-600 text-xs hover:underline font-medium">Notify</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
