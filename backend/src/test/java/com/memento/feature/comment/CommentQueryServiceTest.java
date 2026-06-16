package com.memento.feature.comment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CommentQueryServiceTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID POST_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID COMMENT_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final Instant NOW = Instant.parse("2026-06-15T03:10:00Z");

    @Test
    void listReturnsAccessiblePostCommentsWithPageMetadata() {
        CapturingCommentRepository repository = new CapturingCommentRepository();
        repository.postExists = true;
        repository.records = List.of(commentRecord("첫 댓글"));
        repository.totalCount = 1;
        CommentQueryService service = new CommentQueryService(repository);

        CommentListResponse response = service.list(USER_ID, POST_ID, 1, 20, "createdAt,asc");

        assertThat(repository.capturedAccessorId).isEqualTo(USER_ID);
        assertThat(repository.capturedPostId).isEqualTo(POST_ID);
        assertThat(repository.capturedLimit).isEqualTo(20);
        assertThat(repository.capturedOffset).isEqualTo(20);
        assertThat(response.items()).containsExactly(CommentResponse.from(commentRecord("첫 댓글")));
        assertThat(response.page()).isEqualTo(new CommentPageResponse(1, 20, 1, 1));
    }

    @Test
    void listReturnsEmptyPageForAccessiblePostWithoutComments() {
        CapturingCommentRepository repository = new CapturingCommentRepository();
        repository.postExists = true;
        CommentQueryService service = new CommentQueryService(repository);

        CommentListResponse response = service.list(USER_ID, POST_ID, 0, 20, "createdAt,asc");

        assertThat(response.items()).isEmpty();
        assertThat(response.page()).isEqualTo(new CommentPageResponse(0, 20, 0, 0));
    }

    @Test
    void listHidesPostsOutsideCurrentUserScope() {
        CapturingCommentRepository repository = new CapturingCommentRepository();
        CommentQueryService service = new CommentQueryService(repository);

        assertThatThrownBy(() -> service.list(USER_ID, POST_ID, 0, 20, "createdAt,asc"))
                .isInstanceOf(CommentPostNotFoundException.class);
    }

    @Test
    void listRejectsInvalidQueryValues() {
        CapturingCommentRepository repository = new CapturingCommentRepository();
        repository.postExists = true;
        CommentQueryService service = new CommentQueryService(repository);

        assertThatThrownBy(() -> service.list(USER_ID, POST_ID, -1, 20, "createdAt,asc"))
                .isInstanceOf(CommentInvalidQueryException.class);
        assertThatThrownBy(() -> service.list(USER_ID, POST_ID, 0, 0, "createdAt,asc"))
                .isInstanceOf(CommentInvalidQueryException.class);
        assertThatThrownBy(() -> service.list(USER_ID, POST_ID, 0, 101, "createdAt,asc"))
                .isInstanceOf(CommentInvalidQueryException.class);
        assertThatThrownBy(() -> service.list(USER_ID, POST_ID, 0, 20, "createdAt,desc"))
                .isInstanceOf(CommentInvalidQueryException.class);
    }

    private static class CapturingCommentRepository implements CommentRepository {

        private boolean postExists;
        private List<CommentRecord> records = List.of();
        private long totalCount;
        private UUID capturedAccessorId;
        private UUID capturedPostId;
        private int capturedLimit;
        private int capturedOffset;

        @Override
        public Optional<CommentRecord> saveOnAccessiblePost(NewComment comment) {
            throw new UnsupportedOperationException();
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

        @Override
        public boolean existsActivePostAccessibleTo(UUID postId, UUID accessorId) {
            capturedAccessorId = accessorId;
            capturedPostId = postId;
            return postExists;
        }

        @Override
        public List<CommentRecord> findPageByAccessiblePost(
                UUID postId,
                UUID accessorId,
                int limit,
                int offset) {
            capturedPostId = postId;
            capturedAccessorId = accessorId;
            capturedLimit = limit;
            capturedOffset = offset;
            return records;
        }

        @Override
        public long countByAccessiblePost(UUID postId, UUID accessorId) {
            capturedPostId = postId;
            capturedAccessorId = accessorId;
            return totalCount;
        }
    }

    private static CommentRecord commentRecord(String content) {
        return new CommentRecord(
                COMMENT_ID,
                POST_ID,
                USER_ID,
                "cutan",
                content,
                NOW,
                NOW);
    }
}
