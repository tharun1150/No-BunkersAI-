import { useState } from "react";
import { Bell, Check, Trash2, Filter } from "lucide-react";
import { notifications } from "../../data/mockData";
import type { Notification } from "../../data/mockData";

interface Props { darkMode: boolean; }

export default function Notifications({ darkMode }: Props) {
  const [items, setItems] = useState(notifications);
  const [filter, setFilter] = useState<"all" | "attendance" | "leave" | "college" | "system">("all");

  const dm = darkMode;
  const card = `rounded-xl border ${dm ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} shadow-sm`;
  const muted = dm ? "text-gray-400" : "text-gray-500";
  const heading = dm ? "text-white" : "text-gray-900";

  const filtered = filter === "all" ? items : items.filter(n => n.category === filter);
  const unreadCount = items.filter(n => !n.read).length;

  const markRead = (id: string) => setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setItems(prev => prev.map(n => ({ ...n, read: true })));
  const deleteNotif = (id: string) => setItems(prev => prev.filter(n => n.id !== id));

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${heading}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Notifications</h1>
          <p className={`text-sm mt-1 ${muted}`}>{unreadCount} unread notifications</p>
        </div>
        <button onClick={markAllRead} className="btn-secondary text-sm flex items-center gap-2"><Check size={15} /> Mark All Read</button>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        {(["all", "attendance", "leave", "college", "system"] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-full text-xs font-semibold border capitalize transition-all ${filter === cat
              ? "bg-indigo-600 text-white border-indigo-600"
              : dm ? "border-gray-700 text-gray-400 hover:border-gray-600" : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            {cat === "all" ? `All (${items.length})` : cat}
          </button>
        ))}
      </div>

      <div className={`${card} divide-y ${dm ? "divide-gray-800" : "divide-gray-50"}`}>
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Bell size={32} className={`mx-auto mb-3 ${muted}`} />
            <p className={`text-sm ${muted}`}>No notifications in this category.</p>
          </div>
        ) : filtered.map(n => (
          <div key={n.id} className={`flex items-start gap-3 p-4 transition-colors ${!n.read ? (dm ? "bg-indigo-900/10" : "bg-indigo-50/50") : ""} ${dm ? "hover:bg-gray-800" : "hover:bg-gray-50"}`}>
            <div className="text-xl shrink-0 mt-0.5">
              {n.severity === "error" ? "🔴" : n.severity === "warning" ? "🟡" : "🔵"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className={`text-sm font-semibold ${heading} flex items-center gap-2`}>
                    {n.title}
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />}
                  </div>
                  <p className={`text-xs mt-0.5 leading-relaxed ${muted}`}>{n.message}</p>
                  <span className={`text-xs mt-1 inline-block ${muted}`}>{n.time} &middot; <span className="capitalize">{n.category}</span></span>
                </div>
                <div className="flex gap-1 shrink-0">
                  {!n.read && (
                    <button onClick={() => markRead(n.id)} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors" title="Mark read">
                      <Check size={14} />
                    </button>
                  )}
                  <button onClick={() => deleteNotif(n.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
