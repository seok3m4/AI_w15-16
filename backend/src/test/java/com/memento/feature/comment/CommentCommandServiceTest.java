package com.memento.feature.comment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CommentCommandServiceTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID POST_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID COMMENT_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final Instant CREATED_AT = Instant.parse("2026-06-15T03:10:00Z");
    private static final Instant NOW = Instant.parse("2026-06-16T09:30:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    @Test
    void updateTrimsContentAndReturnsUpdatedComment() {
        CapturingCommentRepository repository = new CapturingCommentRepository();
        CommentCommandService service = new CommentCommandService(repository, CLOCK);

        CommentResponse response = service.update(
                USER_ID,
                COMMENT_ID,
                new CreateCommentRequest(" Updated comment "));

        assertThat(repository.updatedCommentId).isEqualTo(COMMENT_ID);
        assertThat(repository.updatedAuthorId).isEqualTo(USER_ID);
        assertThat(repository.updatedContent).isEqualTo("Updated comment");
        assertThat(repository.updatedAt).isEqualTo(NOW);
        assertThat(response).isEqualTo(new CommentResponse(
                COMMENT_ID,
                POST_ID,
                new CommentAuthorResponse(USER_ID, "cutan"),
                "Updated comment",
                CREATED_AT,
                NOW));
    }

    @Test
    void updateHidesCommentsOutsideCurrentUserScope() {
        CapturingCommentRepository repository = new CapturingCommentRepository();
        repository.updateResult = Optional.empty();
        CommentCommandService service = new CommentCommandService(repository, CLOCK);

        assertThatThrownBy(() -> service.update(
                        USER_ID,
                        COMMENT_ID,
                        new CreateCommentRequest("Updated comment")))
                .isInstanceOf(CommentNotFoundException.class);
    }

    @Test
    void deleteSoftDeletesCurrentUsersComment() {
        CapturingCommentRepository repository = new CapturingCommentRepository();
        CommentCommandService service = new CommentCommandService(repository, CLOCK);

        service.delete(USER_ID, COMMENT_ID);

        assertThat(repository.deletedCommentId).isEqualTo(COMMENT_ID);
        assertThat(repository.deletedAuthorId).isEqualTo(USER_ID);
        assertThat(repository.deletedAt).isEqualTo(NOW);
    }

    @Test
    void deleteHidesCommentsOutsideCurrentUserScope() {
        CapturingCommentRepository repository = new CapturingCommentRepository();
        repository.deleteResult = false;
        CommentCommandService service = new CommentCommandService(repository, CLOCK);

        assertThatThrownBy(() -> service.delete(USER_ID, COMMENT_ID))
                .isInstanceOf(CommentNotFoundException.class);
    }

    private static class CapturingCommentRepository implements CommentRepository {

        private Optional<CommentRecord> updateResult = Optional.of(commentRecord("Updated comment", NOW));
        private boolean deleteResult = true;
        private NewComment savedComment;
        private UUID updatedCommentId;
        private UUID updatedAuthorId;
        private String updatedContent;
        private Instant updatedAt;
        private UUID deletedCommentId;
        private UUID deletedAuthorId;
        private Instant deletedAt;

        @Override
        public Optional<CommentRecord> saveOnAccessiblePost(NewComment comment) {
            savedComment = comment;
            return Optional.of(commentRecord(comment.content(), comment.createdAt()));
        }

        @Override
        public Optional<CommentRecord> updateByAuthor(
                UUID commentId,
                UUID authorId,
                String content,
                Instant updatedAt) {
            this.updatedCommentId = commentId;
            this.updatedAuthorId = authorId;
            this.updatedContent = content;
            this.updatedAt = updatedAt;
            return updateResult;
        }

        @Override
        public boolean softDeleteByAuthor(UUID commentId, UUID authorId, Instant deletedAt) {
            this.deletedCommentId = commentId;
            this.deletedAuthorId = authorId;
            this.deletedAt = deletedAt;
            return deleteResult;
        }

        @Override
        public boolean existsActivePostAccessibleTo(UUID postId, UUID accessorId) {
            throw new UnsupportedOperationException();
        }

        @Override
        public List<CommentRecord> findPageByAccessiblePost(UUID postId, UUID accessorId, int limit, int offset) {
            throw new UnsupportedOperationException();
        }

        @Override
        public long countByAccessiblePost(UUID postId, UUID accessorId) {
            throw new UnsupportedOperationException();
        }
    }

    private static CommentRecord commentRecord(String content, Instant updatedAt) {
        return new CommentRecord(
                COMMENT_ID,
                POST_ID,
                USER_ID,
                "cutan",
                content,
                CREATED_AT,
                updatedAt);
    }
}
