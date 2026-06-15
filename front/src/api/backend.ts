export interface BackendStatus {
  service: string;
  status: string;
  message: string;
}

export interface CurrentUser {
  id: number;
  username: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  provider: string;
  nickname: string | null;
  displayNickname: string;
  roles: string[];
  emailVerified: boolean;
  suspended: boolean;
  adminMfaRequired: boolean;
  adminMfaVerified: boolean;
  adminMfaEnrolled: boolean;
}

export interface DashboardPreferences {
  coreMetricIds: string[];
  watchMetricIds: string[];
  eventIds: string[];
  reportIds: string[];
  visibleSections: string[];
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export function xsrfToken() {
  return document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("XSRF-TOKEN="))
    ?.slice("XSRF-TOKEN=".length);
}

export function jsonHeaders(): Record<string, string> {
  const token = xsrfToken();
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { "X-XSRF-TOKEN": decodeURIComponent(token) } : {}),
  };
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly errorCode?: string;

  constructor(message: string, status: number, errorCode?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.errorCode = errorCode;
  }
}

export async function requestError(response: Response, fallback: string): Promise<ApiRequestError> {
  try {
    const body = (await response.json()) as { message?: string; errorCode?: string };
    return new ApiRequestError(body.message ?? fallback, response.status, body.errorCode);
  } catch {
    return new ApiRequestError(fallback, response.status);
  }
}

export async function logoutCurrentUser(): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/logout`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Logout request failed: ${response.status}`);
  }
}

export async function fetchBackendStatus(): Promise<BackendStatus> {
  const response = await fetch(`${apiBaseUrl}/api/status`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Backend status request failed: ${response.status}`);
  }

  return response.json() as Promise<BackendStatus>;
}

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const response = await fetch(`${apiBaseUrl}/api/me`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Current user request failed: ${response.status}`);
  }

  return response.json() as Promise<CurrentUser>;
}

export async function fetchDashboardPreferences(): Promise<DashboardPreferences | null> {
  const response = await fetch(`${apiBaseUrl}/api/users/me/dashboard-preferences`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Dashboard preferences request failed: ${response.status}`);
  }

  return response.json() as Promise<DashboardPreferences>;
}

export async function saveDashboardPreferences(
  preferences: DashboardPreferences,
): Promise<DashboardPreferences> {
  const response = await fetch(`${apiBaseUrl}/api/users/me/dashboard-preferences`, {
    method: "PUT",
    credentials: "include",
    headers: jsonHeaders(),
    body: JSON.stringify(preferences),
  });

  if (!response.ok) {
    throw new Error(`Dashboard preferences save failed: ${response.status}`);
  }

  return response.json() as Promise<DashboardPreferences>;
}

export async function saveUserProfile(profile: {
  nickname: string;
}): Promise<CurrentUser> {
  const response = await fetch(`${apiBaseUrl}/api/users/me/profile`, {
    method: "PUT",
    credentials: "include",
    headers: jsonHeaders(),
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    throw new Error(`Profile save failed: ${response.status}`);
  }

  return response.json() as Promise<CurrentUser>;
}
