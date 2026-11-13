const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export interface OutingPass {
  id: number;
  qr_token: string;
  pass_status: string;
  valid_from?: string;
  valid_until?: string;
  actual_exit_at?: string;
  actual_return_at?: string;
}

export interface OutingRequest {
  id: number;
  request_no: string;
  student_id: string;
  student_name: string;
  roll_number?: string;
  department: string;
  outing_type: string;
  destination: string;
  reason: string;
  departure_date: string;
  departure_time: string;
  expected_return_date: string;
  expected_return_time: string;
  parent_status: "PENDING" | "APPROVED" | "REJECTED";
  parent_remarks?: string;
  parent_action_at?: string;
  hod_status: "PENDING" | "APPROVED" | "REJECTED";
  hod_remarks?: string;
  hod_action_at?: string;
  overall_status:
    | "PENDING_PARENT"
    | "PENDING_HOD"
    | "APPROVED"
    | "REJECTED_BY_PARENT"
    | "REJECTED_BY_HOD"
    | "EXITED"
    | "RETURNED"
    | "EXPIRED";
  created_at: string;
  pass_record?: OutingPass;
}

export interface OutingCreatePayload {
  student_id: string;
  student_name: string;
  roll_number?: string;
  department: string;
  outing_type: string;
  destination: string;
  reason: string;
  departure_date: string;
  departure_time: string;
  expected_return_date: string;
  expected_return_time: string;
}

export interface SecurityDashboardStats {
  total_approved_today: number;
  students_currently_outside: number;
  students_returned_today: number;
  overdue_students: number;
  total_active_gates: number;
  total_active_guards: number;
}

export interface GateItem {
  id: number;
  gate_name: string;
  location_code: string;
  is_active: boolean;
}

export interface GuardItem {
  id: number;
  badge_number: string;
  name: string;
  phone: string;
  assigned_gate_id?: number;
  is_active: boolean;
}

export interface GateScanResponse {
  status: "ALLOWED_EXIT" | "ALLOWED_RETURN" | "DENIED" | "ALREADY_EXITED" | "ALREADY_COMPLETED";
  message: string;
  student_id?: string;
  student_name?: string;
  roll_number?: string;
  department?: string;
  destination?: string;
  expected_return?: string;
  exit_timestamp?: string;
  return_timestamp?: string;
  is_overdue?: boolean;
}

// -------------------------------------------------------------
// 1. Student Outing Requests
// -------------------------------------------------------------
export async function createStudentOuting(payload: OutingCreatePayload): Promise<OutingRequest> {
  const res = await fetch(`${API_BASE}/outing/student/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to submit outing request");
  }
  return res.json();
}

export async function getStudentOutings(studentId: string): Promise<OutingRequest[]> {
  const res = await fetch(`${API_BASE}/outing/student/my-requests?student_id=${encodeURIComponent(studentId)}`);
  if (!res.ok) throw new Error("Failed to load student outings");
  return res.json();
}

// -------------------------------------------------------------
// 2. Parent Approval Actions
// -------------------------------------------------------------
export async function getParentOutingRequests(studentId?: string, parentPhone?: string): Promise<OutingRequest[]> {
  const params = new URLSearchParams();
  if (studentId) params.set("student_id", studentId);
  if (parentPhone) params.set("parent_phone", parentPhone);

  const res = await fetch(`${API_BASE}/outing/parent/requests?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to load parent requests");
  return res.json();
}

export async function submitParentAction(
  requestId: number,
  action: "APPROVE" | "REJECT",
  remarks?: string
): Promise<OutingRequest> {
  const res = await fetch(`${API_BASE}/outing/parent/${requestId}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, remarks }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to process parent action");
  }
  return res.json();
}

// -------------------------------------------------------------
// 3. Respective HOD Approval Actions
// -------------------------------------------------------------
export async function getHODOutingRequests(department: string, statusFilter?: string): Promise<OutingRequest[]> {
  const params = new URLSearchParams({ department });
  if (statusFilter) params.set("status_filter", statusFilter);

  const res = await fetch(`${API_BASE}/outing/hod/requests?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to load HOD requests");
  return res.json();
}

export async function submitHODAction(
  requestId: number,
  action: "APPROVE" | "REJECT",
  remarks?: string
): Promise<OutingRequest> {
  const res = await fetch(`${API_BASE}/outing/hod/${requestId}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, remarks }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to process HOD action");
  }
  return res.json();
}

// -------------------------------------------------------------
// 4. Security Admin & Gates
// -------------------------------------------------------------
export async function getSecurityDashboardStats(): Promise<SecurityDashboardStats> {
  const res = await fetch(`${API_BASE}/outing/security/admin/dashboard`);
  if (!res.ok) throw new Error("Failed to load security dashboard");
  return res.json();
}

export async function getSecurityApprovedList(department?: string, statusFilter?: string): Promise<OutingRequest[]> {
  const params = new URLSearchParams();
  if (department) params.set("department", department);
  if (statusFilter) params.set("status_filter", statusFilter);

  const res = await fetch(`${API_BASE}/outing/security/admin/approved-list?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to load security list");
  return res.json();
}

export async function getSecurityGatesAndGuards(): Promise<{ gates: GateItem[]; guards: GuardItem[] }> {
  const res = await fetch(`${API_BASE}/outing/security/gates`);
  if (!res.ok) throw new Error("Failed to load gates");
  return res.json();
}

// -------------------------------------------------------------
// 5. Gate Scanner Verification
// -------------------------------------------------------------
export async function verifyGateScan(
  qrToken: string,
  guardId?: number,
  gateId?: number,
  actionType: "AUTO" | "EXIT" | "RETURN" = "AUTO"
): Promise<GateScanResponse> {
  const res = await fetch(`${API_BASE}/outing/security/gate/verify-scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      qr_token: qrToken,
      guard_id: guardId,
      gate_id: gateId,
      action_type: actionType,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Scan verification rejected");
  }
  return res.json();
}

export async function getGateLogs(limit: number = 20) {
  const res = await fetch(`${API_BASE}/outing/security/gate/logs?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to load scan logs");
  return res.json();
}
