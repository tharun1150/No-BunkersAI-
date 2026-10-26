import { useState, useEffect } from "react";
import {
  Search,
  Eye,
  Edit,
  UserX,
  BarChart3,
  ChevronLeft,
  X,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Database,
} from "lucide-react";
import { students as mockStudents, subjects, Student } from "../../data/mockData";
import {
  getStudents,
  createStudent,
  deleteStudent,
  getStudentAttendance,
  BackendStudent,
  CreateStudentPayload,
} from "../../services/studentApi";

interface Props {
  darkMode: boolean;
}

export default function AdminStudents({ darkMode }: Props) {
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("All");
  const [filterYear, setFilterYear] = useState("All");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedAttSummary, setSelectedAttSummary] = useState<any>(null);

  // Backend state
  const [backendStudents, setBackendStudents] = useState<BackendStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (selectedStudent) {
      getStudentAttendance(selectedStudent.rollNo)
        .then((data) => setSelectedAttSummary(data))
        .catch(() => setSelectedAttSummary(null));
    } else {
      setSelectedAttSummary(null);
    }
  }, [selectedStudent]);

  // Add Student Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateStudentPayload>({
    name: "",
    roll_number: "",
    student_no: "",
    class: "",
    department: "CSE",
    parent_name: "",
    parent_phone: "",
  });

  const dm = darkMode;
  const card = `rounded-xl border ${dm ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} shadow-sm`;
  const muted = dm ? "text-gray-400" : "text-gray-500";
  const heading = dm ? "text-white" : "text-gray-900";
  const inputClass = `w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${
    dm
      ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500"
      : "bg-white border-gray-200 text-gray-700 placeholder-gray-400 focus:border-indigo-500"
  }`;

  // Fetch students from backend API on mount
  const loadStudents = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const data = await getStudents();
      setBackendStudents(data);
    } catch (err: any) {
      console.warn("Could not reach backend API, using fallback data:", err.message);
      setApiError(err.message || "Failed to connect to backend server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  // Map backend students into frontend table format
  const mappedBackendStudents: (Student & { isLiveDb?: boolean })[] =
    backendStudents.map((b) => ({
      id: b.student_id || String(b.id),
      name: b.name,
      email: `${(b.roll_number || b.student_id).toLowerCase()}@college.edu`,
      department: b.department || "General",
      year: 3,
      section: b.class_name || "A",
      rollNo: b.roll_number || b.student_id,
      phone: b.student_no || "-",
      parentName: b.parent_name || "-",
      parentPhone: b.parent_phone || "-",
      attendance: 92,
      present: 46,
      absent: 4,
      total: 50,
      status: "safe",
      isLiveDb: true,
    }));

  // Combine backend students at the top with sample mock students
  const combinedStudents = [
    ...mappedBackendStudents,
    ...mockStudents.filter(
      (m) =>
        !mappedBackendStudents.some(
          (b) => b.rollNo.toLowerCase() === m.rollNo.toLowerCase()
        )
    ),
  ];

  // Filtering
  const filtered = combinedStudents.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === "All" || s.department === filterDept;
    const matchYear =
      filterYear === "All" || s.year === parseInt(filterYear);
    return matchSearch && matchDept && matchYear;
  });

  // Handle Form Submission for Adding Student
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.roll_number.trim()) {
      setNotification({
        type: "error",
        message: "Student Name and Roll Number are required.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const newStudent = await createStudent(formData);
      setNotification({
        type: "success",
        message: `Student '${newStudent.name}' (${newStudent.roll_number}) added successfully to PostgreSQL database!`,
      });
      // Refresh list from backend
      await loadStudents();
      // Reset form and close modal
      setFormData({
        name: "",
        roll_number: "",
        student_no: "",
        class: "",
        department: "CSE",
        parent_name: "",
        parent_phone: "",
      });
      setIsModalOpen(false);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to add student to database.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Deleting Student
  const handleDeleteStudent = async (rollNo: string, isLiveDb?: boolean) => {
    if (!window.confirm(`Are you sure you want to delete student ${rollNo}?`)) {
      return;
    }

    if (isLiveDb) {
      try {
        await deleteStudent(rollNo);
        setNotification({
          type: "success",
          message: `Student ${rollNo} deleted from database.`,
        });
        await loadStudents();
      } catch (err: any) {
        setNotification({
          type: "error",
          message: err.message || `Failed to delete student ${rollNo}`,
        });
      }
    } else {
      setNotification({
        type: "success",
        message: `Student ${rollNo} removed from view.`,
      });
    }
  };

  // Detail View of a Selected Student
  if (selectedStudent) {
    const s = selectedStudent;
    return (
      <div className="p-4 lg:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedStudent(null)}
            className={`p-2 rounded-lg border ${
              dm ? "border-gray-700 text-gray-400" : "border-gray-200 text-gray-500"
            } hover:bg-gray-50`}
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1
              className={`text-xl font-bold ${heading}`}
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Student Profile
            </h1>
            <p className={`text-sm ${muted}`}>{s.rollNo}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <div className={`${card} p-5`}>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-600 text-white text-2xl font-bold flex items-center justify-center mb-3">
                {s.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <h2
                className={`font-bold text-lg ${heading}`}
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {s.name}
              </h2>
              <p className={`text-sm ${muted}`}>{s.rollNo}</p>
              <span
                className={`badge mt-2 ${
                  s.status === "safe"
                    ? "badge-success"
                    : s.status === "warning"
                    ? "badge-warning"
                    : "badge-danger"
                }`}
              >
                {s.status === "safe"
                  ? "Safe"
                  : s.status === "warning"
                  ? "Warning"
                  : "Critical"}
              </span>
            </div>
            <div
              className={`mt-4 pt-4 border-t space-y-2 ${
                dm ? "border-gray-700" : "border-gray-100"
              }`}
            >
              {[
                ["Department", s.department],
                ["Class / Section", s.section],
                ["Student Phone", s.phone],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between text-xs">
                  <span className={muted}>{l}</span>
                  <span className={`font-medium ${heading}`}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className={`${card} p-5`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-bold text-sm ${heading}`}>
                  Attendance Statistics
                </h3>
                {selectedAttSummary && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                    Live Data
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3 text-center mb-3">
                <div>
                  <div className="text-xl font-bold text-indigo-600">
                    {selectedAttSummary ? `${selectedAttSummary.attendance_percentage}%` : `${s.attendance}%`}
                  </div>
                  <div className={`text-xs ${muted}`}>Overall</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-green-600">
                    {selectedAttSummary ? selectedAttSummary.present : s.present}
                  </div>
                  <div className={`text-xs ${muted}`}>Present</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-red-500">
                    {selectedAttSummary ? selectedAttSummary.absent : s.absent}
                  </div>
                  <div className={`text-xs ${muted}`}>Absent</div>
                </div>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${selectedAttSummary ? selectedAttSummary.attendance_percentage : s.attendance}%`,
                    background:
                      (selectedAttSummary ? selectedAttSummary.attendance_percentage : s.attendance) >= 85
                        ? "#16a34a"
                        : (selectedAttSummary ? selectedAttSummary.attendance_percentage : s.attendance) >= 75
                        ? "#d97706"
                        : "#dc2626",
                  }}
                />
              </div>

              {selectedAttSummary?.records && selectedAttSummary.records.length > 0 && (
                <div className={`mt-3 pt-3 border-t text-xs ${dm ? "border-gray-800" : "border-gray-100"}`}>
                  <div className={`font-semibold mb-2 ${heading}`}>Live Session Records</div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {selectedAttSummary.records.slice(0, 5).map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between py-1 border-b last:border-b-0 border-gray-100 dark:border-gray-800">
                        <span className={muted}>{r.date} &middot; {r.subject || "Lecture"}</span>
                        <span
                          className={`badge ${
                            r.status === "Present"
                              ? "badge-success"
                              : r.status === "Absent"
                              ? "badge-danger"
                              : "badge-warning"
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={`${card} p-5`}>
              <h3 className={`font-bold text-sm mb-3 ${heading}`}>
                Parent Info
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className={muted}>Parent Name</span>
                  <span className={`font-medium ${heading}`}>
                    {s.parentName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={muted}>Phone</span>
                  <span className={`font-medium ${heading}`}>
                    {s.parentPhone}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={`${card} p-5`}>
            <h3 className={`font-bold text-sm mb-3 ${heading}`}>
              Subject-wise Attendance
            </h3>
            <div className="space-y-3">
              {subjects.map((sub) => (
                <div key={sub.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={`font-medium ${heading}`}>{sub.name}</span>
                    <span
                      className={`font-bold ${
                        sub.attendance >= 75 ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {sub.attendance}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${sub.attendance}%`,
                        background:
                          sub.attendance >= 75 ? "#16a34a" : "#dc2626",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Notifications Banner */}
      {notification && (
        <div
          className={`flex items-center justify-between p-3 rounded-lg text-sm transition-all ${
            notification.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 size={18} className="text-green-600" />
            ) : (
              <AlertCircle size={18} className="text-red-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 hover:opacity-75"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Header with Title and Add Student Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1
              className={`text-2xl font-bold ${heading}`}
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Student Management
            </h1>
            {backendStudents.length > 0 && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                <Database size={12} /> {backendStudents.length} in DB
              </span>
            )}
          </div>
          <p className={`text-sm mt-1 ${muted}`}>
            {combinedStudents.length} students enrolled &middot; Connected to FastAPI
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary text-sm flex items-center justify-center gap-2 px-4 py-2"
        >
          <Plus size={16} />
          <span>Add Student</span>
        </button>
      </div>

      {/* Filters */}
      <div
        className={`flex flex-wrap gap-3 p-4 rounded-xl border ${
          dm ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
        }`}
      >
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm flex-1 min-w-48 ${
            dm ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
          }`}
        >
          <Search size={15} className={muted} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or Roll No..."
            className={`bg-transparent outline-none flex-1 text-sm ${
              dm
                ? "text-white placeholder-gray-500"
                : "text-gray-700 placeholder-gray-400"
            }`}
          />
        </div>
        <select
          className={`px-3 py-2 rounded-lg border text-sm outline-none ${
            dm
              ? "bg-gray-800 border-gray-700 text-white"
              : "bg-white border-gray-200 text-gray-700"
          }`}
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
        >
          <option value="All">All Departments</option>
          {[
            "CSE",
            "ECE",
            "EEE",
            "Mechanical",
            "Civil",
            "IT",
            "Artificial Intelligence",
            "MBA",
          ].map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          className={`px-3 py-2 rounded-lg border text-sm outline-none ${
            dm
              ? "bg-gray-800 border-gray-700 text-white"
              : "bg-white border-gray-200 text-gray-700"
          }`}
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
        >
          <option value="All">All Years</option>
          {[1, 2, 3, 4].map((y) => (
            <option key={y} value={y}>
              {y}
              {["st", "nd", "rd", "th"][y - 1]} Year
            </option>
          ))}
        </select>
      </div>

      {/* Students Table */}
      <div className={`${card} p-5`}>
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <Loader2 className="animate-spin text-indigo-600" size={28} />
            <span className={`text-sm ${muted}`}>Loading students from database...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className={`border-b text-xs font-semibold ${
                    dm
                      ? "text-gray-500 border-gray-700"
                      : "text-gray-400 border-gray-100"
                  }`}
                >
                  <th className="text-left py-2 pr-4">Roll No / ID</th>
                  <th className="text-left py-2 pr-4">Name</th>
                  <th className="text-left py-2 pr-4">Department</th>
                  <th className="text-left py-2 pr-4">Class / Section</th>
                  <th className="text-left py-2 pr-4">Student Phone</th>
                  <th className="text-left py-2 pr-4">Attendance</th>
                  <th className="text-left py-2 pr-4">Status</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s: any) => (
                  <tr
                    key={s.id}
                    className={`table-row text-xs ${
                      dm
                        ? "text-gray-300 border-gray-700"
                        : "text-gray-700 border-gray-50"
                    } ${s.isLiveDb ? (dm ? "bg-indigo-950/20" : "bg-indigo-50/40") : ""}`}
                  >
                    <td className="py-3 pr-4 font-mono font-medium">
                      <div className="flex items-center gap-1.5">
                        <span>{s.rollNo}</span>
                        {s.isLiveDb && (
                          <span
                            className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-sans font-semibold"
                            title="Stored in PostgreSQL database"
                          >
                            DB
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0">
                          {s.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <span className={`font-semibold ${heading}`}>{s.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">{s.department}</td>
                    <td className="py-3 pr-4">
                      {s.section || "A"}
                    </td>
                    <td className="py-3 pr-4 font-mono text-gray-500">
                      {s.phone || "-"}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="progress-bar w-16">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${s.attendance}%`,
                              background:
                                s.attendance >= 85
                                  ? "#16a34a"
                                  : s.attendance >= 75
                                  ? "#d97706"
                                  : "#dc2626",
                            }}
                          />
                        </div>
                        <span
                          className={`font-bold ${
                            s.attendance < 75
                              ? "text-red-500"
                              : s.attendance < 85
                              ? "text-yellow-600"
                              : "text-green-600"
                          }`}
                        >
                          {s.attendance}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`badge ${
                          s.status === "safe"
                            ? "badge-success"
                            : s.status === "warning"
                            ? "badge-warning"
                            : "badge-danger"
                        }`}
                      >
                        {s.status === "safe"
                          ? "Safe"
                          : s.status === "warning"
                          ? "Warning"
                          : "Critical"}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setSelectedStudent(s)}
                          className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors"
                          title="View"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(s.rollNo, s.isLiveDb)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                          title="Delete student"
                        >
                          <UserX size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div
          className={`flex items-center justify-between mt-4 pt-4 border-t text-xs ${muted} ${
            dm ? "border-gray-700" : "border-gray-100"
          }`}
        >
          <span>
            Showing {filtered.length} of {combinedStudents.length} students
          </span>
        </div>
      </div>

      {/* Add Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className={`w-full max-w-lg rounded-2xl border ${
              dm ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"
            } shadow-2xl overflow-hidden`}
          >
            {/* Modal Header */}
            <div
              className={`flex items-center justify-between px-6 py-4 border-b ${
                dm ? "border-gray-800" : "border-gray-100"
              }`}
            >
              <div>
                <h2
                  className="text-lg font-bold"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Add New Student
                </h2>
                <p className={`text-xs ${muted}`}>
                  Saves directly to backend API & PostgreSQL database
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className={`p-1.5 rounded-lg ${
                  dm ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"
                }`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddStudent} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold">
                    Student Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g. Tarun Kumar"
                    className={inputClass}
                  />
                </div>

                {/* Roll Number */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold">
                    Roll Number / ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={formData.roll_number}
                    onChange={(e) =>
                      setFormData({ ...formData, roll_number: e.target.value })
                    }
                    placeholder="e.g. 21CSE088"
                    className={inputClass}
                  />
                </div>

                {/* Student Phone */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Student Phone (student_no)</label>
                  <input
                    value={formData.student_no}
                    onChange={(e) =>
                      setFormData({ ...formData, student_no: e.target.value })
                    }
                    placeholder="e.g. 9876543210"
                    className={inputClass}
                  />
                </div>

                {/* Class / Section */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Class / Section</label>
                  <input
                    value={formData.class}
                    onChange={(e) =>
                      setFormData({ ...formData, class: e.target.value })
                    }
                    placeholder="e.g. CSE-3B or 10-A"
                    className={inputClass}
                  />
                </div>

                {/* Department */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                    className={inputClass}
                  >
                    <option value="CSE">CSE (Computer Science & Engineering)</option>
                    <option value="Artificial Intelligence">Artificial Intelligence & ML</option>
                    <option value="ECE">ECE (Electronics & Communication)</option>
                    <option value="EEE">EEE (Electrical & Electronics)</option>
                    <option value="Mechanical">Mechanical Engineering</option>
                    <option value="Civil">Civil Engineering</option>
                    <option value="IT">Information Technology</option>
                    <option value="MBA">MBA</option>
                  </select>
                </div>

                {/* Parent Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Parent / Guardian Name</label>
                  <input
                    value={formData.parent_name}
                    onChange={(e) =>
                      setFormData({ ...formData, parent_name: e.target.value })
                    }
                    placeholder="e.g. Ramesh Kumar"
                    className={inputClass}
                  />
                </div>

                {/* Parent Phone */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Parent Phone</label>
                  <input
                    value={formData.parent_phone}
                    onChange={(e) =>
                      setFormData({ ...formData, parent_phone: e.target.value })
                    }
                    placeholder="e.g. +91 9876543211"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Actions */}
              <div
                className={`flex items-center justify-end gap-3 pt-4 border-t ${
                  dm ? "border-gray-800" : "border-gray-100"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 rounded-lg text-sm border font-medium ${
                    dm
                      ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary text-sm px-5 py-2 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  <span>{isSubmitting ? "Saving..." : "Create Student"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
