export const ACCESS_TOKEN_STORAGE_KEY = 'memento.accessToken';

export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function setAccessToken(accessToken: string): void {
  sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
}

export function clearAccessToken(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}
