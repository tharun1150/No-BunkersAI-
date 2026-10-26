import { useState } from "react";
import { CalendarDays, Filter, Download } from "lucide-react";
import { attendanceHistory, calendarData, subjects } from "../../data/mockData";

interface Props { darkMode: boolean; }

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Calendar({ year, month, data, darkMode }: { year: number; month: number; data: Record<string, "Present" | "Absent" | "Late">; darkMode: boolean }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div className="grid grid-cols-7 mb-2">
        {daysOfWeek.map(d => (
          <div key={d} className={`text-center text-xs font-semibold py-1 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const status = data[key];
          const isToday = day === 21 && month === 7;
          let bg = "";
          let text = "";
          if (status === "Present") { bg = "bg-green-100"; text = "text-green-700"; }
          else if (status === "Absent") { bg = "bg-red-100"; text = "text-red-600"; }
          else if (status === "Late") { bg = "bg-yellow-100"; text = "text-yellow-700"; }
          else { bg = darkMode ? "bg-gray-800" : "bg-gray-50"; text = darkMode ? "text-gray-400" : "text-gray-400"; }
          return (
            <div key={i} className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${bg} ${text} ${isToday ? "ring-2 ring-indigo-500" : ""}`}>
              {day}
              {status && <span className="text-xs" style={{ fontSize: 7 }}>{status === "Present" ? "✓" : status === "Absent" ? "✗" : "~"}</span>}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3">
        {[["bg-green-100 text-green-700", "Present"], ["bg-red-100 text-red-600", "Absent"], ["bg-yellow-100 text-yellow-700", "Late"]].map(([cls, label]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${cls.split(" ")[0]}`} />
            <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StudentAttendance({ darkMode }: Props) {
  const [filterSubject, setFilterSubject] = useState("All");
  const dm = darkMode;
  const card = `rounded-xl border p-5 ${dm ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} shadow-sm`;
  const muted = dm ? "text-gray-400" : "text-gray-500";
  const heading = dm ? "text-white" : "text-gray-900";
  const inputClass = `px-3 py-2 rounded-lg border text-sm outline-none ${dm ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-700"}`;
  const tableHead = dm ? "text-gray-500 border-gray-800" : "text-gray-400 border-gray-100";
  const tableRow = dm ? "border-gray-800 text-gray-300" : "border-gray-50 text-gray-700";

  const filtered = filterSubject === "All" ? attendanceHistory : attendanceHistory.filter(r => r.subject === filterSubject);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>My Attendance</h1>
          <p className={`text-sm mt-1 ${muted}`}>Detailed attendance records — August 2026</p>
        </div>
        <button className="btn-secondary flex items-center gap-2 text-sm"><Download size={15} /> Export</button>
      </div>

      {/* Filters */}
      <div className={`flex flex-wrap gap-3 p-4 rounded-xl border ${dm ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
        <select className={inputClass} defaultValue="Odd Semester 2026"><option>Odd Semester 2026</option></select>
        <select className={inputClass} onChange={e => setFilterSubject(e.target.value)}>
          <option value="All">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
        <select className={inputClass} defaultValue="Aug 2026"><option>Aug 2026</option></select>
        <button className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${dm ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"}`}>
          <Filter size={14} /> Date Range
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Overall", value: "82.5%", color: "text-indigo-600" },
          { label: "Total Classes", value: "180", color: heading },
          { label: "Present", value: "148", color: "text-green-600" },
          { label: "Absent", value: "32", color: "text-red-500" },
        ].map(s => (
          <div key={s.label} className={`stat-card ${dm ? "bg-gray-900 border-gray-800" : ""}`}>
            <p className={`text-xs font-semibold mb-1 ${muted}`}>{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays size={18} className="text-indigo-600" />
          <h2 className={`font-bold text-sm ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>August 2026 Calendar</h2>
        </div>
        <Calendar year={2026} month={7} data={calendarData} darkMode={dm} />
      </div>

      {/* Table */}
      <div className={card}>
        <h2 className={`font-bold text-sm mb-4 ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Attendance Records</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b text-xs font-semibold ${tableHead}`}>
                <th className="text-left py-2 pr-4">Date</th>
                <th className="text-left py-2 pr-4">Subject</th>
                <th className="text-left py-2 pr-4">Faculty</th>
                <th className="text-left py-2 pr-4">Time</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((rec, i) => (
                <tr key={i} className={`table-row ${tableRow}`}>
                  <td className="py-3 pr-4 text-xs font-medium">{rec.date}</td>
                  <td className="py-3 pr-4 text-xs">{rec.subject}</td>
                  <td className="py-3 pr-4 text-xs">{rec.faculty}</td>
                  <td className="py-3 pr-4 text-xs font-mono">{rec.time}</td>
                  <td className="py-3">
                    <span className={`badge ${rec.status === "Present" ? "badge-success" : rec.status === "Absent" ? "badge-danger" : "badge-warning"}`}>
                      {rec.status}
                    </span>
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
