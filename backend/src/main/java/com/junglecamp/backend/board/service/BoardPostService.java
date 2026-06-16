package com.junglecamp.backend.board.service;

import com.junglecamp.backend.board.dto.BoardPostDtos;
import com.junglecamp.backend.board.dto.BoardPostDtos.AuthorProfile;
import com.junglecamp.backend.board.dto.BoardPostDtos.BoardNotificationItem;
import com.junglecamp.backend.board.dto.BoardPostDtos.BoardNotificationResponse;
import com.junglecamp.backend.board.dto.BoardPostDtos.CommentRequest;
import com.junglecamp.backend.board.dto.BoardPostDtos.CommentResponse;
import com.junglecamp.backend.board.dto.BoardPostDtos.LikeResponse;
import com.junglecamp.backend.board.dto.BoardPostDtos.PostDetail;
import com.junglecamp.backend.board.dto.BoardPostDtos.PostFeedResponse;
import com.junglecamp.backend.board.dto.BoardPostDtos.PostRequest;
import com.junglecamp.backend.board.dto.BoardPostDtos.PostSummary;
import com.junglecamp.backend.board.dto.BoardPostDtos.ReportRequest;
import com.junglecamp.backend.board.dto.BoardPostDtos.TagResponse;
import com.junglecamp.backend.board.model.BoardComment;
import com.junglecamp.backend.board.model.BoardPost;
import com.junglecamp.backend.board.model.BoardTag;
import com.junglecamp.backend.board.repository.BoardCommentRepository;
import com.junglecamp.backend.board.repository.BoardPostRepository;
import com.junglecamp.backend.board.repository.BoardTagRepository;
import com.junglecamp.backend.rag.service.RagIndexService;
import com.junglecamp.backend.user.model.AppUser;
import com.junglecamp.backend.user.repository.AppUserRepository;
import com.junglecamp.backend.user.service.AppUserService;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.function.Function;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BoardPostService {

	private static final String DELETED_POST_MESSAGE = "삭제된 게시글입니다.";

	private static final Set<String> CATEGORIES = Set.of(
			"inflation",
			"jobs",
			"rates",
			"fx",
			"markets",
			"commodities",
			"korea",
			"question",
			"general");

	private final BoardPostRepository postRepository;
	private final BoardTagRepository tagRepository;
	private final BoardCommentRepository commentRepository;
	private final RagIndexService ragIndexService;
	private final AppUserService appUserService;
	private final AppUserRepository appUserRepository;
	private final JdbcTemplate jdbcTemplate;

	public BoardPostService(
			BoardPostRepository postRepository,
			BoardTagRepository tagRepository,
			BoardCommentRepository commentRepository,
			RagIndexService ragIndexService,
			AppUserService appUserService,
			AppUserRepository appUserRepository,
			JdbcTemplate jdbcTemplate) {
		this.postRepository = postRepository;
		this.tagRepository = tagRepository;
		this.commentRepository = commentRepository;
		this.ragIndexService = ragIndexService;
		this.appUserService = appUserService;
		this.appUserRepository = appUserRepository;
		this.jdbcTemplate = jdbcTemplate;
	}

	@Transactional(readOnly = true)
	public PostFeedResponse search(
			String query,
			String tag,
			String category,
			String sort,
			int page,
			int size,
			Authentication authentication) {
		Long viewerUserId = currentUserId(authentication);
		String normalizedQuery = normalizeSearchTerm(query);
		List<BoardPost> posts = postRepository.search(
				normalizedQuery == null ? "" : normalizedQuery,
				normalizeSingleTag(tag),
				normalizeCategoryFilter(category));
		Map<Long, Integer> likeCounts = likeCounts(posts.stream().map(BoardPost::getId).toList());
		if ("popular".equals(normalizeSearchTerm(sort))) {
			posts = posts.stream()
					.sorted(Comparator
							.comparing((BoardPost post) -> likeCounts.getOrDefault(post.getId(), 0))
							.reversed()
							.thenComparing(BoardPost::getCreatedAt, Comparator.reverseOrder()))
					.toList();
		}

		int safeSize = Math.max(1, Math.min(size <= 0 ? 10 : size, 50));
		int safePage = Math.max(0, page);
		int from = Math.min(safePage * safeSize, posts.size());
		int to = Math.min(from + safeSize, posts.size());
		List<PostSummary> items = posts.subList(from, to)
				.stream()
				.map(post -> toSummary(post, viewerUserId, likeCounts.getOrDefault(post.getId(), 0)))
				.toList();
		int totalPages = posts.isEmpty() ? 0 : (int) Math.ceil((double) posts.size() / safeSize);
		return new PostFeedResponse(items, safePage, safeSize, posts.size(), totalPages);
	}

	@Transactional(readOnly = true)
	public PostDetail getPost(Long id, Authentication authentication) {
		return toDetail(findPost(id), currentUserId(authentication));
	}

	@Transactional
	public PostDetail createPost(PostRequest request, Authentication authentication) {
		AppUser user = requireUser(authentication);
		BoardPost post = new BoardPost(
				requiredText(request.title(), "title"),
				requiredText(request.content(), "content"),
				normalizeCategory(request.category()),
				appUserService.displayNickname(user),
				user.id(),
				resolveTags(request.tags()));
		BoardPost saved = postRepository.saveAndFlush(post);
		ragIndexService.indexBoardPost(saved);
		return toDetail(saved, user.id());
	}

	@Transactional
	public PostDetail updatePost(Long id, PostRequest request, Authentication authentication) {
		BoardPost post = findPost(id);
		requireNotDeleted(post);
		AppUser user = requireUser(authentication);
		requireOwner(post.getAuthor(), post.getAuthorUserId(), user, authentication);
		post.update(
				requiredText(request.title(), "title"),
				requiredText(request.content(), "content"),
				normalizeCategory(request.category()),
				resolveTags(request.tags()));
		ragIndexService.indexBoardPost(post);
		return toDetail(post, user.id());
	}

	@Transactional
	public void deletePost(Long id, Authentication authentication) {
		BoardPost post = findPost(id);
		AppUser user = requireUser(authentication);
		requireOwner(post.getAuthor(), post.getAuthorUserId(), user, authentication);
		if (visibleCommentCount(post) > 0) {
			post.markDeleted();
		} else {
			post.hide();
		}
		ragIndexService.deleteBoardPost(id);
	}

	@Transactional
	public CommentResponse createComment(Long postId, CommentRequest request, Authentication authentication) {
		BoardPost post = findPost(postId);
		requireNotDeleted(post);
		AppUser user = requireUser(authentication);
		Long parentCommentId = request.parentCommentId();
		if (parentCommentId != null) {
			BoardComment parent = findVisibleComment(post, parentCommentId);
			if (parent.getParentCommentId() != null) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nested replies are not supported");
			}
		}
		BoardComment comment = post.addComment(
				requiredText(request.content(), "content"),
				appUserService.displayNickname(user),
				user.id(),
				parentCommentId);
		commentRepository.saveAndFlush(comment);
		notifyCommentTarget(post, comment, user);
		return toComment(comment, List.of());
	}

	@Transactional
	public CommentResponse updateComment(Long postId, Long commentId, CommentRequest request, Authentication authentication) {
		BoardPost post = findPost(postId);
		BoardComment comment = findVisibleComment(post, commentId);
		AppUser user = requireUser(authentication);
		requireOwner(comment.getAuthor(), comment.getAuthorUserId(), user, authentication);
		comment.update(requiredText(request.content(), "content"));
		return toComment(comment, visibleReplies(post, comment.getId()));
	}

	@Transactional
	public void deleteComment(Long postId, Long commentId, Authentication authentication) {
		BoardPost post = findPost(postId);
		BoardComment comment = findVisibleComment(post, commentId);
		AppUser user = requireUser(authentication);
		requireOwner(comment.getAuthor(), comment.getAuthorUserId(), user, authentication);
		comment.hide();
		if (comment.getParentCommentId() == null) {
			visibleReplies(post, comment.getId()).forEach(BoardComment::hide);
		}
	}

	@Transactional
	public LikeResponse likePost(Long postId, Authentication authentication) {
		BoardPost post = findPost(postId);
		requireNotDeleted(post);
		AppUser user = requireUser(authentication);
		Integer existing = jdbcTemplate.queryForObject(
				"SELECT COUNT(*) FROM board_post_likes WHERE post_id = ? AND user_id = ?",
				Integer.class,
				post.getId(),
				user.id());
		if (existing == null || existing == 0) {
			jdbcTemplate.update("""
					INSERT INTO board_post_likes (post_id, user_id)
					VALUES (?, ?)
					""", post.getId(), user.id());
		}
		return new LikeResponse(post.getId(), likeCount(post.getId()), true);
	}

	@Transactional
	public LikeResponse unlikePost(Long postId, Authentication authentication) {
		BoardPost post = findPost(postId);
		requireNotDeleted(post);
		AppUser user = requireUser(authentication);
		jdbcTemplate.update(
				"DELETE FROM board_post_likes WHERE post_id = ? AND user_id = ?",
				post.getId(),
				user.id());
		return new LikeResponse(post.getId(), likeCount(post.getId()), false);
	}

	@Transactional
	public void reportPost(Long postId, ReportRequest request, Authentication authentication) {
		BoardPost post = findPost(postId);
		requireNotDeleted(post);
		AppUser user = requireUser(authentication);
		insertReport("POST", post.getId(), null, user.id(), request);
	}

	@Transactional
	public void reportComment(Long postId, Long commentId, ReportRequest request, Authentication authentication) {
		BoardPost post = findPost(postId);
		BoardComment comment = findVisibleComment(post, commentId);
		AppUser user = requireUser(authentication);
		insertReport("COMMENT", post.getId(), comment.getId(), user.id(), request);
	}

	@Transactional(readOnly = true)
	public BoardNotificationResponse notifications(Authentication authentication) {
		AppUser user = requireUser(authentication);
		List<BoardNotificationItem> items = jdbcTemplate.query("""
				SELECT
					n.id,
					n.post_id,
					n.comment_id,
					n.actor_user_id,
					n.type,
					n.message,
					p.title AS post_title,
					p.category AS post_category,
					p.content AS post_content,
					p.deleted_at AS post_deleted_at,
					c.content AS comment_content,
					n.read_at,
					n.created_at
				FROM board_notifications n
				JOIN board_posts p ON p.id = n.post_id
				LEFT JOIN board_comments c ON c.id = n.comment_id AND c.hidden_at IS NULL
				WHERE n.recipient_user_id = ? AND p.hidden_at IS NULL
				ORDER BY n.created_at DESC, n.id DESC
				LIMIT 30
				""", this::mapNotification, user.id());
		Long unreadCount = jdbcTemplate.queryForObject("""
				SELECT COUNT(*)
				FROM board_notifications n
				JOIN board_posts p ON p.id = n.post_id
				WHERE n.recipient_user_id = ? AND n.read_at IS NULL AND p.hidden_at IS NULL
				""", Long.class, user.id());
		return new BoardNotificationResponse(items, unreadCount == null ? 0 : unreadCount);
	}

	@Transactional
	public void markNotificationRead(Long notificationId, Authentication authentication) {
		AppUser user = requireUser(authentication);
		jdbcTemplate.update("""
				UPDATE board_notifications
				SET read_at = CURRENT_TIMESTAMP
				WHERE id = ? AND recipient_user_id = ? AND read_at IS NULL
				""", notificationId, user.id());
	}

	@Transactional
	public void markNotificationsRead(Authentication authentication) {
		AppUser user = requireUser(authentication);
		jdbcTemplate.update("""
				UPDATE board_notifications
				SET read_at = CURRENT_TIMESTAMP
				WHERE recipient_user_id = ? AND read_at IS NULL
				""", user.id());
	}

	@Transactional(readOnly = true)
	public List<TagResponse> listTags() {
		return tagRepository.findAllByOrderByNameAsc()
				.stream()
				.map(tag -> new TagResponse(tag.getId(), tag.getName()))
				.toList();
	}

	private BoardPost findPost(Long id) {
		return postRepository.findDetailedById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found"));
	}

	private BoardComment findVisibleComment(BoardPost post, Long commentId) {
		return post.getComments()
				.stream()
				.filter(comment -> comment.getHiddenAt() == null)
				.filter(comment -> comment.getId().equals(commentId))
				.findFirst()
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found"));
	}

	private void requireNotDeleted(BoardPost post) {
		if (post.isDeleted()) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found");
		}
	}

	private List<BoardComment> visibleReplies(BoardPost post, Long parentCommentId) {
		return post.getComments()
				.stream()
				.filter(comment -> comment.getHiddenAt() == null)
				.filter(comment -> Objects.equals(comment.getParentCommentId(), parentCommentId))
				.sorted(Comparator.comparing(BoardComment::getCreatedAt))
				.toList();
	}

	private Set<BoardTag> resolveTags(Collection<String> rawTags) {
		List<String> names = normalizeTags(rawTags);
		if (names.isEmpty()) {
			return new LinkedHashSet<>();
		}

		Map<String, BoardTag> existing = tagRepository.findByNameIn(names)
				.stream()
				.collect(Collectors.toMap(BoardTag::getName, Function.identity()));

		Set<BoardTag> resolved = new LinkedHashSet<>();
		for (String name : names) {
			resolved.add(existing.computeIfAbsent(name, tag -> tagRepository.save(new BoardTag(tag))));
		}
		return resolved;
	}

	private List<String> normalizeTags(Collection<String> rawTags) {
		if (rawTags == null) {
			return List.of();
		}
		return rawTags.stream()
				.map(this::normalizeSingleTag)
				.filter(tag -> tag != null && !tag.isBlank())
				.distinct()
				.sorted()
				.toList();
	}

	private String normalizeSingleTag(String tag) {
		if (tag == null) {
			return null;
		}
		String normalized = tag.trim().toLowerCase(Locale.ROOT);
		return normalized.isBlank() ? null : normalized;
	}

	private String normalizeSearchTerm(String value) {
		if (value == null || value.isBlank()) {
			return null;
		}
		return value.trim().toLowerCase(Locale.ROOT);
	}

	private String normalizeCategoryFilter(String category) {
		if (category == null || category.isBlank()) {
			return null;
		}
		return normalizeCategory(category);
	}

	private String normalizeCategory(String category) {
		String normalized = category == null || category.isBlank()
				? "general"
				: category.trim().toLowerCase(Locale.ROOT);
		if (!CATEGORIES.contains(normalized)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown board category");
		}
		return normalized;
	}

	private String requiredText(String value, String fieldName) {
		if (value == null || value.isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " is required");
		}
		return value.trim();
	}

	private AppUser requireUser(Authentication authentication) {
		if (!isRealUser(authentication)) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
		}
		return appUserService.currentUser(authentication);
	}

	private Long currentUserId(Authentication authentication) {
		if (!isRealUser(authentication)) {
			return null;
		}
		return appUserService.currentUser(authentication).id();
	}

	private boolean isRealUser(Authentication authentication) {
		return authentication != null
				&& authentication.isAuthenticated()
				&& !(authentication instanceof AnonymousAuthenticationToken);
	}

	private void requireOwner(String owner, Long ownerUserId, AppUser user, Authentication authentication) {
		if (ownerUserId != null && ownerUserId.equals(user.id())) {
			return;
		}
		if (ownerUserId == null && owner != null && owner.equals(authentication.getName())) {
			return;
		}
		throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the author can change this resource");
	}

	private PostSummary toSummary(BoardPost post, Long viewerUserId, int likeCount) {
		boolean deleted = post.isDeleted();
		return new PostSummary(
				post.getId(),
				post.getCategory(),
				deleted ? DELETED_POST_MESSAGE : post.getTitle(),
				deleted ? DELETED_POST_MESSAGE : excerpt(post.getContent()),
				authorName(post.getAuthorUserId(), post.getAuthor()),
				authorProfile(post.getAuthorUserId(), post.getAuthor()),
				deleted ? List.of() : tagNames(post),
				visibleCommentCount(post),
				deleted ? 0 : likeCount,
				!deleted && viewerUserId != null && likedBy(post.getId(), viewerUserId),
				deleted,
				post.getCreatedAt(),
				post.getUpdatedAt());
	}

	private PostDetail toDetail(BoardPost post, Long viewerUserId) {
		boolean deleted = post.isDeleted();
		int likeCount = likeCount(post.getId());
		return new PostDetail(
				post.getId(),
				post.getCategory(),
				deleted ? DELETED_POST_MESSAGE : post.getTitle(),
				deleted ? DELETED_POST_MESSAGE : post.getContent(),
				authorName(post.getAuthorUserId(), post.getAuthor()),
				authorProfile(post.getAuthorUserId(), post.getAuthor()),
				deleted ? List.of() : tagNames(post),
				comments(post),
				visibleCommentCount(post),
				deleted ? 0 : likeCount,
				!deleted && viewerUserId != null && likedBy(post.getId(), viewerUserId),
				deleted,
				post.getCreatedAt(),
				post.getUpdatedAt());
	}

	private CommentResponse toComment(BoardComment comment, List<BoardComment> replies) {
		return new CommentResponse(
				comment.getId(),
				comment.getParentCommentId(),
				comment.getContent(),
				authorName(comment.getAuthorUserId(), comment.getAuthor()),
				authorProfile(comment.getAuthorUserId(), comment.getAuthor()),
				replies.stream().map(reply -> toComment(reply, List.of())).toList(),
				comment.getCreatedAt(),
				comment.getUpdatedAt());
	}

	private List<String> tagNames(BoardPost post) {
		return post.getTags()
				.stream()
				.map(BoardTag::getName)
				.sorted()
				.toList();
	}

	private List<CommentResponse> comments(BoardPost post) {
		List<BoardComment> visible = post.getComments()
				.stream()
				.filter(comment -> comment.getHiddenAt() == null)
				.sorted(Comparator.comparing(BoardComment::getCreatedAt))
				.toList();
		Map<Long, List<BoardComment>> repliesByParent = visible.stream()
				.filter(comment -> comment.getParentCommentId() != null)
				.collect(Collectors.groupingBy(BoardComment::getParentCommentId));
		return visible.stream()
				.filter(comment -> comment.getParentCommentId() == null)
				.map(comment -> toComment(comment, repliesByParent.getOrDefault(comment.getId(), List.of())))
				.toList();
	}

	private int visibleCommentCount(BoardPost post) {
		return (int) post.getComments()
				.stream()
				.filter(comment -> comment.getHiddenAt() == null)
				.count();
	}

	private AuthorProfile authorProfile(Long userId, String fallback) {
		if (userId == null) {
			return new AuthorProfile(null, fallback, fallback, null);
		}
		return appUserRepository.findById(userId)
				.map(user -> new AuthorProfile(
						user.id(),
						appUserService.displayNickname(user),
						user.displayName(),
						user.avatarUrl()))
				.orElseGet(() -> new AuthorProfile(userId, fallback, fallback, null));
	}

	private String authorName(Long userId, String fallback) {
		return authorProfile(userId, fallback).nickname();
	}

	private Map<Long, Integer> likeCounts(List<Long> postIds) {
		if (postIds == null || postIds.isEmpty()) {
			return Map.of();
		}
		String placeholders = String.join(",", postIds.stream().map(id -> "?").toList());
		Map<Long, Integer> counts = new HashMap<>();
		jdbcTemplate.query("""
				SELECT post_id, COUNT(*) AS like_count
				FROM board_post_likes
				WHERE post_id IN (%s)
				GROUP BY post_id
				""".formatted(placeholders), resultSet -> {
			counts.put(resultSet.getLong("post_id"), resultSet.getInt("like_count"));
		}, postIds.toArray());
		return counts;
	}

	private int likeCount(Long postId) {
		Integer count = jdbcTemplate.queryForObject(
				"SELECT COUNT(*) FROM board_post_likes WHERE post_id = ?",
				Integer.class,
				postId);
		return count == null ? 0 : count;
	}

	private boolean likedBy(Long postId, Long userId) {
		Integer count = jdbcTemplate.queryForObject(
				"SELECT COUNT(*) FROM board_post_likes WHERE post_id = ? AND user_id = ?",
				Integer.class,
				postId,
				userId);
		return count != null && count > 0;
	}

	private void insertReport(String targetType, Long postId, Long commentId, Long reporterUserId, ReportRequest request) {
		jdbcTemplate.update("""
				INSERT INTO board_reports (target_type, post_id, comment_id, reporter_user_id, reason, detail)
				VALUES (?, ?, ?, ?, ?, ?)
				""",
				targetType,
				postId,
				commentId,
				reporterUserId,
				requiredText(request.reason(), "reason"),
				request.detail() == null ? "" : request.detail().trim());
	}

	private void notifyCommentTarget(BoardPost post, BoardComment comment, AppUser actor) {
		Long recipientUserId = post.getAuthorUserId();
		String type = "post_comment";
		if (comment.getParentCommentId() != null) {
			BoardComment parent = findVisibleComment(post, comment.getParentCommentId());
			recipientUserId = parent.getAuthorUserId();
			type = "comment_reply";
		}
		if (recipientUserId == null || recipientUserId.equals(actor.id())) {
			return;
		}
		jdbcTemplate.update("""
				INSERT INTO board_notifications (
					recipient_user_id, actor_user_id, post_id, comment_id, type, message
				)
				VALUES (?, ?, ?, ?, ?, ?)
				""",
				recipientUserId,
				actor.id(),
				post.getId(),
				comment.getId(),
				type,
				appUserService.displayNickname(actor) + " commented on your discussion.");
	}

	private BoardNotificationItem mapNotification(ResultSet resultSet, int rowNumber) throws SQLException {
		Long actorUserId = resultSet.getLong("actor_user_id");
		if (resultSet.wasNull()) {
			actorUserId = null;
		}
		Long commentId = resultSet.getLong("comment_id");
		if (resultSet.wasNull()) {
			commentId = null;
		}
		Timestamp readAt = resultSet.getTimestamp("read_at");
		return new BoardNotificationItem(
				resultSet.getLong("id"),
				resultSet.getLong("post_id"),
				commentId,
				resultSet.getString("type"),
				resultSet.getString("message"),
				resultSet.getString("post_title"),
				resultSet.getString("post_category"),
				resultSet.getTimestamp("post_deleted_at") == null
						? excerpt(resultSet.getString("post_content"))
						: DELETED_POST_MESSAGE,
				resultSet.getString("comment_content"),
				authorProfile(actorUserId, "user"),
				readAt != null,
				toInstant(resultSet.getTimestamp("created_at")));
	}

	private Instant toInstant(Timestamp timestamp) {
		return timestamp == null ? null : timestamp.toInstant();
	}

	private String excerpt(String content) {
		if (content.length() <= 120) {
			return content;
		}
		return content.substring(0, 117) + "...";
	}
}
