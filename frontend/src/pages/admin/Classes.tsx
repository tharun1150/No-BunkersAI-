import { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Users,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  UserCheck,
  Pencil,
} from "lucide-react";
import {
  getAllClasses,
  createClassSection,
  updateClassSection,
  getClassDetails,
  deleteClass,
  enrollStudentsToClass,
  removeStudentFromClass,
  getAdminTeachers,
  ClassSectionResponse,
  ClassSectionPayload,
  TeacherSummary,
} from "../../services/adminApi";
import { getStudents, BackendStudent } from "../../services/studentApi";

interface Props {
  darkMode: boolean;
  initialTab?: "sections" | "teachers";
}

export default function AdminClasses({ darkMode, initialTab = "sections" }: Props) {
  const [classes, setClasses] = useState<ClassSectionResponse[]>([]);
  const [teachers, setTeachers] = useState<TeacherSummary[]>([]);
  const [allStudents, setAllStudents] = useState<BackendStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("All");
  const [activeTab, setActiveTab] = useState<"sections" | "teachers">(initialTab);

  // Notification
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetTeacherContext, setTargetTeacherContext] = useState<string | null>(null);
  const [form, setForm] = useState<ClassSectionPayload>({
    class_name: "",
    department: "CSE",
    section: "",
    teacher_name: "",
    room_number: "",
    academic_year: "4th Year",
  });

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ClassSectionPayload>({
    class_name: "",
    department: "CSE",
    section: "",
    teacher_name: "",
    room_number: "",
    academic_year: "4th Year",
  });

  // Roster & Enroll Modals
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [selectedStudentsToEnroll, setSelectedStudentsToEnroll] = useState<string[]>([]);

  const dm = darkMode;
  const card = `rounded-xl border ${
    dm ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
  } shadow-sm`;
  const muted = dm ? "text-gray-400" : "text-gray-500";
  const heading = dm ? "text-white" : "text-gray-900";
  const inputClass = `w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${
    dm
      ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500"
      : "bg-white border-gray-200 text-gray-700 placeholder-gray-400 focus:border-indigo-500"
  }`;

  const loadData = async () => {
    setLoading(true);
    try {
      const [clsList, stuList, tList] = await Promise.all([
        getAllClasses(),
        getStudents().catch(() => []),
        getAdminTeachers().catch(() => []),
      ]);
      setClasses(clsList);
      setAllStudents(stuList);
      setTeachers(tList);
    } catch (err: any) {
      console.warn("Failed to load classes or teachers:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleOpenCreateModal = () => {
    setTargetTeacherContext(null);
    setForm({
      class_name: "",
      department: "CSE",
      section: "",
      teacher_name: "",
      room_number: "",
      academic_year: "4th Year",
    });
    setIsCreateOpen(true);
  };

  const handleAddClassForTeacher = (
    teacherName?: string,
    department?: string,
    className?: string
  ) => {
    const tName = teacherName ? teacherName.trim() : "";
    const dept = department || "CSE";
    setTargetTeacherContext(tName || null);
    setForm({
      class_name: className || "",
      department: dept,
      section: "",
      teacher_name: tName,
      room_number: "",
      academic_year: "4th Year",
    });
    setIsCreateOpen(true);
  };

  const handleOpenEditModal = (c: ClassSectionResponse) => {
    setEditingClassId(c.id);
    setEditForm({
      class_name: c.class_name,
      department: c.department,
      section: c.section,
      teacher_name: c.teacher_name || "",
      room_number: c.room_number || "",
      academic_year: c.academic_year || "",
    });
    setIsEditOpen(true);
  };

  const handleCreateClass = async (e?: React.FormEvent, keepOpen: boolean = false) => {
    if (e) e.preventDefault();
    if (!form.class_name.trim() || !form.section.trim()) {
      setNotification({
        type: "error",
        message: "Class Name and Section are required.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createClassSection(form);
      const teacherInfo = created.teacher_name ? ` for ${created.teacher_name}` : "";
      setNotification({
        type: "success",
        message: `Class '${created.class_name}' (${created.section}) created${teacherInfo}!`,
      });

      if (keepOpen) {
        setForm((prev) => ({
          ...prev,
          section: "",
          room_number: "",
        }));
      } else {
        setIsCreateOpen(false);
        setForm({
          class_name: "",
          department: "CSE",
          section: "",
          teacher_name: "",
          room_number: "",
          academic_year: "4th Year",
        });
        setTargetTeacherContext(null);
      }
      await loadData();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to create class section.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClassId) return;
    if (!editForm.class_name.trim() || !editForm.section.trim()) {
      setNotification({
        type: "error",
        message: "Class Name and Section are required.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await updateClassSection(editingClassId, editForm);
      setNotification({
        type: "success",
        message: `Class '${updated.class_name}' (${updated.section}) updated successfully!`,
      });
      setIsEditOpen(false);
      setEditingClassId(null);
      await loadData();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to update class section.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = async (classId: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete class ${name}?`)) return;

    try {
      await deleteClass(classId);
      setNotification({
        type: "success",
        message: `Class ${name} deleted successfully.`,
      });
      await loadData();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to delete class.",
      });
    }
  };

  const handleOpenRoster = async (classId: number) => {
    try {
      const details = await getClassDetails(classId);
      setSelectedClass(details);
      setIsRosterOpen(true);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to load class roster.",
      });
    }
  };

  const handleRemoveStudent = async (identifier: string) => {
    if (!selectedClass) return;
    if (!window.confirm(`Remove student ${identifier} from this class?`)) return;

    try {
      await removeStudentFromClass(selectedClass.class_id, identifier);
      setNotification({
        type: "success",
        message: `Student ${identifier} removed from ${selectedClass.class_name} (${selectedClass.section}).`,
      });
      await handleOpenRoster(selectedClass.class_id);
      await loadData();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to remove student.",
      });
    }
  };

  const handleEnrollStudents = async () => {
    if (!selectedClass || selectedStudentsToEnroll.length === 0) return;

    try {
      const res = await enrollStudentsToClass(
        selectedClass.class_id,
        selectedStudentsToEnroll
      );
      setNotification({
        type: "success",
        message: res.message,
      });
      setIsEnrollOpen(false);
      setSelectedStudentsToEnroll([]);
      await handleOpenRoster(selectedClass.class_id);
      await loadData();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to enroll students.",
      });
    }
  };

  // Filtered classes
  const filtered = classes.filter((c) => {
    const matchSearch =
      c.class_name.toLowerCase().includes(search.toLowerCase()) ||
      c.section.toLowerCase().includes(search.toLowerCase()) ||
      (c.teacher_name && c.teacher_name.toLowerCase().includes(search.toLowerCase()));
    const matchDept = filterDept === "All" || c.department === filterDept;
    return matchSearch && matchDept;
  });

  // Filtered teachers
  const filteredTeachers = teachers.filter((t) => {
    const matchSearch =
      t.teacher_name.toLowerCase().includes(search.toLowerCase()) ||
      (t.department && t.department.toLowerCase().includes(search.toLowerCase())) ||
      t.classes.some(
        (cls) =>
          cls.class_name.toLowerCase().includes(search.toLowerCase()) ||
          cls.section.toLowerCase().includes(search.toLowerCase())
      );
    const matchDept = filterDept === "All" || t.department === filterDept;
    return matchSearch && matchDept;
  });

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Notifications */}
      {notification && (
        <div
          className={`flex items-center justify-between p-3 rounded-lg text-sm ${
            notification.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200 dark:bg-green-950/40 dark:border-green-800 dark:text-green-300"
              : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle size={18} className="text-red-600 dark:text-red-400" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-75">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1
            className={`text-2xl font-bold ${heading}`}
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Class & Section Management
          </h1>
          <p className={`text-sm mt-1 ${muted}`}>
            Create classes, tap any class box to edit details, and manage student rosters
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="btn-primary text-sm flex items-center justify-center gap-2 px-4 py-2"
        >
          <Plus size={16} />
          <span>Create Class Section</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 gap-6">
        <button
          onClick={() => setActiveTab("sections")}
          className={`pb-2.5 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "sections"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <BookOpen size={16} />
          <span>Class Sections ({classes.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("teachers")}
          className={`pb-2.5 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "teachers"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <UserCheck size={16} />
          <span>Class Teachers ({teachers.length})</span>
        </button>
      </div>

      {/* Filters */}
      <div className={`flex flex-wrap gap-3 p-4 rounded-xl border ${card}`}>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm flex-1 min-w-48 ${
            dm ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
          }`}
        >
          <Search size={15} className={muted} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeTab === "teachers"
                ? "Search teacher, department, or class..."
                : "Search class, section, or teacher..."
            }
            className={`bg-transparent outline-none flex-1 text-sm ${
              dm ? "text-white placeholder-gray-500" : "text-gray-700 placeholder-gray-400"
            }`}
          />
        </div>
        <select
          className={`px-3 py-2 rounded-lg border text-sm outline-none ${
            dm ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-700"
          }`}
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
        >
          <option value="All">All Departments</option>
          {["CSE", "ECE", "EEE", "Mechanical", "Civil", "IT", "Artificial Intelligence", "MBA"].map(
            (d) => (
              <option key={d} value={d}>
                {d}
              </option>
            )
          )}
        </select>
      </div>

      {/* Tab 1: Class Sections Grid */}
      {activeTab === "sections" && (
        <>
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <Loader2 className="animate-spin text-indigo-600" size={28} />
              <span className={`text-sm ${muted}`}>Loading classes from database...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className={`${card} p-12 text-center`}>
              <BookOpen size={40} className={`mx-auto mb-3 ${muted}`} />
              <h3 className={`text-base font-bold ${heading}`}>No Classes Created Yet</h3>
              <p className={`text-sm mt-1 max-w-sm mx-auto ${muted}`}>
                Click "+ Create Class Section" to set up your first class and enroll students.
              </p>
              <button
                onClick={handleOpenCreateModal}
                className="btn-primary mt-4 text-xs px-4 py-2 inline-flex items-center gap-1.5"
              >
                <Plus size={14} /> Create First Class
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleOpenEditModal(c)}
                  className={`${card} p-5 hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group relative`}
                  title="Click to edit class name, section, teacher, or classroom"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="badge badge-primary font-mono text-xs font-bold">
                          Section {c.section}
                        </span>
                        <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                          <Pencil size={10} /> tap to edit
                        </span>
                      </div>

                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(c)}
                          className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                          title="Edit Class Details"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClass(c.id, `${c.class_name} (${c.section})`)}
                          className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Delete Class"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <h3
                      className={`text-lg font-bold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors ${heading}`}
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {c.class_name}
                    </h3>
                    <p className={`text-xs mt-0.5 font-medium text-indigo-600`}>{c.department}</p>

                    <div
                      className={`mt-4 pt-3 border-t space-y-2 text-xs ${
                        dm ? "border-gray-800" : "border-gray-100"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={muted}>Teacher:</span>
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {c.teacher_name ? (
                            <>
                              <span className={`font-semibold ${heading}`}>
                                {c.teacher_name}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleAddClassForTeacher(c.teacher_name, c.department, c.class_name)
                                }
                                className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline flex items-center gap-0.5"
                                title={`Add another class for ${c.teacher_name}`}
                              >
                                <Plus size={11} /> Add
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(c)}
                              className="text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                              title="Tap to assign a teacher"
                            >
                              Unassigned <Pencil size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={muted}>Classroom:</span>
                        <span className={`font-medium ${heading}`}>{c.room_number || "Hall TBA"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={muted}>Enrolled Students:</span>
                        <span className="font-bold text-indigo-600">{c.total_students} students</span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="mt-5 pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-2 border-gray-100 dark:border-gray-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleOpenRoster(c.id)}
                      className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 flex-1 justify-center w-full sm:w-auto"
                    >
                      <Users size={13} /> View Roster ({c.total_students})
                    </button>
                    <button
                      onClick={() =>
                        handleAddClassForTeacher(c.teacher_name, c.department, c.class_name)
                      }
                      className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 w-full sm:w-auto justify-center font-medium"
                      title={
                        c.teacher_name
                          ? `Add another class for ${c.teacher_name}`
                          : "Add another class"
                      }
                    >
                      <Plus size={13} /> Add Another Class
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab 2: Class Teachers View */}
      {activeTab === "teachers" && (
        <>
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <Loader2 className="animate-spin text-indigo-600" size={28} />
              <span className={`text-sm ${muted}`}>Loading teachers from database...</span>
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className={`${card} p-12 text-center`}>
              <UserCheck size={40} className={`mx-auto mb-3 ${muted}`} />
              <h3 className={`text-base font-bold ${heading}`}>No Class Teachers Found</h3>
              <p className={`text-sm mt-1 max-w-sm mx-auto ${muted}`}>
                When class sections are created with a teacher assigned, their classes will be organized here.
              </p>
              <button
                onClick={handleOpenCreateModal}
                className="btn-primary mt-4 text-xs px-4 py-2 inline-flex items-center gap-1.5"
              >
                <Plus size={14} /> Create First Class
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTeachers.map((t) => (
                <div
                  key={t.teacher_name}
                  className={`${card} p-5 hover:border-indigo-400 transition-all flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <span className="badge badge-primary font-mono text-xs font-bold">
                        {t.total_classes} {t.total_classes === 1 ? "Class" : "Classes"}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        {t.department || "Faculty"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm shrink-0">
                        {t.teacher_name
                          .split(" ")
                          .map((n) => n[0])
                          .filter(Boolean)
                          .slice(0, 2)
                          .join("") || "T"}
                      </div>
                      <div className="min-w-0">
                        <h3
                          className={`text-base font-bold truncate ${heading}`}
                          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                          {t.teacher_name}
                        </h3>
                        <p className={`text-xs ${muted}`}>Class Teacher</p>
                      </div>
                    </div>

                    <div
                      className={`mt-3 pt-3 border-t space-y-2 text-xs ${
                        dm ? "border-gray-800" : "border-gray-100"
                      }`}
                    >
                      <span className={`font-semibold text-[11px] uppercase tracking-wider ${muted}`}>
                        Assigned Classes:
                      </span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {t.classes.map((cls) => (
                          <div
                            key={cls.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 text-xs"
                          >
                            <div>
                              <div className="font-semibold text-gray-800 dark:text-gray-200">
                                {cls.class_name} ({cls.section})
                              </div>
                              <div className="text-[11px] text-gray-500">
                                {cls.room_number || "Hall TBA"} • {cls.total_students} students
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  const fullClass = classes.find((c) => c.id === cls.id);
                                  if (fullClass) handleOpenEditModal(fullClass);
                                }}
                                className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-colors"
                                title="Edit Class"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => handleOpenRoster(cls.id)}
                                className="p-1 rounded text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-colors"
                                title="View Class Roster"
                              >
                                <Users size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={() =>
                        handleAddClassForTeacher(
                          t.teacher_name,
                          t.department || (t.classes[0]?.department ?? "CSE"),
                          t.classes[0]?.class_name
                        )
                      }
                      className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-1.5 font-medium shadow-sm"
                      title={`Add another class for ${t.teacher_name}`}
                    >
                      <Plus size={14} />
                      <span>Add Another Class</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Edit Class Modal */}
      {isEditOpen && editingClassId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-2xl border ${
              dm ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"
            } shadow-2xl p-6`}
          >
            <div className="flex items-center justify-between mb-4 border-b pb-3 dark:border-gray-800">
              <div>
                <h2
                  className="text-lg font-bold flex items-center gap-2"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  <Pencil size={18} className="text-indigo-600" />
                  <span>Edit Class Section</span>
                </h2>
                <p className={`text-xs ${muted}`}>
                  Update class name, section, teacher name, classroom, or department
                </p>
              </div>
              <button
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingClassId(null);
                }}
                className="p-1 hover:opacity-75"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateClass} className="space-y-4">
              <div>
                <label className="text-xs font-semibold mb-1 block">Class Name *</label>
                <input
                  required
                  placeholder="e.g. B.Tech CSE or Grade 10"
                  value={editForm.class_name}
                  onChange={(e) => setEditForm({ ...editForm, class_name: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Department *</label>
                  <select
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className={inputClass}
                  >
                    <option value="CSE">CSE</option>
                    <option value="Artificial Intelligence">AI & ML</option>
                    <option value="ECE">ECE</option>
                    <option value="EEE">EEE</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Civil">Civil</option>
                    <option value="IT">IT</option>
                    <option value="MBA">MBA</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold mb-1 block">Section Name/No *</label>
                  <input
                    required
                    placeholder="e.g. 4A or 4B"
                    value={editForm.section}
                    onChange={(e) => setEditForm({ ...editForm, section: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold block">Teacher Name</label>
                  {editForm.teacher_name && (
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, teacher_name: "" })}
                      className="text-[11px] text-red-500 hover:underline"
                    >
                      Clear Teacher
                    </button>
                  )}
                </div>
                <input
                  placeholder="e.g. Dr. Rajesh Kumar (or leave blank for unassigned)"
                  value={editForm.teacher_name || ""}
                  onChange={(e) => setEditForm({ ...editForm, teacher_name: e.target.value })}
                  className={inputClass}
                />
                {teachers.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className={`text-[11px] ${muted}`}>Suggestions:</span>
                    {teachers.map((t) => (
                      <button
                        type="button"
                        key={t.teacher_name}
                        onClick={() =>
                          setEditForm({
                            ...editForm,
                            teacher_name: t.teacher_name,
                            department: t.department || editForm.department,
                          })
                        }
                        className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                          editForm.teacher_name === t.teacher_name
                            ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold dark:bg-indigo-950 dark:border-indigo-700 dark:text-indigo-300"
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {t.teacher_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Room Number</label>
                  <input
                    placeholder="e.g. Hall 304"
                    value={editForm.room_number || ""}
                    onChange={(e) => setEditForm({ ...editForm, room_number: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Academic Year</label>
                  <input
                    placeholder="e.g. 4th Year"
                    value={editForm.academic_year || ""}
                    onChange={(e) => setEditForm({ ...editForm, academic_year: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    const idToDelete = editingClassId;
                    const name = `${editForm.class_name} (${editForm.section})`;
                    setIsEditOpen(false);
                    setEditingClassId(null);
                    handleDeleteClass(idToDelete, name);
                  }}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 py-2 px-1"
                >
                  <Trash2 size={13} />
                  <span>Delete Class</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditOpen(false);
                      setEditingClassId(null);
                    }}
                    className="btn-secondary text-sm px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary text-sm px-5 py-2 flex items-center gap-2"
                  >
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                    <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Class Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-2xl border ${
              dm ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"
            } shadow-2xl p-6`}
          >
            <div className="flex items-center justify-between mb-4 border-b pb-3 dark:border-gray-800">
              <div>
                <h2
                  className="text-lg font-bold"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {targetTeacherContext
                    ? `Add Class for ${targetTeacherContext}`
                    : "Create Class Section"}
                </h2>
                <p className={`text-xs ${muted}`}>
                  {targetTeacherContext
                    ? `Assign another class or section to ${targetTeacherContext}`
                    : "Configure class details and assign teacher"}
                </p>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 hover:opacity-75">
                <X size={18} />
              </button>
            </div>

            {targetTeacherContext && (
              <div className="mb-4 p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <UserCheck size={15} className="text-indigo-600 dark:text-indigo-400" />
                  <span>
                    Adding class for <strong>{targetTeacherContext}</strong> ({form.department})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTargetTeacherContext(null);
                    setForm((prev) => ({ ...prev, teacher_name: "" }));
                  }}
                  className="text-indigo-600 hover:underline dark:text-indigo-400 text-[11px]"
                >
                  Clear Teacher
                </button>
              </div>
            )}

            <form onSubmit={(e) => handleCreateClass(e, false)} className="space-y-4">
              <div>
                <label className="text-xs font-semibold mb-1 block">Class Name *</label>
                <input
                  required
                  placeholder="e.g. B.Tech CSE or Grade 10"
                  value={form.class_name}
                  onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Department *</label>
                  <select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className={inputClass}
                  >
                    <option value="CSE">CSE</option>
                    <option value="Artificial Intelligence">AI & ML</option>
                    <option value="ECE">ECE</option>
                    <option value="EEE">EEE</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Civil">Civil</option>
                    <option value="IT">IT</option>
                    <option value="MBA">MBA</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold mb-1 block">Section Name/No *</label>
                  <input
                    required
                    placeholder="e.g. 4A or 4B"
                    value={form.section}
                    onChange={(e) => setForm({ ...form, section: e.target.value })}
                    className={inputClass}
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block">Teacher Name</label>
                <input
                  placeholder="e.g. Dr. Rajesh Kumar"
                  value={form.teacher_name || ""}
                  onChange={(e) => setForm({ ...form, teacher_name: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Room Number</label>
                  <input
                    placeholder="e.g. Hall 304"
                    value={form.room_number || ""}
                    onChange={(e) => setForm({ ...form, room_number: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Academic Year</label>
                  <input
                    placeholder="e.g. 4th Year"
                    value={form.academic_year || ""}
                    onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn-secondary text-sm px-3 py-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleCreateClass(undefined, true)}
                  className="btn-secondary text-sm px-3 py-2 text-indigo-600 border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                  title="Create this class and immediately add another for this teacher"
                >
                  Create & Add Another
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  <span>{isSubmitting ? "Creating..." : "Create Section"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Roster Modal */}
      {isRosterOpen && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className={`w-full max-w-2xl rounded-2xl border ${
              dm ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"
            } shadow-2xl p-6 max-h-[85vh] flex flex-col`}
          >
            <div className="flex items-center justify-between border-b pb-3 dark:border-gray-800">
              <div>
                <h3
                  className="text-lg font-bold"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {selectedClass.class_name} — Section {selectedClass.section}
                </h3>
                <p className={`text-xs ${muted}`}>
                  {selectedClass.total_enrolled} students enrolled
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEnrollOpen(true)}
                  className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                >
                  <Plus size={14} /> Add Students
                </button>
                <button onClick={() => setIsRosterOpen(false)} className="p-1 hover:opacity-75">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto my-4 flex-1">
              {selectedClass.students.length === 0 ? (
                <div className="text-center py-8">
                  <Users size={32} className={`mx-auto mb-2 ${muted}`} />
                  <p className={`text-sm ${muted}`}>No students enrolled in this section yet.</p>
                  <button
                    onClick={() => setIsEnrollOpen(true)}
                    className="btn-secondary text-xs px-3 py-1.5 mt-3 inline-flex items-center gap-1"
                  >
                    <Plus size={13} /> Enroll Students
                  </button>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-gray-400 dark:border-gray-800">
                      <th className="py-2">Roll No</th>
                      <th className="py-2">Name</th>
                      <th className="py-2">Phone</th>
                      <th className="py-2">Attendance</th>
                      <th className="py-2">Status</th>
                      <th className="py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedClass.students.map((s: any) => (
                      <tr key={s.id} className="border-b border-gray-50 dark:border-gray-800/50">
                        <td className="py-2.5 font-mono font-medium">{s.roll_number}</td>
                        <td className="py-2.5 font-semibold">{s.name}</td>
                        <td className="py-2.5 font-mono text-gray-500">{s.phone || "-"}</td>
                        <td className="py-2.5 font-bold text-indigo-600">{s.attendance_rate}%</td>
                        <td className="py-2.5">
                          <span
                            className={`badge ${
                              s.status === "safe" ? "badge-success" : "badge-danger"
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => handleRemoveStudent(s.student_id || s.roll_number)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded"
                            title="Remove from class"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t dark:border-gray-800">
              <button
                onClick={() => setIsRosterOpen(false)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enroll Students Modal */}
      {isEnrollOpen && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-2xl border ${
              dm ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"
            } shadow-2xl p-6`}
          >
            <div className="flex items-center justify-between mb-3 border-b pb-2 dark:border-gray-800">
              <h3 className="font-bold text-sm">
                Enroll Students in {selectedClass.class_name} ({selectedClass.section})
              </h3>
              <button onClick={() => setIsEnrollOpen(false)} className="p-1 hover:opacity-75">
                <X size={16} />
              </button>
            </div>

            <p className={`text-xs mb-3 ${muted}`}>
              Select registered students to assign to this section:
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2 dark:border-gray-800 text-xs mb-4">
              {allStudents.map((st) => {
                const identifier = st.roll_number || st.student_id;
                const isChecked = selectedStudentsToEnroll.includes(identifier);
                return (
                  <label
                    key={st.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudentsToEnroll([...selectedStudentsToEnroll, identifier]);
                          } else {
                            setSelectedStudentsToEnroll(
                              selectedStudentsToEnroll.filter((id) => id !== identifier)
                            );
                          }
                        }}
                      />
                      <span className="font-semibold">{st.name}</span>
                    </div>
                    <span className="font-mono text-gray-400">{identifier}</span>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEnrollOpen(false)}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={handleEnrollStudents}
                disabled={selectedStudentsToEnroll.length === 0}
                className="btn-primary text-xs px-4 py-1.5"
              >
                Enroll {selectedStudentsToEnroll.length} Students
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
