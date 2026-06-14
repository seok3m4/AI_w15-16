package com.junglecamp.backend.board.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "board_comments")
public class BoardComment {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "post_id", nullable = false)
	private BoardPost post;

	@Column(nullable = false, columnDefinition = "text")
	private String content;

	@Column(nullable = false, length = 80)
	private String author;

	@Column(name = "author_user_id")
	private Long authorUserId;

	@Column(name = "parent_comment_id")
	private Long parentCommentId;

	@Column(name = "hidden_at")
	private Instant hiddenAt;

	@Column(nullable = false)
	private Instant createdAt;

	@Column(nullable = false)
	private Instant updatedAt;

	protected BoardComment() {
	}

	BoardComment(BoardPost post, String content, String author, Long authorUserId, Long parentCommentId) {
		this.post = post;
		this.content = content;
		this.author = author;
		this.authorUserId = authorUserId;
		this.parentCommentId = parentCommentId;
	}

	@PrePersist
	void prePersist() {
		Instant now = Instant.now();
		createdAt = now;
		updatedAt = now;
	}

	@PreUpdate
	void preUpdate() {
		updatedAt = Instant.now();
	}

	public void update(String content) {
		this.content = content;
	}

	public void hide() {
		this.hiddenAt = Instant.now();
	}

	public Long getId() {
		return id;
	}

	public BoardPost getPost() {
		return post;
	}

	public String getContent() {
		return content;
	}

	public String getAuthor() {
		return author;
	}

	public Long getAuthorUserId() {
		return authorUserId;
	}

	public Long getParentCommentId() {
		return parentCommentId;
	}

	public Instant getHiddenAt() {
		return hiddenAt;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}
}
