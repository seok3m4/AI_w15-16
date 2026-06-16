import {
  jsonHeaders,
  requestError,
} from "../../../api/backend";

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
  postTitle: string;
  targetContent: string | null;
  targetAuthor: string | null;
  reporterUserId: number;
  reason: string;
  detail: string;
  createdAt: string | null;
}

export interface HiddenContentItem {
  targetType: "POST" | "COMMENT";
  postId: number;
  commentId: number | null;
  postTitle: string;
  content: string;
  authorUserId: number | null;
  author: string;
  hiddenAt: string | null;
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
  hiddenAt: string | null;
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

async function adminFetch(input: RequestInfo | URL, init: RequestInit, fallback: string): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`${fallback}: 관리자 API에 연결하지 못했습니다. 백엔드 서버와 Vite 프록시 상태를 확인해 주세요.`);
    }
    throw error;
  }
}

async function parseJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const error = await requestError(response, fallback);
    if (error.status === 401) {
      throw new Error("로그인이 만료되었습니다. 다시 로그인해 주세요.");
    }
    if (error.errorCode === "admin_mfa_setup_required") {
      throw new Error("관리자 MFA 설정이 필요합니다. 로그인 / 회원가입 화면에서 TOTP 설정을 완료해 주세요.");
    }
    if (error.errorCode === "admin_mfa_required") {
      throw new Error("관리자 MFA 인증이 필요합니다. 로그인 / 회원가입 화면에서 TOTP 인증을 완료해 주세요.");
    }
    if (error.status === 403) {
      throw new Error("관리자 권한 또는 MFA 인증이 필요합니다.");
    }
    throw new Error(`${fallback}: ${error.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchAdminUsers(): Promise<AdminPageResponse<AdminUserItem>> {
  const response = await adminFetch(`${apiBaseUrl}/api/admin/users`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  }, "관리자 사용자 목록 요청 실패");
  return parseJson(response, "Admin users request failed");
}

export async function updateAdminUserRoles(
  userId: number,
  roles: string[],
): Promise<AdminUserItem> {
  const response = await adminFetch(`${apiBaseUrl}/api/admin/users/${userId}/roles`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
    body: JSON.stringify({ roles }),
  }, "관리자 권한 변경 요청 실패");
  return parseJson(response, "Admin user roles update failed");
}

export async function suspendAdminUser(userId: number): Promise<AdminUserItem> {
  const response = await adminFetch(`${apiBaseUrl}/api/admin/users/${userId}/suspend`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
  }, "사용자 정지 요청 실패");
  return parseJson(response, "Admin user suspend failed");
}

export async function unsuspendAdminUser(userId: number): Promise<AdminUserItem> {
  const response = await adminFetch(`${apiBaseUrl}/api/admin/users/${userId}/unsuspend`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
  }, "사용자 정지 해제 요청 실패");
  return parseJson(response, "Admin user unsuspend failed");
}

export async function fetchAdminReports(): Promise<BoardReportItem[]> {
  const response = await adminFetch(`${apiBaseUrl}/api/admin/reports`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  }, "관리자 신고 목록 요청 실패");
  return parseJson(response, "Admin reports request failed");
}

export async function dismissAdminReport(reportId: number): Promise<void> {
  const response = await adminFetch(`${apiBaseUrl}/api/admin/reports/${reportId}`, {
    method: "DELETE",
    credentials: "include",
    headers: jsonHeaders(),
  }, "신고 내역 삭제 요청 실패");
  if (!response.ok) throw new Error(`Admin report dismiss failed: ${response.status}`);
}

export async function fetchAdminHiddenContent(): Promise<HiddenContentItem[]> {
  const response = await adminFetch(`${apiBaseUrl}/api/admin/content/hidden`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  }, "Admin hidden content request failed");
  return parseJson(response, "Admin hidden content request failed");
}

export async function hideAdminPost(postId: number): Promise<void> {
  const response = await adminFetch(`${apiBaseUrl}/api/admin/posts/${postId}/hide`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
  }, "게시글 숨김 요청 실패");
  if (!response.ok) throw new Error(`Admin post hide failed: ${response.status}`);
}

export async function hardDeleteAdminPost(postId: number): Promise<void> {
  const response = await adminFetch(`${apiBaseUrl}/api/admin/posts/${postId}/hard-delete`, {
    method: "DELETE",
    credentials: "include",
    headers: jsonHeaders(),
  }, "게시글 영구 삭제 요청 실패");
  if (!response.ok) throw new Error(`Admin post hard delete failed: ${response.status}`);
}

export async function hideAdminComment(commentId: number): Promise<void> {
  const response = await adminFetch(`${apiBaseUrl}/api/admin/comments/${commentId}/hide`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
  }, "댓글 숨김 요청 실패");
  if (!response.ok) throw new Error(`Admin comment hide failed: ${response.status}`);
}

export async function hardDeleteAdminComment(commentId: number): Promise<void> {
  const response = await adminFetch(`${apiBaseUrl}/api/admin/comments/${commentId}/hard-delete`, {
    method: "DELETE",
    credentials: "include",
    headers: jsonHeaders(),
  }, "댓글 영구 삭제 요청 실패");
  if (!response.ok) throw new Error(`Admin comment hard delete failed: ${response.status}`);
}

export async function fetchAdminEconomySyncRuns(): Promise<EconomySyncRunItem[]> {
  const response = await adminFetch(`${apiBaseUrl}/api/admin/economy/sync-runs`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  }, "관리자 경제 동기화 목록 요청 실패");
  return parseJson(response, "Admin economy sync runs request failed");
}

export async function triggerAdminEconomySync(): Promise<void> {
  const response = await adminFetch(`${apiBaseUrl}/api/admin/economy/sync-now`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
  }, "경제 동기화 실행 요청 실패");
  if (!response.ok) throw new Error(`Admin economy sync request failed: ${response.status}`);
}

export async function fetchAdminAgentRuns(
  visibility: "active" | "hidden" | "all" = "active",
): Promise<AgentRunItem[]> {
  const searchParams = new URLSearchParams({ visibility });
  const response = await adminFetch(`${apiBaseUrl}/api/admin/agents/runs?${searchParams.toString()}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  }, "관리자 Agent 실행 목록 요청 실패");
  return parseJson(response, "Admin agent runs request failed");
}

export async function retryAdminAgentRun(runId: number): Promise<void> {
  const response = await adminFetch(`${apiBaseUrl}/api/admin/agents/runs/${runId}/retry`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
  }, "Agent 재시도 요청 실패");
  if (!response.ok) throw new Error(`Admin agent retry request failed: ${response.status}`);
}

export async function hardDeleteAdminAgentRun(runId: number): Promise<void> {
  const response = await adminFetch(`${apiBaseUrl}/api/admin/agents/runs/${runId}/hard-delete`, {
    method: "DELETE",
    credentials: "include",
    headers: jsonHeaders(),
  }, "Admin agent hard delete request failed");
  if (!response.ok) throw new Error(`Admin agent hard delete request failed: ${response.status}`);
}

export async function fetchAdminAuditLogs(): Promise<AdminPageResponse<AuditLogItem>> {
  const response = await adminFetch(`${apiBaseUrl}/api/admin/audit-logs`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  }, "관리자 감사 로그 요청 실패");
  return parseJson(response, "Admin audit log request failed");
}
