const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export interface ClassSectionPayload {
  class_name: string;
  department: string;
  section: string;
  teacher_name?: string;
  room_number?: string;
  academic_year?: string;
}

export interface ClassSectionResponse extends ClassSectionPayload {
  id: number;
  created_at: string;
  total_students: number;
}

export interface AdminStudentPayload {
  name: string;
  roll_number: string;
  student_no?: string;
  class?: string;
  department?: string;
  parent_name?: string;
  parent_phone?: string;
  class_section_id?: number;
}

export interface AdminDashboardStats {
  total_students: number;
  total_classes: number;
  total_departments: number;
  overall_attendance_rate: number;
  at_risk_students_count: number;
  department_summary: Array<{
    department: string;
    students_count: number;
    classes_count: number;
  }>;
}

// ---------------------------------------------------------
// Class Operations
// ---------------------------------------------------------
export async function createClassSection(
  payload: ClassSectionPayload
): Promise<ClassSectionResponse> {
  const response = await fetch(`${API_BASE}/admin/classes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to create class: ${response.statusText}`);
  }

  return response.json();
}

export async function getAllClasses(filters?: {
  department?: string;
}): Promise<ClassSectionResponse[]> {
  const query = new URLSearchParams();
  if (filters?.department && filters.department !== "All") {
    query.set("department", filters.department);
  }

  const response = await fetch(`${API_BASE}/admin/classes?${query.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch classes: ${response.statusText}`);
  }

  return response.json();
}

export async function getClassDetails(classId: number) {
  const response = await fetch(`${API_BASE}/admin/classes/${classId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch class details: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteClass(classId: number) {
  const response = await fetch(`${API_BASE}/admin/classes/${classId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to delete class: ${response.statusText}`);
  }

  return response.json();
}

export async function updateClassSection(
  classId: number,
  payload: Partial<ClassSectionPayload>
): Promise<ClassSectionResponse> {
  const response = await fetch(`${API_BASE}/admin/classes/${classId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to update class: ${response.statusText}`);
  }

  return response.json();
}

// ---------------------------------------------------------
// Student Operations under Admin
// ---------------------------------------------------------
export async function enrollStudentsToClass(
  classId: number,
  studentIdentifiers: string[]
) {
  const response = await fetch(`${API_BASE}/admin/classes/${classId}/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_identifiers: studentIdentifiers }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to enroll students: ${response.statusText}`);
  }

  return response.json();
}

export async function removeStudentFromClass(
  classId: number,
  identifier: string
) {
  const response = await fetch(
    `${API_BASE}/admin/classes/${classId}/students/${encodeURIComponent(identifier)}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to remove student: ${response.statusText}`);
  }

  return response.json();
}

export async function adminAddStudent(payload: AdminStudentPayload) {
  const response = await fetch(`${API_BASE}/admin/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to add student: ${response.statusText}`);
  }

  return response.json();
}

export async function adminDeleteStudent(identifier: string) {
  const response = await fetch(
    `${API_BASE}/admin/students/${encodeURIComponent(identifier)}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to delete student: ${response.statusText}`);
  }

  return response.json();
}

export async function getAdminStudents(filters?: {
  department?: string;
  class_id?: number;
}) {
  const query = new URLSearchParams();
  if (filters?.department && filters.department !== "All") query.set("department", filters.department);
  if (filters?.class_id) query.set("class_id", String(filters.class_id));

  const response = await fetch(`${API_BASE}/admin/students?${query.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch admin students: ${response.statusText}`);
  }

  return response.json();
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const response = await fetch(`${API_BASE}/admin/dashboard-stats`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch admin stats: ${response.statusText}`);
  }

  return response.json();
}

export interface TeacherClassItem {
  id: number;
  class_name: string;
  section: string;
  department: string;
  room_number?: string;
  academic_year?: string;
  total_students: number;
}

export interface TeacherSummary {
  teacher_name: string;
  department?: string;
  total_classes: number;
  classes: TeacherClassItem[];
}

export async function getAdminTeachers(): Promise<TeacherSummary[]> {
  const response = await fetch(`${API_BASE}/admin/teachers`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch teachers: ${response.statusText}`);
  }

  return response.json();
}
