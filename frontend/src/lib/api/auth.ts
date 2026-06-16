import { apiRequest } from './client';
import {
  AiSharingSettingResponse,
  LoginRequest,
  LoginResponse,
  SignupRequest,
  UserPrivateResponse,
} from './types';

export function signup(request: SignupRequest): Promise<UserPrivateResponse> {
  return apiRequest<UserPrivateResponse>('/auth/signup', {
    method: 'POST',
    body: request,
  });
}

export function login(request: LoginRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: request,
    skipAuthRefresh: true,
  });
}

export function logout(): Promise<void> {
  return apiRequest<void>('/auth/logout', {
    method: 'POST',
    skipAuthRefresh: true,
  });
}

export function me(): Promise<UserPrivateResponse> {
  return apiRequest<UserPrivateResponse>('/auth/me');
}

export function updateAiSharing(enabled: boolean): Promise<AiSharingSettingResponse> {
  return apiRequest<AiSharingSettingResponse>('/privacy/ai-sharing', {
    method: 'PUT',
    body: { enabled },
  });
}
