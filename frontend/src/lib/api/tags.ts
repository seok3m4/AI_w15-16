import { apiRequest } from './client';
import { TagListResponse } from './types';

export const tagQueryKeys = {
  all: ['tags'] as const,
  list: (page: number, size: number) => ['tags', 'list', page, size] as const,
};

export function listTags(page = 0, size = 50): Promise<TagListResponse> {
  const query = new URLSearchParams({
    page: String(page),
    size: String(size),
  });

  return apiRequest<TagListResponse>(`/tags?${query.toString()}`);
}
