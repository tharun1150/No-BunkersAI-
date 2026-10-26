import { Download, FileText, Filter } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend, AreaChart, Area } from "recharts";
import { monthlyTrend, deptAttendance, attendanceTrend30Days } from "../../data/mockData";

interface Props { darkMode: boolean; }

const subjectData = [
  { subject: "Mathematics", attendance: 92 },
  { subject: "Python", attendance: 85 },
  { subject: "DBMS", attendance: 76 },
  { subject: "Networks", attendance: 68 },
  { subject: "ML", attendance: 59 },
];

export default function Reports({ darkMode }: Props) {
  const dm = darkMode;
  const card = `rounded-xl border ${dm ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} shadow-sm`;
  const muted = dm ? "text-gray-400" : "text-gray-500";
  const heading = dm ? "text-white" : "text-gray-900";
  const inputClass = `px-3 py-2 rounded-lg border text-sm outline-none ${dm ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-700"}`;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Attendance Reports</h1>
          <p className={`text-sm mt-1 ${muted}`}>Analytics & exportable reports</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2 text-sm"><Download size={15} /> CSV</button>
          <button className="btn-primary flex items-center gap-2 text-sm"><FileText size={15} /> PDF</button>
        </div>
      </div>

      {/* Filters */}
      <div className={`flex flex-wrap gap-3 p-4 rounded-xl border ${dm ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
        <select className={inputClass}><option>All Departments</option></select>
        <select className={inputClass}><option>All Years</option></select>
        <select className={inputClass}><option>All Sections</option></select>
        <select className={inputClass}><option>All Subjects</option></select>
        <select className={inputClass}><option>Aug 2026</option><option>Jul 2026</option></select>
        <button className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${dm ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"}`}>
          <Filter size={14} /> Apply
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Monthly trend */}
        <div className={`${card} p-5`}>
          <h2 className={`font-bold text-sm mb-4 ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Monthly Attendance Trend</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthlyTrend}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={[70, 100]} />
              <CartesianGrid strokeDasharray="3 3" stroke={dm ? "#1e293b" : "#f1f5f9"} />
              <Tooltip contentStyle={{ fontSize: 12, background: dm ? "#1e293b" : "white", border: "1px solid #e2e8f0", borderRadius: 8, color: dm ? "#f1f5f9" : "#0f172a" }} />
              <Line type="monotone" dataKey="attendance" stroke="#4f46e5" strokeWidth={2} dot={{ fill: "#4f46e5", r: 4 }} name="Attendance %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Dept comparison */}
        <div className={`${card} p-5`}>
          <h2 className={`font-bold text-sm mb-4 ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Department Comparison</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={deptAttendance}>
              <XAxis dataKey="dept" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={[70, 100]} />
              <CartesianGrid strokeDasharray="3 3" stroke={dm ? "#1e293b" : "#f1f5f9"} />
              <Tooltip contentStyle={{ fontSize: 12, background: dm ? "#1e293b" : "white", border: "1px solid #e2e8f0", borderRadius: 8 }} />
              <Bar dataKey="attendance" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Attendance %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Subject attendance */}
        <div className={`${card} p-5`}>
          <h2 className={`font-bold text-sm mb-4 ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Subject-wise Attendance</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={subjectData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <YAxis dataKey="subject" type="category" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={60} />
              <Tooltip contentStyle={{ fontSize: 12, background: dm ? "#1e293b" : "white", border: "1px solid #e2e8f0", borderRadius: 8 }} />
              <Bar dataKey="attendance" radius={[0, 4, 4, 0]} name="Attendance %">
                {subjectData.map((s, i) => <rect key={i} fill={s.attendance >= 85 ? "#16a34a" : s.attendance >= 75 ? "#d97706" : "#dc2626"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 30-day area */}
        <div className={`${card} p-5`}>
          <h2 className={`font-bold text-sm mb-4 ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>30-Day Absenteeism</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={attendanceTrend30Days.slice(-14)}>
              <defs>
                <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <CartesianGrid strokeDasharray="3 3" stroke={dm ? "#1e293b" : "#f1f5f9"} />
              <Tooltip contentStyle={{ fontSize: 12, background: dm ? "#1e293b" : "white", border: "1px solid #e2e8f0", borderRadius: 8 }} />
              <Area type="monotone" dataKey="present" stroke="#dc2626" fill="url(#rg)" strokeWidth={2} dot={false} name="Present" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
