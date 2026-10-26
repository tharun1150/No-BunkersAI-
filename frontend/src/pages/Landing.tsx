import { useState } from "react";
import {
  CheckCircle, BarChart3, Users, Bell, FileText, Brain,
  ArrowRight, ChevronRight, GraduationCap, Menu, X,
  TrendingUp, AlertTriangle, Shield
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const previewData = [
  { day: "Mon", pct: 88 }, { day: "Tue", pct: 91 }, { day: "Wed", pct: 85 },
  { day: "Thu", pct: 93 }, { day: "Fri", pct: 79 }, { day: "Sat", pct: 82 },
];

const features = [
  { icon: <CheckCircle size={22} />, title: "Real-time Attendance", desc: "Mark and track attendance instantly with live updates across all dashboards." },
  { icon: <GraduationCap size={22} />, title: "Student Dashboard", desc: "Students get a personal view of their attendance, subject-wise analytics, and risk alerts." },
  { icon: <Users size={22} />, title: "Faculty Dashboard", desc: "Faculty can manage classes, mark attendance, and monitor student performance in one place." },
  { icon: <Brain size={22} />, title: "AI Attendance Analytics", desc: "AI-driven insights predict at-risk students before attendance falls critically low." },
  { icon: <Bell size={22} />, title: "Parent Notifications", desc: "Automated SMS and AI voice calls keep parents informed about their child's attendance." },
  { icon: <FileText size={22} />, title: "Attendance Reports", desc: "Generate detailed reports by department, section, or individual student with one click." },
];

interface Props {
  onLogin: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
}

export default function Landing({ onLogin, darkMode, onToggleDark }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const bg = darkMode ? "bg-gray-950" : "bg-white";
  const text = darkMode ? "text-white" : "text-gray-900";
  const muted = darkMode ? "text-gray-400" : "text-gray-500";
  const surface = darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200";
  const navBg = darkMode ? "bg-gray-950/95 border-gray-800" : "bg-white/95 border-gray-200";

  return (
    <div className={`min-h-screen ${bg} ${text}`}>
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center px-4 lg:px-8 h-16 border-b backdrop-blur-sm ${navBg}`}>
        <div className="flex items-center gap-2 mr-8">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">A</div>
          <span className="font-bold text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AttendAI</span>
        </div>
        <div className="hidden md:flex items-center gap-6 flex-1">
          {["Features", "How It Works", "For Students", "For Faculty", "Contact"].map(item => (
            <button key={item} className={`text-sm font-medium transition-colors ${muted} hover:text-indigo-600`}>{item}</button>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3 ml-auto">
          <button onClick={onLogin} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Login</button>
          <button onClick={onLogin} className="btn-primary text-sm">Get Started <ArrowRight size={14} className="inline ml-1" /></button>
        </div>
        <button className="md:hidden ml-auto p-2" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className={`fixed top-16 left-0 right-0 z-40 p-4 border-b ${surface} md:hidden`}>
          {["Features", "How It Works", "For Students", "For Faculty", "Contact"].map(item => (
            <button key={item} className={`block w-full text-left py-3 text-sm border-b ${darkMode ? "border-gray-800" : "border-gray-100"} ${muted}`}>{item}</button>
          ))}
          <button onClick={onLogin} className="btn-primary w-full mt-4">Get Started</button>
        </div>
      )}

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Now with AI-powered attendance intelligence
          </div>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Smart Attendance Management for
                <span className="text-indigo-600"> Modern Colleges</span>
              </h1>
              <p className={`text-lg leading-relaxed mb-8 ${muted}`}>
                Track attendance, identify at-risk students, automate parent notifications, and give faculty and students a complete real-time attendance experience.
              </p>
              <div className="flex flex-wrap gap-3">
                <button onClick={onLogin} className="btn-primary flex items-center gap-2 text-sm px-5 py-2.5">
                  Get Started <ArrowRight size={16} />
                </button>
                <button onClick={onLogin} className="btn-secondary flex items-center gap-2 text-sm px-5 py-2.5">
                  View Demo <ChevronRight size={16} />
                </button>
              </div>
              <div className="flex items-center gap-6 mt-8">
                {[["4,820+", "Students"], ["245", "Faculty"], ["91.4%", "Avg. Attendance"]].map(([val, lbl]) => (
                  <div key={lbl}>
                    <div className="text-xl font-bold text-indigo-600" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{val}</div>
                    <div className={`text-xs ${muted}`}>{lbl}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dashboard Preview */}
            <div className={`rounded-2xl border p-5 shadow-2xl ${surface}`}>
              <div className={`flex items-center justify-between mb-4 pb-4 border-b ${darkMode ? "border-gray-700" : "border-gray-100"}`}>
                <div>
                  <div className="font-bold text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Attendance Overview</div>
                  <div className={`text-xs ${muted}`}>CSE Department — Aug 2026</div>
                </div>
                <span className="badge badge-success">Live</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Overall", value: "91.4%", color: "text-indigo-600" },
                  { label: "Present", value: "4,403", color: "text-green-600" },
                  { label: "At-Risk", value: "183", color: "text-red-500" },
                ].map(item => (
                  <div key={item.label} className={`rounded-lg p-3 text-center ${darkMode ? "bg-gray-800" : "bg-gray-50"}`}>
                    <div className={`text-lg font-bold ${item.color}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item.value}</div>
                    <div className={`text-xs ${muted}`}>{item.label}</div>
                  </div>
                ))}
              </div>
              <div className="mb-4">
                <div className={`text-xs font-semibold mb-2 ${muted}`}>Weekly Attendance Trend</div>
                <ResponsiveContainer width="100%" height={100}>
                  <AreaChart data={previewData}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 11, background: darkMode ? "#1e293b" : "white", border: "1px solid #e2e8f0", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="pct" stroke="#4f46e5" fill="url(#grad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                <div className={`text-xs font-semibold ${muted} mb-1`}>At-Risk Students</div>
                {[
                  { name: "Sai Teja", dept: "CSE-4A", pct: 62, risk: "Critical" },
                  { name: "Kavya Nair", dept: "CSE-4B", pct: 68, risk: "High" },
                ].map(s => (
                  <div key={s.name} className={`flex items-center justify-between rounded-lg px-3 py-2 ${darkMode ? "bg-gray-800" : "bg-gray-50"}`}>
                    <div>
                      <div className="text-xs font-semibold">{s.name}</div>
                      <div className={`text-xs ${muted}`}>{s.dept}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-red-500">{s.pct}%</span>
                      <span className={`badge ${s.risk === "Critical" ? "badge-danger" : "badge-warning"} text-xs`}>{s.risk}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={`py-20 px-4 lg:px-8 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 mb-4">Everything you need</div>
            <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Built for every stakeholder</h2>
            <p className={`${muted} max-w-xl mx-auto`}>AttendAI covers the entire attendance lifecycle — from marking to reporting to AI-driven intervention.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className={`rounded-xl border p-6 hover:shadow-md transition-shadow ${surface}`}>
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">{f.icon}</div>
                <h3 className="font-bold mb-2 text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{f.title}</h3>
                <p className={`text-sm leading-relaxed ${muted}`}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-4 lg:px-8 bg-indigo-600">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
          {[["98%", "Uptime SLA"], ["4,820+", "Active Students"], ["< 2s", "Sync Speed"], ["183", "Alerts This Month"]].map(([val, lbl]) => (
            <div key={lbl}>
              <div className="text-3xl font-bold mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{val}</div>
              <div className="text-sm text-indigo-200">{lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className={`py-20 px-4 text-center ${darkMode ? "bg-gray-950" : "bg-white"}`}>
        <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Ready to modernize attendance?</h2>
        <p className={`${muted} mb-8`}>Join hundreds of colleges already using AttendAI.</p>
        <button onClick={onLogin} className="btn-primary px-8 py-3">
          Try the Demo <ArrowRight size={16} className="inline ml-2" />
        </button>
      </section>

      {/* Footer */}
      <footer className={`border-t ${darkMode ? "border-gray-800 bg-gray-950 text-gray-500" : "border-gray-100 bg-gray-50 text-gray-400"} px-8 py-6 text-center text-sm`}>
        © 2026 AttendAI. Smart College Attendance Management Platform.
      </footer>
    </div>
  );
}
