import { apiRequest } from './client';
import {
  CreateFriendshipRequest,
  FriendGiftRecommendationRequest,
  FriendGiftRecommendationResponse,
  AsyncJobResponse,
  FriendshipListResponse,
  FriendshipResponse,
  FriendshipStatus,
  FriendshipStatusResponse,
} from './types';

export type FriendshipListParams = {
  page?: number;
  size?: number;
  status?: FriendshipStatus;
};

export const friendshipQueryKeys = {
  all: ['friendships'] as const,
  list: (params: FriendshipListParams = {}) =>
    [
      'friendships',
      'list',
      {
        page: params.page ?? 0,
        size: params.size ?? 20,
        status: params.status ?? 'accepted',
      },
    ] as const,
  gift: (friendId: string) => ['friendships', 'gift', friendId] as const,
};

export function listFriendships(
  params: FriendshipListParams = {},
): Promise<FriendshipListResponse> {
  const query = new URLSearchParams({
    page: String(params.page ?? 0),
    size: String(params.size ?? 20),
    status: params.status ?? 'accepted',
  });
  return apiRequest<FriendshipListResponse>(`/friendships?${query.toString()}`);
}

export function requestFriend(request: CreateFriendshipRequest): Promise<FriendshipResponse> {
  return apiRequest<FriendshipResponse>('/friendships/requests', {
    body: request,
    method: 'POST',
  });
}

export function acceptFriendship(friendshipId: string): Promise<FriendshipStatusResponse> {
  return apiRequest<FriendshipStatusResponse>(`/friendships/${friendshipId}/accept`, {
    method: 'POST',
  });
}

export function rejectFriendship(friendshipId: string): Promise<FriendshipStatusResponse> {
  return apiRequest<FriendshipStatusResponse>(`/friendships/${friendshipId}/reject`, {
    method: 'POST',
  });
}

export function deleteFriendship(friendshipId: string): Promise<void> {
  return apiRequest<void>(`/friendships/${friendshipId}`, {
    method: 'DELETE',
  });
}

export function recommendFriendGifts(
  friendId: string,
  request: FriendGiftRecommendationRequest,
): Promise<FriendGiftRecommendationResponse | AsyncJobResponse> {
  return apiRequest<FriendGiftRecommendationResponse | AsyncJobResponse>(`/friends/${friendId}/gift-recommendations`, {
    body: request,
    method: 'POST',
  });
}
