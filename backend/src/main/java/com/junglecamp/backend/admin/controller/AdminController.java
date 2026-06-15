package com.junglecamp.backend.admin.controller;

import com.junglecamp.backend.admin.dto.AdminDtos;
import com.junglecamp.backend.admin.dto.AdminDtos.AdminActionResponse;
import com.junglecamp.backend.admin.dto.AdminDtos.AdminPageResponse;
import com.junglecamp.backend.admin.dto.AdminDtos.AdminUserItem;
import com.junglecamp.backend.admin.dto.AdminDtos.AgentRunItem;
import com.junglecamp.backend.admin.dto.AdminDtos.AuditLogItem;
import com.junglecamp.backend.admin.dto.AdminDtos.BoardReportItem;
import com.junglecamp.backend.admin.dto.AdminDtos.EconomySyncRunItem;
import com.junglecamp.backend.admin.dto.AdminDtos.UpdateRolesRequest;
import com.junglecamp.backend.admin.service.AdminService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

	private final AdminService adminService;

	public AdminController(AdminService adminService) {
		this.adminService = adminService;
	}

	@GetMapping("/users")
	public AdminPageResponse<AdminUserItem> users(
			@RequestParam(required = false) String query,
			@RequestParam(required = false) String role,
			@RequestParam(required = false) String status,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		return adminService.users(query, role, status, page, size);
	}

	@PostMapping("/users/{userId}/roles")
	public AdminUserItem updateRoles(
			@PathVariable Long userId,
			@RequestBody UpdateRolesRequest request,
			Authentication authentication) {
		return adminService.updateRoles(userId, request.roles(), authentication);
	}

	@PostMapping("/users/{userId}/suspend")
	public AdminUserItem suspend(@PathVariable Long userId, Authentication authentication) {
		return adminService.suspend(userId, authentication);
	}

	@PostMapping("/users/{userId}/unsuspend")
	public AdminUserItem unsuspend(@PathVariable Long userId, Authentication authentication) {
		return adminService.unsuspend(userId, authentication);
	}

	@GetMapping("/reports")
	public List<BoardReportItem> reports() {
		return adminService.reports();
	}

	@PostMapping("/posts/{postId}/hide")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void hidePost(@PathVariable Long postId, Authentication authentication) {
		adminService.hidePost(postId, authentication);
	}

	@DeleteMapping("/posts/{postId}/hard-delete")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void hardDeletePost(@PathVariable Long postId, Authentication authentication) {
		adminService.hardDeletePost(postId, authentication);
	}

	@PostMapping("/comments/{commentId}/hide")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void hideComment(@PathVariable Long commentId, Authentication authentication) {
		adminService.hideComment(commentId, authentication);
	}

	@DeleteMapping("/comments/{commentId}/hard-delete")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void hardDeleteComment(@PathVariable Long commentId, Authentication authentication) {
		adminService.hardDeleteComment(commentId, authentication);
	}

	@GetMapping("/economy/sync-runs")
	public List<EconomySyncRunItem> economySyncRuns() {
		return adminService.economySyncRuns();
	}

	@PostMapping("/economy/sync-now")
	public AdminActionResponse syncEconomy(Authentication authentication) {
		return adminService.syncEconomy(authentication);
	}

	@GetMapping("/agents/runs")
	public List<AgentRunItem> agentRuns() {
		return adminService.agentRuns();
	}

	@PostMapping("/agents/runs/{runId}/retry")
	public AdminActionResponse retryAgentRun(@PathVariable Long runId, Authentication authentication) {
		return adminService.retryAgentRun(runId, authentication);
	}

	@GetMapping("/audit-logs")
	public AdminPageResponse<AuditLogItem> auditLogs() {
		return adminService.auditLogs();
	}
}
