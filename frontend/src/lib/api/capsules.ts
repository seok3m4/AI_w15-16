import { apiRequest } from './client';
import {
  ContextCapsuleCompactContextResponse,
  ContextCapsuleListResponse,
  ContextCapsuleResponse,
  CreateContextCapsuleRequest,
  UpdateContextCapsuleRequest,
} from './types';

export type ContextCapsuleListParams = {
  page?: number;
  size?: number;
};

export const capsuleQueryKeys = {
  all: ['capsules'] as const,
  list: (params: ContextCapsuleListParams = {}) =>
    ['capsules', 'list', { page: params.page ?? 0, size: params.size ?? 20 }] as const,
  detail: (capsuleId: string) => ['capsules', 'detail', capsuleId] as const,
  compact: (capsuleId: string) => ['capsules', 'compact', capsuleId] as const,
};

export function listCapsules(
  params: ContextCapsuleListParams = {},
): Promise<ContextCapsuleListResponse> {
  const query = new URLSearchParams({
    page: String(params.page ?? 0),
    size: String(params.size ?? 20),
  });

  return apiRequest<ContextCapsuleListResponse>(`/context-capsules?${query.toString()}`);
}

export function getCapsule(capsuleId: string): Promise<ContextCapsuleResponse> {
  return apiRequest<ContextCapsuleResponse>(`/context-capsules/${capsuleId}`);
}

export function getCompactContext(
  capsuleId: string,
): Promise<ContextCapsuleCompactContextResponse> {
  return apiRequest<ContextCapsuleCompactContextResponse>(
    `/context-capsules/${capsuleId}/compact-context`,
  );
}

export function createCapsule(
  request: CreateContextCapsuleRequest,
): Promise<ContextCapsuleResponse> {
  return apiRequest<ContextCapsuleResponse>('/context-capsules', {
    body: {
      ...request,
      scope: request.scope ?? 'me',
    },
    method: 'POST',
  });
}

export function updateCapsule(
  capsuleId: string,
  request: UpdateContextCapsuleRequest,
): Promise<ContextCapsuleResponse> {
  return apiRequest<ContextCapsuleResponse>(`/context-capsules/${capsuleId}`, {
    body: request,
    method: 'PUT',
  });
}

export function deleteCapsule(capsuleId: string): Promise<void> {
  return apiRequest<void>(`/context-capsules/${capsuleId}`, {
    method: 'DELETE',
  });
}
