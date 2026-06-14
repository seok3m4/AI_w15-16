package com.junglecamp.backend.board.dto;

import java.time.Instant;
import java.util.List;

public final class BoardPostDtos {

	private BoardPostDtos() {
	}

	public record PostRequest(String title, String content, List<String> tags, String category) {
	}

	public record CommentRequest(String content, Long parentCommentId) {
	}

	public record ReportRequest(String reason, String detail) {
	}

	public record AuthorProfile(
			Long userId,
			String nickname,
			String displayName,
			String avatarUrl) {
	}

	public record PostFeedResponse(
			List<PostSummary> items,
			int page,
			int size,
			long totalElements,
			int totalPages) {
	}

	public record PostSummary(
			Long id,
			String category,
			String title,
			String excerpt,
			String author,
			AuthorProfile authorProfile,
			List<String> tags,
			int commentCount,
			int likeCount,
			boolean likedByMe,
			Instant createdAt,
			Instant updatedAt) {
	}

	public record PostDetail(
			Long id,
			String category,
			String title,
			String content,
			String author,
			AuthorProfile authorProfile,
			List<String> tags,
			List<CommentResponse> comments,
			int commentCount,
			int likeCount,
			boolean likedByMe,
			Instant createdAt,
			Instant updatedAt) {
	}

	public record CommentResponse(
			Long id,
			Long parentCommentId,
			String content,
			String author,
			AuthorProfile authorProfile,
			List<CommentResponse> replies,
			Instant createdAt,
			Instant updatedAt) {
	}

	public record TagResponse(Long id, String name) {
	}

	public record LikeResponse(Long postId, int likeCount, boolean likedByMe) {
	}

	public record BoardNotificationResponse(List<BoardNotificationItem> items, long unreadCount) {
	}

	public record BoardNotificationItem(
			Long id,
			Long postId,
			Long commentId,
			String type,
			String message,
			AuthorProfile actor,
			boolean read,
			Instant createdAt) {
	}
}
