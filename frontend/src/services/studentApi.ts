const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export interface BackendStudent {
  id: number;
  student_id: string;
  roll_number?: string | null;
  student_no?: string | null;
  name: string;
  class_name?: string | null;
  department?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  created_at: string;
}

export interface CreateStudentPayload {
  name: string;
  roll_number: string;
  student_no?: string;
  class?: string;
  class_name?: string;
  department?: string;
  parent_name?: string;
  parent_phone?: string;
}

export async function getStudents(filters?: {
  department?: string;
  class_name?: string;
  roll_number?: string;
}): Promise<BackendStudent[]> {
  const query = new URLSearchParams();
  if (filters?.department && filters.department !== "All") {
    query.set("department", filters.department);
  }
  if (filters?.class_name && filters.class_name !== "All") {
    query.set("class", filters.class_name);
  }
  if (filters?.roll_number) {
    query.set("roll_number", filters.roll_number);
  }

  const url = `${API_BASE}/students/?${query.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch students: ${response.statusText}`);
  }

  return response.json();
}

export async function createStudent(
  payload: CreateStudentPayload
): Promise<BackendStudent> {
  const response = await fetch(`${API_BASE}/students/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to create student: ${response.statusText}`
    );
  }

  return response.json();
}

export async function deleteStudent(
  identifier: string
): Promise<{ message: string; identifier: string }> {
  const response = await fetch(`${API_BASE}/students/${encodeURIComponent(identifier)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to delete student: ${response.statusText}`
    );
  }

  return response.json();
}

// ---------------------------------------------------------
// Attendance API Services
// ---------------------------------------------------------
export interface BulkAttendancePayload {
  subject: string;
  date?: string;
  time_slot?: string;
  faculty_name?: string;
  section?: string;
  records: Array<{
    student_id: string;
    status: "Present" | "Absent" | "Late" | string;
    remarks?: string;
  }>;
}

export interface BulkAttendanceResponse {
  message: string;
  date: string;
  subject: string;
  section?: string;
  faculty_name?: string;
  total_marked: number;
  present: number;
  absent: number;
  late: number;
  attendance_rate: string;
}

export async function saveBulkAttendance(
  payload: BulkAttendancePayload
): Promise<BulkAttendanceResponse> {
  const response = await fetch(`${API_BASE}/students/attendance/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to save attendance: ${response.statusText}`
    );
  }

  return response.json();
}

export async function getStudentAttendance(identifier: string) {
  const response = await fetch(
    `${API_BASE}/students/${encodeURIComponent(identifier)}/attendance`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to fetch student attendance: ${response.statusText}`
    );
  }

  return response.json();
}

export async function getLiveAttendance(filters?: {
  date?: string;
  subject?: string;
  section?: string;
  status?: string;
}) {
  const query = new URLSearchParams();
  if (filters?.date) query.set("date", filters.date);
  if (filters?.subject) query.set("subject", filters.subject);
  if (filters?.section) query.set("section", filters.section);
  if (filters?.status && filters.status !== "All") query.set("status", filters.status);

  const response = await fetch(`${API_BASE}/students/attendance/live?${query.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to fetch live attendance: ${response.statusText}`
    );
  }

  return response.json();
}

