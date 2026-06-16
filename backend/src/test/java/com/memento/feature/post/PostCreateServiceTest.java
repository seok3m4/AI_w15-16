package com.memento.feature.post;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

class PostCreateServiceTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID POST_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final Instant NOW = Instant.parse("2026-06-15T03:10:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    @Test
    void createStoresTextPostWithPendingMemoryStatus() {
        CapturingPostRepository repository = new CapturingPostRepository();
        PostCreateService service = new PostCreateService(
                repository,
                () -> POST_ID,
                CLOCK);

        PostResponse response = service.create(
                USER_ID,
                new CreatePostRequest(
                        " 오늘의 회고 ",
                        " 오늘 프로젝트에서 배운 점... ",
                        List.of("회고", "회고", " 프로젝트 ")));

        assertThat(repository.savedPost).isEqualTo(new NewPost(
                POST_ID,
                USER_ID,
                "오늘의 회고",
                "오늘 프로젝트에서 배운 점...",
                "pending",
                NOW));
        assertThat(repository.capturedTagNames).containsExactly("회고", "프로젝트");
        assertThat(response.id()).isEqualTo(POST_ID);
        assertThat(response.author().id()).isEqualTo(USER_ID);
        assertThat(response.author().nickname()).isEqualTo("cutan");
        assertThat(response.title()).isEqualTo("오늘의 회고");
        assertThat(response.content()).isEqualTo("오늘 프로젝트에서 배운 점...");
        assertThat(response.tags()).containsExactly("회고", "프로젝트");
        assertThat(response.commentCount()).isZero();
        assertThat(response.likeCount()).isZero();
        assertThat(response.likedByMe()).isFalse();
        assertThat(response.accessScope()).isEqualTo("me");
        assertThat(response.memoryStatus()).isEqualTo("pending");
        assertThat(response.createdAt()).isEqualTo(NOW);
        assertThat(response.updatedAt()).isEqualTo(NOW);
    }

    @Test
    void createDeduplicatesTagNamesByLowercaseButPreservesFirstDisplayName() {
        CapturingPostRepository repository = new CapturingPostRepository();
        PostCreateService service = new PostCreateService(
                repository,
                () -> POST_ID,
                CLOCK);

        service.create(
                USER_ID,
                new CreatePostRequest(
                        "오늘의 회고",
                        "태그 표시명을 확인한다.",
                        List.of(" Java ", "java", " Spring ")));

        assertThat(repository.capturedTagNames).containsExactly("Java", "Spring");
    }

    @Test
    void createPublishesPostCreatedEventForMemoryChunkPipeline() {
        CapturingPostRepository repository = new CapturingPostRepository();
        CapturingEventPublisher eventPublisher = new CapturingEventPublisher();
        PostCreateService service = new PostCreateService(
                repository,
                eventPublisher,
                () -> POST_ID,
                CLOCK);

        service.create(
                USER_ID,
                new CreatePostRequest(
                        "Memory source",
                        "The post should feed chunk creation.",
                        List.of("project")));

        assertThat(eventPublisher.events)
                .containsExactly(new PostCreatedEvent(POST_ID, USER_ID));
    }

    private static class CapturingPostRepository implements PostRepository {

        private NewPost savedPost;
        private List<String> capturedTagNames;

        @Override
        public PostRecord save(NewPost post, List<String> tagNames) {
            savedPost = post;
            capturedTagNames = List.copyOf(tagNames);
            return new PostRecord(
                    post.id(),
                    post.authorId(),
                    "cutan",
                    post.title(),
                    post.content(),
                    tagNames,
                    0,
                    0,
                    false,
                    "me",
                    post.memoryStatus(),
                    post.createdAt(),
                    post.createdAt());
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
        public List<PostRecord> findPageByAcceptedFriends(UUID accessorId, int limit, int offset) {
            return List.of();
        }

        @Override
        public long countByAcceptedFriends(UUID accessorId) {
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
            return Optional.empty();
        }

        @Override
        public boolean softDeleteByAuthor(UUID postId, UUID authorId, Instant deletedAt) {
            return false;
        }
    }

    private static class CapturingEventPublisher implements ApplicationEventPublisher {

        private final List<Object> events = new java.util.ArrayList<>();

        @Override
        public void publishEvent(Object event) {
            events.add(event);
        }
    }
}
