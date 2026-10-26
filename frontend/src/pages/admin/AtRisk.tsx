import { AlertTriangle, Brain, Phone, Mail, TrendingDown } from "lucide-react";
import { atRiskStudents } from "../../data/mockData";

interface Props { darkMode: boolean; }

export default function AtRisk({ darkMode }: Props) {
  const dm = darkMode;
  const card = `rounded-xl border ${dm ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} shadow-sm`;
  const muted = dm ? "text-gray-400" : "text-gray-500";
  const heading = dm ? "text-white" : "text-gray-900";

  const critical = atRiskStudents.filter(s => s.attendance < 65).length;
  const high = atRiskStudents.filter(s => s.attendance >= 65 && s.attendance < 75).length;
  const warning = atRiskStudents.filter(s => s.attendance >= 75 && s.attendance < 80).length;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Students At Risk</h1>
          <p className={`text-sm mt-1 ${muted}`}>AI-powered attendance monitoring</p>
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm"><Phone size={15} /> Notify All</button>
      </div>

      {/* Risk summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Critical", value: critical || 42, desc: "Below 65%", color: "text-red-500", bg: dm ? "bg-red-900/20 border-red-900/50" : "bg-red-50 border-red-100", icon: "🔴" },
          { label: "High Risk", value: high || 61, desc: "65–74%", color: "text-orange-500", bg: dm ? "bg-orange-900/20 border-orange-900/50" : "bg-orange-50 border-orange-100", icon: "🟠" },
          { label: "Warning", value: warning || 80, desc: "75–79%", color: "text-yellow-600", bg: dm ? "bg-yellow-900/20 border-yellow-900/50" : "bg-yellow-50 border-yellow-100", icon: "🟡" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-5 text-center ${s.bg}`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className={`text-3xl font-bold ${s.color}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.value}</div>
            <div className={`text-sm font-semibold mt-1 ${heading}`}>{s.label}</div>
            <div className={`text-xs ${muted}`}>{s.desc}</div>
          </div>
        ))}
      </div>

      {/* AI Insight */}
      <div className={`${card} p-5 border-indigo-200 ${dm ? "border-indigo-900/50 bg-indigo-900/10" : "bg-indigo-50/50"}`}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
            <Brain size={18} />
          </div>
          <div>
            <h3 className={`font-bold text-sm mb-1 ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AI Insight</h3>
            <p className={`text-sm ${muted}`}>
              42 students currently have attendance below 65%. 18 of them have shown a continuous decline over the last 30 days.
              CSE 4th year shows the highest concentration of at-risk students (31%). Friday absenteeism is 17.4% — highest of any weekday.
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={`${card} p-5`}>
        <h2 className={`font-bold text-sm mb-4 ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>At-Risk Student List</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b text-xs font-semibold ${dm ? "text-gray-500 border-gray-700" : "text-gray-400 border-gray-100"}`}>
                <th className="text-left py-2 pr-4">Student</th>
                <th className="text-left py-2 pr-4">Department</th>
                <th className="text-left py-2 pr-4">Attendance</th>
                <th className="text-left py-2 pr-4">Required</th>
                <th className="text-left py-2 pr-4">Risk Level</th>
                <th className="text-left py-2 pr-4">AI Insight</th>
                <th className="text-left py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {atRiskStudents.map(s => (
                <tr key={s.id} className={`table-row text-xs ${dm ? "text-gray-300 border-gray-700" : "text-gray-700 border-gray-50"}`}>
                  <td className="py-3 pr-4">
                    <div className={`font-semibold ${heading}`}>{s.name}</div>
                    <div className={`text-xs ${muted}`}>{s.rollNo} · {s.section}</div>
                  </td>
                  <td className="py-3 pr-4">{s.department}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1.5">
                      <TrendingDown size={12} className="text-red-400" />
                      <span className={`font-bold ${s.attendance < 65 ? "text-red-500" : "text-orange-500"}`}>{s.attendance}%</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-indigo-600 font-medium">75%</td>
                  <td className="py-3 pr-4">
                    <span className={`badge ${s.riskLevel === "Critical" ? "badge-danger" : s.riskLevel === "High" ? "badge-warning" : "badge-gray"}`}>
                      {s.riskLevel}
                    </span>
                  </td>
                  <td className={`py-3 pr-4 max-w-48 ${muted}`}>↓{s.lastDropPercent}% in 30 days</td>
                  <td className="py-3">
                    <div className="flex gap-1.5">
                      <button className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-medium hover:bg-indigo-100 transition-colors">
                        <Phone size={12} /> Call
                      </button>
                      <button className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 text-gray-600 text-xs font-medium hover:bg-gray-100 transition-colors">
                        <Mail size={12} /> Mail
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {/* Fill with more rows to show scale */}
              {Array.from({ length: 6 }, (_, i) => ({
                name: ["Arun Krishnamurthy", "Deepa Subramaniam", "Ganesh Pillai", "Hema Nair", "Ishaan Malhotra", "Jaya Patel"][i],
                rollNo: `21CS0${30 + i}`,
                section: "CSE-4B",
                department: "CSE",
                attendance: [63, 69, 61, 72, 58, 66][i],
                riskLevel: ["Critical", "High", "Critical", "Warning", "Critical", "High"][i],
                lastDropPercent: [8, 5, 13, 3, 17, 7][i],
              })).map(s => (
                <tr key={s.name} className={`table-row text-xs ${dm ? "text-gray-300 border-gray-700" : "text-gray-700 border-gray-50"}`}>
                  <td className="py-3 pr-4">
                    <div className={`font-semibold ${heading}`}>{s.name}</div>
                    <div className={`text-xs ${muted}`}>{s.rollNo} · {s.section}</div>
                  </td>
                  <td className="py-3 pr-4">{s.department}</td>
                  <td className="py-3 pr-4">
                    <span className={`font-bold ${s.attendance < 65 ? "text-red-500" : "text-orange-500"}`}>{s.attendance}%</span>
                  </td>
                  <td className="py-3 pr-4 text-indigo-600 font-medium">75%</td>
                  <td className="py-3 pr-4">
                    <span className={`badge ${s.riskLevel === "Critical" ? "badge-danger" : s.riskLevel === "High" ? "badge-warning" : "badge-gray"}`}>{s.riskLevel}</span>
                  </td>
                  <td className={`py-3 pr-4 ${muted}`}>↓{s.lastDropPercent}% in 30 days</td>
                  <td className="py-3">
                    <button className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-medium hover:bg-indigo-100 transition-colors">Contact</button>
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

