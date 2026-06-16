package com.memento.feature.like;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class PostLikeCommandServiceTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID POST_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final Instant NOW = Instant.parse("2026-06-15T03:10:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    @Test
    void likeReturnsCurrentLikeStateForAccessiblePost() {
        CapturingPostLikeRepository repository = new CapturingPostLikeRepository();
        repository.likeResult = Optional.of(new PostLikeState(POST_ID, true, 5));
        PostLikeCommandService service = new PostLikeCommandService(repository, CLOCK);

        PostLikeResponse response = service.like(USER_ID, POST_ID);

        assertThat(repository.likedPostId).isEqualTo(POST_ID);
        assertThat(repository.likingUserId).isEqualTo(USER_ID);
        assertThat(repository.likedAt).isEqualTo(NOW);
        assertThat(response).isEqualTo(new PostLikeResponse(POST_ID, true, 5));
    }

    @Test
    void likeHidesMissingOrInaccessiblePost() {
        PostLikeCommandService service = new PostLikeCommandService(new CapturingPostLikeRepository(), CLOCK);

        assertThatThrownBy(() -> service.like(USER_ID, POST_ID))
                .isInstanceOf(PostLikePostNotFoundException.class);
    }

    @Test
    void unlikeReturnsCurrentLikeStateForAccessiblePost() {
        CapturingPostLikeRepository repository = new CapturingPostLikeRepository();
        repository.unlikeResult = Optional.of(new PostLikeState(POST_ID, false, 4));
        PostLikeCommandService service = new PostLikeCommandService(repository, CLOCK);

        PostLikeResponse response = service.unlike(USER_ID, POST_ID);

        assertThat(repository.unlikedPostId).isEqualTo(POST_ID);
        assertThat(repository.unlikingUserId).isEqualTo(USER_ID);
        assertThat(response).isEqualTo(new PostLikeResponse(POST_ID, false, 4));
    }

    @Test
    void unlikeHidesMissingOrInaccessiblePost() {
        PostLikeCommandService service = new PostLikeCommandService(new CapturingPostLikeRepository(), CLOCK);

        assertThatThrownBy(() -> service.unlike(USER_ID, POST_ID))
                .isInstanceOf(PostLikePostNotFoundException.class);
    }

    private static class CapturingPostLikeRepository implements PostLikeRepository {

        private Optional<PostLikeState> likeResult = Optional.empty();
        private Optional<PostLikeState> unlikeResult = Optional.empty();
        private UUID likedPostId;
        private UUID likingUserId;
        private Instant likedAt;
        private UUID unlikedPostId;
        private UUID unlikingUserId;

        @Override
        public Optional<PostLikeState> likeAccessiblePost(UUID postId, UUID userId, Instant likedAt) {
            this.likedPostId = postId;
            this.likingUserId = userId;
            this.likedAt = likedAt;
            return likeResult;
        }

        @Override
        public Optional<PostLikeState> unlikeAccessiblePost(UUID postId, UUID userId) {
            this.unlikedPostId = postId;
            this.unlikingUserId = userId;
            return unlikeResult;
        }
    }
}
