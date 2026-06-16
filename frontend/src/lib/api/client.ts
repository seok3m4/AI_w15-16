import { getApiBaseUrl } from '../../config';
import { clearAccessToken, getAccessToken, setAccessToken } from '../auth/tokenStorage';
import { ApiError, ApiErrorBody, RefreshResponse } from './types';

type ApiRequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  skipAuthRefresh?: boolean;
};

const JSON_CONTENT_TYPE = 'application/json';

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const response = await request(path, options);

  if (response.status === 401 && !options.skipAuthRefresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, skipAuthRefresh: true });
    }
    dispatchUnauthorized();
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  return parseResponse<T>(response);
}

async function request(path: string, options: ApiRequestOptions): Promise<Response> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    Accept: JSON_CONTENT_TYPE,
    ...options.headers,
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = JSON_CONTENT_TYPE;
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(`${getApiBaseUrl()}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

async function refreshAccessToken(): Promise<boolean> {
  const response = await request('/auth/refresh', {
    method: 'POST',
    skipAuthRefresh: true,
  });

  if (!response.ok) {
    clearAccessToken();
    return false;
  }

  const body = await parseResponse<RefreshResponse>(response);
  setAccessToken(body.accessToken);
  return true;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody = {};
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    body = { detail: response.statusText };
  }
  return new ApiError(response.status, body);
}

function dispatchUnauthorized(): void {
  window.dispatchEvent(new CustomEvent('memento:unauthorized'));
  throw new ApiError(401, {
    code: 'UNAUTHORIZED',
    title: 'Unauthorized',
    detail: '로그인이 필요합니다.',
  });
}
