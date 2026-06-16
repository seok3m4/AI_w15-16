type Env = Record<string, string | undefined>;

const DEFAULT_API_BASE_URL = 'http://localhost:8080/api/v1';

export function getApiBaseUrl(env: Env = import.meta.env): string {
  return env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

export const apiBaseUrl = getApiBaseUrl();
