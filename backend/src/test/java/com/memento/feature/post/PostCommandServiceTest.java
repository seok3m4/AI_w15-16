package com.memento.feature.post;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

class PostCommandServiceTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID POST_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final Instant CREATED_AT = Instant.parse("2026-06-15T03:10:00Z");
    private static final Instant NOW = Instant.parse("2026-06-16T09:30:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    @Test
    void updateTrimsContentDeduplicatesTagsAndReturnsUpdatedPost() {
        CapturingPostRepository repository = new CapturingPostRepository();
        PostCommandService service = new PostCommandService(repository, CLOCK);

        PostResponse response = service.update(
                USER_ID,
                POST_ID,
                new CreatePostRequest(
                        " Updated title ",
                        " Updated content ",
                        List.of(" Journal ", "journal", " Project ")));

        assertThat(repository.updatedPostId).isEqualTo(POST_ID);
        assertThat(repository.updatedAuthorId).isEqualTo(USER_ID);
        assertThat(repository.updatedTitle).isEqualTo("Updated title");
        assertThat(repository.updatedContent).isEqualTo("Updated content");
        assertThat(repository.updatedTagNames).containsExactly("Journal", "Project");
        assertThat(repository.updatedAt).isEqualTo(NOW);
        assertThat(response.title()).isEqualTo("Updated title");
        assertThat(response.content()).isEqualTo("Updated content");
        assertThat(response.tags()).containsExactly("Journal", "Project");
        assertThat(response.memoryStatus()).isEqualTo("pending");
    }

    @Test
    void updatePublishesPostUpdatedEventForMemoryRefresh() {
        CapturingPostRepository repository = new CapturingPostRepository();
        CapturingEventPublisher eventPublisher = new CapturingEventPublisher();
        PostCommandService service = new PostCommandService(repository, eventPublisher, CLOCK);

        service.update(
                USER_ID,
                POST_ID,
                new CreatePostRequest("Updated title", "Updated content", List.of("project")));

        assertThat(eventPublisher.events)
                .containsExactly(new PostUpdatedEvent(POST_ID, USER_ID));
    }

    @Test
    void updateHidesPostsOutsideCurrentUserScope() {
        CapturingPostRepository repository = new CapturingPostRepository();
        repository.updateResult = Optional.empty();
        PostCommandService service = new PostCommandService(repository, CLOCK);

        assertThatThrownBy(() -> service.update(
                        USER_ID,
                        POST_ID,
                        new CreatePostRequest("Updated title", "Updated content", List.of())))
                .isInstanceOf(PostNotFoundException.class);
    }

    @Test
    void updateDoesNotPublishMemoryRefreshEventWhenPostIsHidden() {
        CapturingPostRepository repository = new CapturingPostRepository();
        repository.updateResult = Optional.empty();
        CapturingEventPublisher eventPublisher = new CapturingEventPublisher();
        PostCommandService service = new PostCommandService(repository, eventPublisher, CLOCK);

        assertThatThrownBy(() -> service.update(
                        USER_ID,
                        POST_ID,
                        new CreatePostRequest("Updated title", "Updated content", List.of())))
                .isInstanceOf(PostNotFoundException.class);

        assertThat(eventPublisher.events).isEmpty();
    }

    @Test
    void deleteSoftDeletesCurrentUsersPost() {
        CapturingPostRepository repository = new CapturingPostRepository();
        PostCommandService service = new PostCommandService(repository, CLOCK);

        service.delete(USER_ID, POST_ID);

        assertThat(repository.deletedPostId).isEqualTo(POST_ID);
        assertThat(repository.deletedAuthorId).isEqualTo(USER_ID);
        assertThat(repository.deletedAt).isEqualTo(NOW);
    }

    @Test
    void deletePublishesPostDeletedEventForMemoryExclusion() {
        CapturingPostRepository repository = new CapturingPostRepository();
        CapturingEventPublisher eventPublisher = new CapturingEventPublisher();
        PostCommandService service = new PostCommandService(repository, eventPublisher, CLOCK);

        service.delete(USER_ID, POST_ID);

        assertThat(eventPublisher.events)
                .containsExactly(new PostDeletedEvent(POST_ID, USER_ID));
    }

    @Test
    void deleteHidesPostsOutsideCurrentUserScope() {
        CapturingPostRepository repository = new CapturingPostRepository();
        repository.deleteResult = false;
        PostCommandService service = new PostCommandService(repository, CLOCK);

        assertThatThrownBy(() -> service.delete(USER_ID, POST_ID))
                .isInstanceOf(PostNotFoundException.class);
    }

    @Test
    void deleteDoesNotPublishMemoryDeleteEventWhenPostIsHidden() {
        CapturingPostRepository repository = new CapturingPostRepository();
        repository.deleteResult = false;
        CapturingEventPublisher eventPublisher = new CapturingEventPublisher();
        PostCommandService service = new PostCommandService(repository, eventPublisher, CLOCK);

        assertThatThrownBy(() -> service.delete(USER_ID, POST_ID))
                .isInstanceOf(PostNotFoundException.class);

        assertThat(eventPublisher.events).isEmpty();
    }

    private static class CapturingPostRepository implements PostRepository {

        private Optional<PostRecord> updateResult = Optional.of(postRecord(
                "Updated title",
                "Updated content",
                List.of("Journal", "Project"),
                NOW));
        private boolean deleteResult = true;
        private UUID updatedPostId;
        private UUID updatedAuthorId;
        private String updatedTitle;
        private String updatedContent;
        private List<String> updatedTagNames;
        private Instant updatedAt;
        private UUID deletedPostId;
        private UUID deletedAuthorId;
        private Instant deletedAt;

        @Override
        public PostRecord save(NewPost post, List<String> tagNames) {
            throw new UnsupportedOperationException();
        }

        @Override
        public List<PostRecord> findPageByAuthor(
                UUID authorId,
                String keyword,
                String normalizedTag,
                int limit,
                int offset) {
            return List.of();
        }

        @Override
        public long countByAuthor(UUID authorId, String keyword, String normalizedTag) {
            return 0;
        }

        @Override
        public List<PostRecord> findPageByAcceptedFriends(
                UUID accessorId,
                String keyword,
                String normalizedTag,
                int limit,
                int offset) {
            return List.of();
        }

        @Override
        public long countByAcceptedFriends(UUID accessorId, String keyword, String normalizedTag) {
            return 0;
        }

        @Override
        public List<PostRecord> findPageByAccessible(
                UUID accessorId,
                String keyword,
                String normalizedTag,
                int limit,
                int offset) {
            return List.of();
        }

        @Override
        public long countByAccessible(UUID accessorId, String keyword, String normalizedTag) {
            return 0;
        }

        @Override
        public Optional<PostRecord> findByIdAndAuthor(UUID postId, UUID authorId) {
            return Optional.empty();
        }

        @Override
        public Optional<PostRecord> findByIdAccessibleTo(UUID postId, UUID accessorId) {
            return Optional.empty();
        }

        @Override
        public Optional<PostRecord> updateByAuthor(
                UUID postId,
                UUID authorId,
                String title,
                String content,
                List<String> tagNames,
                Instant updatedAt) {
            this.updatedPostId = postId;
            this.updatedAuthorId = authorId;
            this.updatedTitle = title;
            this.updatedContent = content;
            this.updatedTagNames = List.copyOf(tagNames);
            this.updatedAt = updatedAt;
            return updateResult;
        }

        @Override
        public boolean softDeleteByAuthor(UUID postId, UUID authorId, Instant deletedAt) {
            this.deletedPostId = postId;
            this.deletedAuthorId = authorId;
            this.deletedAt = deletedAt;
            return deleteResult;
        }
    }

    private static PostRecord postRecord(String title, String content, List<String> tags, Instant updatedAt) {
        return new PostRecord(
                POST_ID,
                USER_ID,
                "cutan",
                title,
                content,
                tags,
                0,
                0,
                false,
                "me",
                "pending",
                CREATED_AT,
                updatedAt);
    }

    private static class CapturingEventPublisher implements ApplicationEventPublisher {

        private final List<Object> events = new java.util.ArrayList<>();

        @Override
        public void publishEvent(Object event) {
            events.add(event);
        }
    }
}
