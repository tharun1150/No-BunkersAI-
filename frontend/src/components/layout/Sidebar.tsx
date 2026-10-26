import { useState } from "react";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, CalendarCheck,
  FileText, Bell, LogOut, ChevronLeft, ChevronRight, Menu, X,
  AlertTriangle, BarChart3, Settings, UserCheck, ClipboardList,
  MessageSquare, Brain, Phone, Home, TrendingUp, Building2
} from "lucide-react";
import type { Role } from "../../data/mockData";

interface SidebarItem {
  icon: React.ReactNode;
  label: string;
  key: string;
}

function getSidebarItems(role: Role): SidebarItem[] {
  if (role === "student") return [
    { icon: <LayoutDashboard size={18} />, label: "Dashboard", key: "dashboard" },
    { icon: <CalendarCheck size={18} />, label: "My Attendance", key: "attendance" },
    { icon: <BookOpen size={18} />, label: "Subjects", key: "subjects" },
    { icon: <ClipboardList size={18} />, label: "Leave Requests", key: "leave" },
    { icon: <Bell size={18} />, label: "Notifications", key: "notifications" },
    { icon: <Settings size={18} />, label: "Settings", key: "settings" },
  ];
  if (role === "faculty") return [
    { icon: <LayoutDashboard size={18} />, label: "Dashboard", key: "dashboard" },
    { icon: <CalendarCheck size={18} />, label: "Mark Attendance", key: "mark-attendance" },
    { icon: <BookOpen size={18} />, label: "My Classes", key: "classes" },
    { icon: <Users size={18} />, label: "Students", key: "students" },
    { icon: <AlertTriangle size={18} />, label: "At-Risk Students", key: "at-risk" },
    { icon: <ClipboardList size={18} />, label: "Leave Requests", key: "leave" },
    { icon: <Bell size={18} />, label: "Notifications", key: "notifications" },
    { icon: <Settings size={18} />, label: "Settings", key: "settings" },
  ];
  if (role === "admin") return [
    { icon: <LayoutDashboard size={18} />, label: "Overview", key: "dashboard" },
    { icon: <GraduationCap size={18} />, label: "Students", key: "students" },
    { icon: <BookOpen size={18} />, label: "Classes & Sections", key: "classes" },
    { icon: <UserCheck size={18} />, label: "Faculty", key: "faculty" },
    { icon: <Building2 size={18} />, label: "Departments", key: "departments" },
    { icon: <CalendarCheck size={18} />, label: "Attendance", key: "attendance" },
    { icon: <AlertTriangle size={18} />, label: "At-Risk Students", key: "at-risk" },
    { icon: <ClipboardList size={18} />, label: "Leave Requests", key: "leave" },
    { icon: <BarChart3 size={18} />, label: "Reports", key: "reports" },
    { icon: <Brain size={18} />, label: "AI Analytics", key: "ai-analytics" },
    { icon: <Phone size={18} />, label: "AI Communication", key: "voice-agent" },
    { icon: <Bell size={18} />, label: "Notifications", key: "notifications" },
    { icon: <Settings size={18} />, label: "Settings", key: "settings" },
  ];
  if (role === "parent") return [
    { icon: <Home size={18} />, label: "Dashboard", key: "dashboard" },
    { icon: <CalendarCheck size={18} />, label: "Attendance", key: "attendance" },
    { icon: <TrendingUp size={18} />, label: "Progress", key: "progress" },
    { icon: <MessageSquare size={18} />, label: "Contact Faculty", key: "contact" },
    { icon: <Bell size={18} />, label: "Notifications", key: "notifications" },
  ];
  return [];
}

interface Props {
  role: Role;
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  darkMode: boolean;
}

export default function Sidebar({ role, activePage, onNavigate, onLogout, darkMode }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = getSidebarItems(role);

  const roleLabel = role === "student" ? "Student Portal" : role === "faculty" ? "Faculty Portal" : role === "admin" ? "Admin Console" : "Parent Portal";
  const roleColor = role === "student" ? "#4f46e5" : role === "faculty" ? "#7c3aed" : role === "admin" ? "#0f766e" : "#b45309";

  const SidebarContent = () => (
    <div className={`flex flex-col h-full ${darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} border-r`}>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b ${darkMode ? "border-gray-800" : "border-gray-100"}`}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: roleColor }}>A</div>
        {!collapsed && (
          <div>
            <div className={`font-bold text-sm leading-tight ${darkMode ? "text-white" : "text-gray-900"}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AttendAI</div>
            <div className="text-xs" style={{ color: roleColor }}>{roleLabel}</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map(item => (
          <button
            key={item.key}
            className={`sidebar-nav-item w-full ${activePage === item.key ? "active" : ""} ${collapsed ? "justify-center" : ""}`}
            onClick={() => { onNavigate(item.key); setMobileOpen(false); }}
            title={collapsed ? item.label : undefined}
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className={`p-3 border-t ${darkMode ? "border-gray-800" : "border-gray-100"}`}>
        <button
          className={`sidebar-nav-item w-full text-red-500 hover:bg-red-50 hover:text-red-600 ${collapsed ? "justify-center" : ""}`}
          onClick={onLogout}
        >
          <LogOut size={18} />
          {!collapsed && <span>Sign Out</span>}
        </button>
        {!collapsed && (
          <button
            className={`sidebar-nav-item w-full mt-1 ${darkMode ? "text-gray-400" : "text-gray-400"}`}
            onClick={() => setCollapsed(true)}
          >
            <ChevronLeft size={18} />
            <span>Collapse</span>
          </button>
        )}
        {collapsed && (
          <button
            className="sidebar-nav-item w-full justify-center mt-1"
            onClick={() => setCollapsed(false)}
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md border border-gray-200"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <div className={`lg:hidden fixed left-0 top-0 h-full z-40 w-64 transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:flex flex-col h-screen sticky top-0 transition-all duration-200 ${collapsed ? "w-16" : "w-60"} shrink-0`}>
        <SidebarContent />
      </div>
    </>
  );
}
