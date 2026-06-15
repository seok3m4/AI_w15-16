package com.junglecamp.backend.admin.dto;

import java.util.List;

public final class AdminDtos {

	private AdminDtos() {
	}

	public record AdminUserItem(
			Long id,
			String provider,
			String email,
			String displayName,
			String nickname,
			String avatarUrl,
			List<String> roles,
			boolean emailVerified,
			boolean suspended) {
	}

	public record AdminPageResponse<T>(
			List<T> items,
			int page,
			int size,
			long totalElements,
			int totalPages) {
	}

	public record UpdateRolesRequest(List<String> roles) {
	}

	public record AuditLogItem(
			Long id,
			Long adminUserId,
			String action,
			String targetType,
			String targetId,
			String detail,
			String createdAt) {
	}

	public record BoardReportItem(
			Long id,
			String targetType,
			Long postId,
			Long commentId,
			Long reporterUserId,
			String reason,
			String detail,
			String createdAt) {
	}

	public record EconomySyncRunItem(
			Long id,
			String source,
			String startedAt,
			String finishedAt,
			String status,
			String errorMessage) {
	}

	public record AgentRunItem(
			Long id,
			Long userId,
			String runType,
			String status,
			String summary,
			String model,
			String errorMessage,
			String createdAt,
			String completedAt) {
	}

	public record AdminActionResponse(String status) {
	}
}
