import { jsonHeaders } from "../../../api/backend";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export interface AdminUserItem {
  id: number;
  provider: string;
  email: string | null;
  displayName: string;
  nickname: string | null;
  avatarUrl: string | null;
  roles: string[];
  emailVerified: boolean;
  suspended: boolean;
}

export interface AdminPageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface BoardReportItem {
  id: number;
  targetType: string;
  postId: number;
  commentId: number | null;
  reporterUserId: number;
  reason: string;
  detail: string;
  createdAt: string | null;
}

export interface EconomySyncRunItem {
  id: number;
  source: string;
  startedAt: string | null;
  finishedAt: string | null;
  status: string;
  errorMessage: string | null;
}

export interface AgentRunItem {
  id: number;
  userId: number;
  runType: string;
  status: string;
  summary: string;
  model: string;
  errorMessage: string | null;
  createdAt: string | null;
  completedAt: string | null;
}

export interface AuditLogItem {
  id: number;
  adminUserId: number;
  action: string;
  targetType: string;
  targetId: string;
  detail: string;
  createdAt: string | null;
}

async function parseJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`${fallback}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchAdminUsers(): Promise<AdminPageResponse<AdminUserItem>> {
  const response = await fetch(`${apiBaseUrl}/api/admin/users`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return parseJson(response, "Admin users request failed");
}

export async function updateAdminUserRoles(
  userId: number,
  roles: string[],
): Promise<AdminUserItem> {
  const response = await fetch(`${apiBaseUrl}/api/admin/users/${userId}/roles`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
    body: JSON.stringify({ roles }),
  });
  return parseJson(response, "Admin user roles update failed");
}

export async function suspendAdminUser(userId: number): Promise<AdminUserItem> {
  const response = await fetch(`${apiBaseUrl}/api/admin/users/${userId}/suspend`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
  });
  return parseJson(response, "Admin user suspend failed");
}

export async function unsuspendAdminUser(userId: number): Promise<AdminUserItem> {
  const response = await fetch(`${apiBaseUrl}/api/admin/users/${userId}/unsuspend`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
  });
  return parseJson(response, "Admin user unsuspend failed");
}

export async function fetchAdminReports(): Promise<BoardReportItem[]> {
  const response = await fetch(`${apiBaseUrl}/api/admin/reports`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return parseJson(response, "Admin reports request failed");
}

export async function hideAdminPost(postId: number): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/admin/posts/${postId}/hide`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
  });
  if (!response.ok) throw new Error(`Admin post hide failed: ${response.status}`);
}

export async function hardDeleteAdminPost(postId: number): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/admin/posts/${postId}/hard-delete`, {
    method: "DELETE",
    credentials: "include",
    headers: jsonHeaders(),
  });
  if (!response.ok) throw new Error(`Admin post hard delete failed: ${response.status}`);
}

export async function hideAdminComment(commentId: number): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/admin/comments/${commentId}/hide`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
  });
  if (!response.ok) throw new Error(`Admin comment hide failed: ${response.status}`);
}

export async function hardDeleteAdminComment(commentId: number): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/admin/comments/${commentId}/hard-delete`, {
    method: "DELETE",
    credentials: "include",
    headers: jsonHeaders(),
  });
  if (!response.ok) throw new Error(`Admin comment hard delete failed: ${response.status}`);
}

export async function fetchAdminEconomySyncRuns(): Promise<EconomySyncRunItem[]> {
  const response = await fetch(`${apiBaseUrl}/api/admin/economy/sync-runs`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return parseJson(response, "Admin economy sync runs request failed");
}

export async function triggerAdminEconomySync(): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/admin/economy/sync-now`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
  });
  if (!response.ok) throw new Error(`Admin economy sync request failed: ${response.status}`);
}

export async function fetchAdminAgentRuns(): Promise<AgentRunItem[]> {
  const response = await fetch(`${apiBaseUrl}/api/admin/agents/runs`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return parseJson(response, "Admin agent runs request failed");
}

export async function retryAdminAgentRun(runId: number): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/admin/agents/runs/${runId}/retry`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
  });
  if (!response.ok) throw new Error(`Admin agent retry request failed: ${response.status}`);
}

export async function fetchAdminAuditLogs(): Promise<AdminPageResponse<AuditLogItem>> {
  const response = await fetch(`${apiBaseUrl}/api/admin/audit-logs`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return parseJson(response, "Admin audit log request failed");
}
