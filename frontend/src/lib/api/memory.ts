import { apiRequest } from './client';
import {
  AsyncJobResponse,
  MemorySearchRequest,
  MemorySearchResponse,
  PostMemoryStatus,
  ReindexMemoriesRequest,
} from './types';

export const memoryQueryKeys = {
  search: (query: string) => ['memory', 'search', { query }] as const,
  status: (postId: string) => ['memory', 'status', postId] as const,
  job: (jobId: string) => ['memory', 'jobs', jobId] as const,
};

export function searchMemories(request: MemorySearchRequest): Promise<MemorySearchResponse> {
  return apiRequest<MemorySearchResponse>('/memory-search', {
    body: {
      ...request,
      scope: request.scope ?? 'me',
    },
    method: 'POST',
  });
}

export function reindexMemories(request: ReindexMemoriesRequest): Promise<AsyncJobResponse> {
  return apiRequest<AsyncJobResponse>('/memories/reindex', {
    body: request,
    method: 'POST',
  });
}

export function getMemoryStatus(postId: string): Promise<PostMemoryStatus> {
  return apiRequest<PostMemoryStatus>(`/posts/${postId}/memory-status`);
}

export function getJob(jobId: string): Promise<AsyncJobResponse> {
  return apiRequest<AsyncJobResponse>(`/jobs/${jobId}`);
}
