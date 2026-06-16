package com.junglecamp.backend.board.controller;

import com.junglecamp.backend.board.dto.BoardPostDtos;
import com.junglecamp.backend.board.dto.BoardPostDtos.BoardNotificationResponse;
import com.junglecamp.backend.board.dto.BoardPostDtos.CommentRequest;
import com.junglecamp.backend.board.dto.BoardPostDtos.CommentResponse;
import com.junglecamp.backend.board.dto.BoardPostDtos.LikeResponse;
import com.junglecamp.backend.board.dto.BoardPostDtos.PostDetail;
import com.junglecamp.backend.board.dto.BoardPostDtos.PostFeedResponse;
import com.junglecamp.backend.board.dto.BoardPostDtos.PostRequest;
import com.junglecamp.backend.board.dto.BoardPostDtos.ReportRequest;
import com.junglecamp.backend.board.dto.BoardPostDtos.TagResponse;
import com.junglecamp.backend.board.service.BoardPostService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class BoardPostController {

	private final BoardPostService boardPostService;

	public BoardPostController(BoardPostService boardPostService) {
		this.boardPostService = boardPostService;
	}

	@GetMapping("/posts")
	public PostFeedResponse listPosts(
			@RequestParam(required = false) String query,
			@RequestParam(required = false) String tag,
			@RequestParam(required = false) String category,
			@RequestParam(defaultValue = "latest") String sort,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "10") int size,
			Authentication authentication) {
		return boardPostService.search(query, tag, category, sort, page, size, authentication);
	}

	@PostMapping("/posts")
	@ResponseStatus(HttpStatus.CREATED)
	public PostDetail createPost(@RequestBody PostRequest request, Authentication authentication) {
		return boardPostService.createPost(request, authentication);
	}

	@GetMapping("/posts/{id}")
	public PostDetail getPost(@PathVariable Long id, Authentication authentication) {
		return boardPostService.getPost(id, authentication);
	}

	@PutMapping("/posts/{id}")
	public PostDetail updatePost(
			@PathVariable Long id,
			@RequestBody PostRequest request,
			Authentication authentication) {
		return boardPostService.updatePost(id, request, authentication);
	}

	@DeleteMapping("/posts/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deletePost(@PathVariable Long id, Authentication authentication) {
		boardPostService.deletePost(id, authentication);
	}

	@PostMapping("/posts/{id}/like")
	public LikeResponse likePost(@PathVariable Long id, Authentication authentication) {
		return boardPostService.likePost(id, authentication);
	}

	@DeleteMapping("/posts/{id}/like")
	public LikeResponse unlikePost(@PathVariable Long id, Authentication authentication) {
		return boardPostService.unlikePost(id, authentication);
	}

	@PostMapping("/posts/{id}/reports")
	@ResponseStatus(HttpStatus.CREATED)
	public void reportPost(
			@PathVariable Long id,
			@RequestBody ReportRequest request,
			Authentication authentication) {
		boardPostService.reportPost(id, request, authentication);
	}

	@PostMapping("/posts/{postId}/comments")
	@ResponseStatus(HttpStatus.CREATED)
	public CommentResponse createComment(
			@PathVariable Long postId,
			@RequestBody CommentRequest request,
			Authentication authentication) {
		return boardPostService.createComment(postId, request, authentication);
	}

	@PutMapping("/posts/{postId}/comments/{commentId}")
	public CommentResponse updateComment(
			@PathVariable Long postId,
			@PathVariable Long commentId,
			@RequestBody CommentRequest request,
			Authentication authentication) {
		return boardPostService.updateComment(postId, commentId, request, authentication);
	}

	@DeleteMapping("/posts/{postId}/comments/{commentId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteComment(
			@PathVariable Long postId,
			@PathVariable Long commentId,
			Authentication authentication) {
		boardPostService.deleteComment(postId, commentId, authentication);
	}

	@PostMapping("/posts/{postId}/comments/{commentId}/reports")
	@ResponseStatus(HttpStatus.CREATED)
	public void reportComment(
			@PathVariable Long postId,
			@PathVariable Long commentId,
			@RequestBody ReportRequest request,
			Authentication authentication) {
		boardPostService.reportComment(postId, commentId, request, authentication);
	}

	@GetMapping("/tags")
	public List<TagResponse> listTags() {
		return boardPostService.listTags();
	}

	@GetMapping("/board/notifications")
	public BoardNotificationResponse notifications(Authentication authentication) {
		return boardPostService.notifications(authentication);
	}

	@PostMapping("/board/notifications/{notificationId}/read")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void markNotificationRead(
			@PathVariable Long notificationId,
			Authentication authentication) {
		boardPostService.markNotificationRead(notificationId, authentication);
	}

	@PostMapping("/board/notifications/read-all")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void markNotificationsRead(Authentication authentication) {
		boardPostService.markNotificationsRead(authentication);
	}
}
