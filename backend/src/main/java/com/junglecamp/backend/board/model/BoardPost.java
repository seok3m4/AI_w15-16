package com.junglecamp.backend.board.model;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "board_posts")
public class BoardPost {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 160)
	private String title;

	@Column(nullable = false, columnDefinition = "text")
	private String content;

	@Column(nullable = false, length = 40)
	private String category = "general";

	@Column(nullable = false, length = 80)
	private String author;

	@Column(name = "author_user_id")
	private Long authorUserId;

	@Column(name = "hidden_at")
	private Instant hiddenAt;

	@Column(nullable = false)
	private Instant createdAt;

	@Column(nullable = false)
	private Instant updatedAt;

	@ManyToMany
	@JoinTable(
			name = "board_post_tags",
			joinColumns = @JoinColumn(name = "post_id"),
			inverseJoinColumns = @JoinColumn(name = "tag_id"))
	private Set<BoardTag> tags = new LinkedHashSet<>();

	@OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<BoardComment> comments = new ArrayList<>();

	protected BoardPost() {
	}

	public BoardPost(String title, String content, String category, String author, Long authorUserId, Set<BoardTag> tags) {
		this.title = title;
		this.content = content;
		this.category = category;
		this.author = author;
		this.authorUserId = authorUserId;
		replaceTags(tags);
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

	public void update(String title, String content, String category, Set<BoardTag> tags) {
		this.title = title;
		this.content = content;
		this.category = category;
		replaceTags(tags);
	}

	public void hide() {
		this.hiddenAt = Instant.now();
	}

	public BoardComment addComment(String content, String author, Long authorUserId, Long parentCommentId) {
		BoardComment comment = new BoardComment(this, content, author, authorUserId, parentCommentId);
		comments.add(comment);
		return comment;
	}

	public void removeComment(BoardComment comment) {
		comments.remove(comment);
	}

	public void replaceTags(Set<BoardTag> tags) {
		this.tags.clear();
		this.tags.addAll(tags);
	}

	public Long getId() {
		return id;
	}

	public String getTitle() {
		return title;
	}

	public String getContent() {
		return content;
	}

	public String getCategory() {
		return category;
	}

	public String getAuthor() {
		return author;
	}

	public Long getAuthorUserId() {
		return authorUserId;
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

	public Set<BoardTag> getTags() {
		return tags;
	}

	public List<BoardComment> getComments() {
		return comments;
	}
}
