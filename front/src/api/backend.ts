export interface BackendStatus {
  service: string;
  status: string;
  message: string;
}

export interface CurrentUser {
  username: string;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";
const backendOrigin =
  import.meta.env.VITE_BACKEND_ORIGIN ?? "http://localhost:8080";

export function getBackendLoginUrl() {
  return `${backendOrigin}/login`;
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
