import { Suspense, lazy, useState } from "react";
import type { Role } from "./data/mockData";
import Sidebar from "./components/layout/Sidebar";
import Navbar from "./components/layout/Navbar";

const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const StudentDashboard = lazy(() => import("./pages/student/Dashboard"));
const StudentAttendance = lazy(() => import("./pages/student/Attendance"));
const FacultyDashboard = lazy(() => import("./pages/faculty/Dashboard"));
const MarkAttendance = lazy(() => import("./pages/faculty/MarkAttendance"));
const ClassDetails = lazy(() => import("./pages/faculty/ClassDetails"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminStudents = lazy(() => import("./pages/admin/Students"));
const AdminClasses = lazy(() => import("./pages/admin/Classes"));
const AtRisk = lazy(() => import("./pages/admin/AtRisk"));
const Reports = lazy(() => import("./pages/admin/Reports"));
const AIAnalytics = lazy(() => import("./pages/admin/AIAnalytics"));
const VoiceAgent = lazy(() => import("./pages/admin/VoiceAgent"));
const ParentDashboard = lazy(() => import("./pages/parent/Dashboard"));
const Notifications = lazy(() => import("./pages/shared/Notifications"));
const LeaveRequests = lazy(() => import("./pages/shared/LeaveRequests"));

type AppState = "landing" | "login" | "app";

const userInfo: Record<Role, { name: string; id: string }> = {
  student: { name: "Rahul Kumar", id: "21CS001" },
  faculty: { name: "Dr. Rajesh Kumar", id: "F-001" },
  admin: { name: "Admin User", id: "ADM-001" },
  parent: { name: "Mr. Suresh Kumar", id: "PAR-001" },
};

function PlaceholderPage({ title, darkMode }: { title: string; darkMode: boolean }) {
  return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <div className="text-center">
        <div className={`text-4xl mb-3`}>🚧</div>
        <h2 className={`text-lg font-bold mb-1 ${darkMode ? "text-white" : "text-gray-900"}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{title}</h2>
        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>This section is coming soon.</p>
      </div>
    </div>
  );
}

function PageLoader({ darkMode }: { darkMode: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
        <span className={`text-sm font-semibold ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Loading</span>
      </div>
    </div>
  );
}

export default function App() {
  const [appState, setAppState] = useState<AppState>("landing");
  const [role, setRole] = useState<Role>("student");
  const [activePage, setActivePage] = useState("dashboard");
  const [darkMode, setDarkMode] = useState(false);

  const handleLogin = (selectedRole: Role) => {
    setRole(selectedRole);
    setActivePage("dashboard");
    setAppState("app");
  };

  const handleLogout = () => {
    setAppState("landing");
    setActivePage("dashboard");
  };

  if (appState === "landing") {
    return (
      <Suspense fallback={<PageLoader darkMode={darkMode} />}>
        <Landing onLogin={() => setAppState("login")} darkMode={darkMode} onToggleDark={() => setDarkMode(!darkMode)} />
      </Suspense>
    );
  }

  if (appState === "login") {
    return (
      <Suspense fallback={<PageLoader darkMode={darkMode} />}>
        <Login onLogin={handleLogin} onBack={() => setAppState("landing")} darkMode={darkMode} />
      </Suspense>
    );
  }

  const user = userInfo[role];

  const renderPage = () => {
    const props = { darkMode };

    // Shared pages
    if (activePage === "notifications") return <Notifications {...props} />;
    if (activePage === "leave") return <LeaveRequests {...props} role={role} />;

    // Student
    if (role === "student") {
      if (activePage === "dashboard") return <StudentDashboard {...props} />;
      if (activePage === "attendance") return <StudentAttendance {...props} />;
      return <PlaceholderPage title={activePage.charAt(0).toUpperCase() + activePage.slice(1)} darkMode={darkMode} />;
    }

    // Faculty
    if (role === "faculty") {
      if (activePage === "dashboard") return <FacultyDashboard {...props} onNavigate={setActivePage} />;
      if (activePage === "mark-attendance") return <MarkAttendance {...props} />;
      if (activePage === "classes") return <ClassDetails {...props} />;
      if (activePage === "at-risk") return <AtRisk {...props} />;
      return <PlaceholderPage title={activePage.charAt(0).toUpperCase() + activePage.slice(1)} darkMode={darkMode} />;
    }

    // Admin
    if (role === "admin") {
      if (activePage === "dashboard") return <AdminDashboard {...props} onNavigate={setActivePage} />;
      if (activePage === "students") return <AdminStudents {...props} />;
      if (activePage === "classes") return <AdminClasses {...props} initialTab="sections" />;
      if (activePage === "faculty") return <AdminClasses {...props} initialTab="teachers" />;
      if (activePage === "at-risk") return <AtRisk {...props} />;
      if (activePage === "reports") return <Reports {...props} />;
      if (activePage === "ai-analytics") return <AIAnalytics {...props} />;
      if (activePage === "voice-agent") return <VoiceAgent {...props} />;
      return <PlaceholderPage title={activePage.charAt(0).toUpperCase() + activePage.slice(1)} darkMode={darkMode} />;
    }

    // Parent
    if (role === "parent") {
      if (activePage === "dashboard") return <ParentDashboard {...props} onNavigate={setActivePage} />;
      if (activePage === "attendance") return <StudentAttendance {...props} />;
      return <PlaceholderPage title={activePage.charAt(0).toUpperCase() + activePage.slice(1)} darkMode={darkMode} />;
    }

    return null;
  };

  return (
    <div className={`flex min-h-screen ${darkMode ? "bg-gray-950" : "bg-gray-50"}`}>
      <Sidebar
        role={role}
        activePage={activePage}
        onNavigate={setActivePage}
        onLogout={handleLogout}
        darkMode={darkMode}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          role={role}
          userName={user.name}
          userId={user.id}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(!darkMode)}
          notificationCount={3}
          onNavigate={setActivePage}
        />
        <main className={`flex-1 overflow-y-auto ${darkMode ? "bg-gray-950" : "bg-gray-50"}`}>
          <Suspense fallback={<PageLoader darkMode={darkMode} />}>{renderPage()}</Suspense>
        </main>
      </div>
    </div>
  );
}
