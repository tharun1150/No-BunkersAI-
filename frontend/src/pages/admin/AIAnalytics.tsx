import { useState } from "react";
import { Brain, TrendingDown, TrendingUp, AlertTriangle, Send, Bot, User } from "lucide-react";
import { aiInsights } from "../../data/mockData";

interface Props { darkMode: boolean; }

const chatHistory = [
  { role: "user", text: "Which students are at risk?" },
  { role: "ai", text: "42 students currently have attendance below 65%. 18 of them have shown a continuous decline over the last 30 days. I recommend initiating parent notifications for all 42 students immediately." },
  { role: "user", text: "Which subject has the highest absenteeism?" },
  { role: "ai", text: "Machine Learning (CS401) has the highest absenteeism rate at 41%. The second-highest is Computer Networks at 32%. Both subjects have classes on Friday afternoons — a high-absence time slot." },
];

const severityColors = {
  error: { bg: "bg-red-50 border-red-100", icon: "text-red-500", dark: "bg-red-900/10 border-red-900/30" },
  warning: { bg: "bg-yellow-50 border-yellow-100", icon: "text-yellow-600", dark: "bg-yellow-900/10 border-yellow-900/30" },
  success: { bg: "bg-green-50 border-green-100", icon: "text-green-600", dark: "bg-green-900/10 border-green-900/30" },
  info: { bg: "bg-blue-50 border-blue-100", icon: "text-blue-600", dark: "bg-blue-900/10 border-blue-900/30" },
};

export default function AIAnalytics({ darkMode }: Props) {
  const [messages, setMessages] = useState(chatHistory);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const dm = darkMode;
  const card = `rounded-xl border ${dm ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} shadow-sm`;
  const muted = dm ? "text-gray-400" : "text-gray-500";
  const heading = dm ? "text-white" : "text-gray-900";

  const send = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(m => [...m, { role: "user", text: userMsg }]);
    setLoading(true);
    setTimeout(() => {
      setMessages(m => [...m, { role: "ai", text: `Based on current data: ${userMsg.toLowerCase().includes("risk") ? "183 students are currently at risk. The critical group (below 65%) includes 42 students across all departments." : "The average college attendance is 91.4%. CSE department leads at 91%, while Mechanical is lowest at 82%."}` }]);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
          <Brain size={22} />
        </div>
        <div>
          <h1 className={`text-2xl font-bold ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AI Attendance Intelligence</h1>
          <p className={`text-sm ${muted}`}>Predictive analytics and intervention recommendations</p>
        </div>
      </div>

      {/* AI summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Likely to fall below 75%", value: "124", icon: <AlertTriangle size={18} />, color: "text-red-500", bg: "bg-red-50", dbg: "bg-red-900/20" },
          { label: "Students Improving", value: "86", icon: <TrendingUp size={18} />, color: "text-green-600", bg: "bg-green-50", dbg: "bg-green-900/20" },
          { label: "Students Declining", value: "143", icon: <TrendingDown size={18} />, color: "text-orange-500", bg: "bg-orange-50", dbg: "bg-orange-900/20" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-5 ${dm ? `border-gray-800 ${s.dbg}` : `border-gray-200 ${s.bg}`}`}>
            <div className={`w-8 h-8 rounded-lg ${dm ? "bg-gray-800" : s.bg} ${s.color} flex items-center justify-center mb-3`}>{s.icon}</div>
            <div className={`text-3xl font-bold ${s.color}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.value}</div>
            <div className={`text-xs mt-1 ${muted}`}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* AI Insights */}
        <div className={`${card} p-5`}>
          <h2 className={`font-bold text-sm mb-4 ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AI-Generated Insights</h2>
          <div className="space-y-3">
            {aiInsights.map((insight, i) => {
              const sev = severityColors[insight.severity as keyof typeof severityColors];
              return (
                <div key={i} className={`rounded-xl border p-3 ${dm ? sev.dark : sev.bg}`}>
                  <p className={`text-xs leading-relaxed ${dm ? "text-gray-300" : "text-gray-700"}`}>{insight.text}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Chat */}
        <div className={`${card} p-5 flex flex-col`}>
          <h2 className={`font-bold text-sm mb-4 ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AI Attendance Assistant</h2>
          <div className="flex-1 space-y-3 overflow-y-auto mb-4" style={{ maxHeight: 320 }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-xs ${m.role === "ai" ? "bg-indigo-600" : "bg-gray-400"}`}>
                  {m.role === "ai" ? <Bot size={14} /> : <User size={14} />}
                </div>
                <div className={`rounded-xl px-3 py-2 text-xs max-w-xs leading-relaxed ${m.role === "ai"
                  ? dm ? "bg-gray-800 text-gray-200" : "bg-gray-50 text-gray-700"
                  : "bg-indigo-600 text-white"
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 text-white"><Bot size={14} /></div>
                <div className={`rounded-xl px-4 py-2 text-xs ${dm ? "bg-gray-800 text-gray-400" : "bg-gray-50 text-gray-400"}`}>Analyzing...</div>
              </div>
            )}
          </div>
          <div className={`flex gap-2 border rounded-xl p-2 ${dm ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"}`}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Ask about attendance, at-risk students..."
              className={`flex-1 bg-transparent outline-none text-sm ${dm ? "text-white placeholder-gray-500" : "text-gray-700 placeholder-gray-400"}`}
            />
            <button onClick={send} className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors shrink-0">
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
