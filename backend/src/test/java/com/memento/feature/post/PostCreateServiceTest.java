package com.memento.feature.post;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

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
        assertThat(response.tags()).isEmpty();
        assertThat(response.commentCount()).isZero();
        assertThat(response.likeCount()).isZero();
        assertThat(response.likedByMe()).isFalse();
        assertThat(response.accessScope()).isEqualTo("me");
        assertThat(response.memoryStatus()).isEqualTo("pending");
        assertThat(response.createdAt()).isEqualTo(NOW);
        assertThat(response.updatedAt()).isEqualTo(NOW);
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
                    List.of(),
                    0,
                    0,
                    false,
                    "me",
                    post.memoryStatus(),
                    post.createdAt(),
                    post.createdAt());
        }

        @Override
        public Optional<PostRecord> findById(UUID postId) {
            return Optional.empty();
        }
    }
}
