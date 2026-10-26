import { useState } from "react";
import { Eye, EyeOff, GraduationCap, ArrowLeft, Shield } from "lucide-react";
import type { Role } from "../data/mockData";

interface Props {
  onLogin: (role: Role) => void;
  onBack: () => void;
  darkMode: boolean;
}

const roles: { key: Role; label: string; desc: string; color: string; icon: string }[] = [
  { key: "student", label: "Student", desc: "Access attendance, timetable & leave", color: "#4f46e5", icon: "🎓" },
  { key: "faculty", label: "Faculty", desc: "Mark attendance & manage classes", color: "#7c3aed", icon: "👨‍🏫" },
  { key: "admin", label: "Administrator", desc: "Full college management access", color: "#0f766e", icon: "🏛️" },
  { key: "parent", label: "Parent", desc: "Monitor child's attendance", color: "#b45309", icon: "👨‍👩‍👧" },
];

export default function Login({ onLogin, onBack, darkMode }: Props) {
  const [selectedRole, setSelectedRole] = useState<Role>("student");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);

  const card = darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200";
  const inputClass = `w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors ${darkMode ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500" : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-indigo-500"}`;

  return (
    <div className={`min-h-screen flex ${darkMode ? "bg-gray-950" : "bg-gray-50"}`}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-indigo-600 p-12 text-white">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold">A</div>
            <span className="text-xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AttendAI</span>
          </div>
          <h2 className="text-3xl font-bold mb-4 leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Smart Attendance for Smart Colleges
          </h2>
          <p className="text-indigo-100 leading-relaxed">
            Real-time tracking, AI-powered insights, and automated parent communication — all in one platform.
          </p>
        </div>
        <div className="space-y-4">
          {[
            { icon: "✓", text: "Real-time attendance marking" },
            { icon: "✓", text: "AI-powered at-risk detection" },
            { icon: "✓", text: "Automated parent notifications" },
            { icon: "✓", text: "Comprehensive analytics & reports" },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-3 text-sm">
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">{item.icon}</span>
              <span className="text-indigo-100">{item.text}</span>
            </div>
          ))}
        </div>
        <div className="text-indigo-200 text-sm">© 2026 AttendAI — All rights reserved</div>
      </div>

      {/* Right panel */}
      <div className={`flex-1 flex flex-col items-center justify-center p-6 ${darkMode ? "bg-gray-950" : "bg-gray-50"}`}>
        <div className="w-full max-w-md">
          <button onClick={onBack} className={`flex items-center gap-2 text-sm mb-8 ${darkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"} transition-colors`}>
            <ArrowLeft size={16} /> Back to Home
          </button>

          <div className={`rounded-2xl border p-8 shadow-sm ${card}`}>
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white mx-auto mb-4">
                <Shield size={24} />
              </div>
              <h1 className={`text-xl font-bold mb-1 ${darkMode ? "text-white" : "text-gray-900"}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Welcome to AttendAI</h1>
              <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Sign in to your account</p>
            </div>

            {/* Role selector */}
            <div className="mb-6">
              <label className={`text-xs font-semibold mb-2 block ${darkMode ? "text-gray-400" : "text-gray-500"}`}>LOGIN AS</label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map(r => (
                  <button
                    key={r.key}
                    onClick={() => setSelectedRole(r.key)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${selectedRole === r.key
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : darkMode
                        ? "border-gray-700 text-gray-300 hover:border-gray-600"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    style={selectedRole === r.key ? { borderColor: r.color, backgroundColor: r.color + "10", color: r.color } : {}}
                  >
                    <span className="text-lg">{r.icon}</span>
                    <div>
                      <div className="text-xs font-bold">{r.label}</div>
                      <div className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`} style={{ fontSize: 10 }}>{r.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4 mb-5">
              <div>
                <label className={`text-xs font-semibold mb-1.5 block ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                  {selectedRole === "student" ? "College ID / Email" : "Email Address"}
                </label>
                <input
                  type="text"
                  placeholder={selectedRole === "student" ? "21CS001 or student@college.edu" : "faculty@college.edu"}
                  className={inputClass}
                  defaultValue={selectedRole === "student" ? "21CS001" : selectedRole === "faculty" ? "dr.kumar@college.edu" : selectedRole === "admin" ? "admin@college.edu" : "parent@college.edu"}
                />
              </div>
              <div>
                <label className={`text-xs font-semibold mb-1.5 block ${darkMode ? "text-gray-400" : "text-gray-600"}`}>Password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="Enter your password"
                    className={`${inputClass} pr-10`}
                    defaultValue="••••••••"
                  />
                  <button
                    onClick={() => setShowPass(!showPass)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${darkMode ? "text-gray-500" : "text-gray-400"}`}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="rounded" />
                  <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Remember me</span>
                </label>
                <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Forgot password?</button>
              </div>
            </div>

            <button onClick={() => onLogin(selectedRole)} className="btn-primary w-full py-2.5 mb-4">
              Sign In to {roles.find(r => r.key === selectedRole)?.label} Portal
            </button>

            <div className={`relative mb-4 ${darkMode ? "text-gray-600" : "text-gray-300"}`}>
              <div className="absolute inset-0 flex items-center"><div className={`w-full border-t ${darkMode ? "border-gray-800" : "border-gray-100"}`} /></div>
              <div className="relative text-center"><span className={`px-3 text-xs ${darkMode ? "bg-gray-900 text-gray-500" : "bg-white text-gray-400"}`}>Quick Demo Access</span></div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {roles.map(r => (
                <button
                  key={r.key}
                  onClick={() => onLogin(r.key)}
                  className={`text-xs py-2 px-3 rounded-lg border font-semibold transition-colors ${darkMode ? "border-gray-700 text-gray-300 hover:border-gray-600 hover:bg-gray-800" : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"}`}
                >
                  {r.icon} Demo as {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
