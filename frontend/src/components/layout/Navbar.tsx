import { Bell, Search, Sun, Moon, ChevronDown } from "lucide-react";
import type { Role } from "../../data/mockData";

interface Props {
  role: Role;
  userName: string;
  userId: string;
  darkMode: boolean;
  onToggleDark: () => void;
  notificationCount?: number;
  onNavigate: (page: string) => void;
}

export default function Navbar({ role, userName, userId, darkMode, onToggleDark, notificationCount = 3, onNavigate }: Props) {
  const initials = userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const roleColor = role === "student" ? "#4f46e5" : role === "faculty" ? "#7c3aed" : role === "admin" ? "#0f766e" : "#b45309";

  return (
    <header className={`sticky top-0 z-30 flex items-center gap-4 px-4 lg:px-6 h-14 border-b ${darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
      <div className="flex-1 max-w-sm">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${darkMode ? "bg-gray-800 text-gray-400" : "bg-gray-50 text-gray-400"} border ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
          <Search size={15} />
          <input
            type="text"
            placeholder="Search students, subjects..."
            className={`bg-transparent outline-none flex-1 text-sm ${darkMode ? "text-gray-200 placeholder-gray-500" : "text-gray-700 placeholder-gray-400"}`}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={onToggleDark}
          className={`p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          onClick={() => onNavigate("notifications")}
          className={`relative p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
        >
          <Bell size={18} />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold leading-none">
              {notificationCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 pl-2 cursor-pointer">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: roleColor }}>
            {initials}
          </div>
          <div className="hidden sm:block">
            <div className={`text-sm font-semibold leading-tight ${darkMode ? "text-white" : "text-gray-900"}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{userName}</div>
            <div className="text-xs text-gray-400">{userId}</div>
          </div>
          <ChevronDown size={14} className="text-gray-400" />
        </div>
      </div>
    </header>
  );
}
