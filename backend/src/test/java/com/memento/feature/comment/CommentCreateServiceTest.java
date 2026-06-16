package com.memento.feature.comment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CommentCreateServiceTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID POST_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID COMMENT_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final Instant NOW = Instant.parse("2026-06-15T03:10:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    @Test
    void createTrimsContentAndReturnsCreatedComment() {
        CapturingCommentRepository repository = new CapturingCommentRepository();
        CommentCreateService service = new CommentCreateService(repository, () -> COMMENT_ID, CLOCK);

        CommentResponse response = service.create(
                USER_ID,
                POST_ID,
                new CreateCommentRequest(" 좋은 기록이네요. "));

        assertThat(repository.savedComment).isEqualTo(new NewComment(
                COMMENT_ID,
                POST_ID,
                USER_ID,
                "좋은 기록이네요.",
                NOW));
        assertThat(response).isEqualTo(new CommentResponse(
                COMMENT_ID,
                POST_ID,
                new CommentAuthorResponse(USER_ID, "cutan"),
                "좋은 기록이네요.",
                NOW,
                NOW));
    }

    @Test
    void createThrowsWhenPostIsMissingOrNotOwnedByCurrentUser() {
        CommentCreateService service = new CommentCreateService(
                new MissingPostCommentRepository(),
                () -> COMMENT_ID,
                CLOCK);

        assertThatThrownBy(() -> service.create(
                USER_ID,
                POST_ID,
                new CreateCommentRequest("좋은 기록이네요.")))
                .isInstanceOf(CommentPostNotFoundException.class);
    }

    private static class CapturingCommentRepository implements CommentRepository {

        private NewComment savedComment;

        @Override
        public Optional<CommentRecord> saveOnOwnedPost(NewComment comment) {
            savedComment = comment;
            return Optional.of(new CommentRecord(
                    comment.id(),
                    comment.postId(),
                    comment.authorId(),
                    "cutan",
                    comment.content(),
                    comment.createdAt(),
                    comment.createdAt()));
        }

        @Override
        public Optional<CommentRecord> updateByAuthor(
                UUID commentId,
                UUID authorId,
                String content,
                Instant updatedAt) {
            throw new UnsupportedOperationException();
        }

        @Override
        public boolean softDeleteByAuthor(UUID commentId, UUID authorId, Instant deletedAt) {
            throw new UnsupportedOperationException();
        }
    }

    private static class MissingPostCommentRepository implements CommentRepository {

        @Override
        public Optional<CommentRecord> saveOnOwnedPost(NewComment comment) {
            return Optional.empty();
        }

        @Override
        public Optional<CommentRecord> updateByAuthor(
                UUID commentId,
                UUID authorId,
                String content,
                Instant updatedAt) {
            throw new UnsupportedOperationException();
        }

        @Override
        public boolean softDeleteByAuthor(UUID commentId, UUID authorId, Instant deletedAt) {
            throw new UnsupportedOperationException();
        }
    }
}
