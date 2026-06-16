package com.memento.feature.post;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class PostQueryServiceTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID POST_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final Instant NOW = Instant.parse("2026-06-15T03:10:00Z");

    @Test
    void listReturnsOnlyCurrentUserPostsWithPageMetadata() {
        CapturingPostRepository repository = new CapturingPostRepository();
        repository.pageRecords = List.of(postRecord("오늘의 회고", "첫 번째 줄\n두 번째 줄"));
        repository.totalCount = 1;
        PostQueryService service = new PostQueryService(repository);

        PostListResponse response = service.list(USER_ID, "me", null, null, 0, 20, "createdAt,desc");

        assertThat(repository.capturedAuthorId).isEqualTo(USER_ID);
        assertThat(repository.capturedLimit).isEqualTo(20);
        assertThat(repository.capturedOffset).isZero();
        assertThat(response.items()).hasSize(1);
        assertThat(response.items().getFirst().contentPreview()).isEqualTo("첫 번째 줄 두 번째 줄");
        assertThat(response.page()).isEqualTo(new PageResponse(0, 20, 1, 1));
    }

    @Test
    void getDetailHidesPostsOutsideCurrentUserScope() {
        CapturingPostRepository repository = new CapturingPostRepository();
        PostQueryService service = new PostQueryService(repository);

        assertThatThrownBy(() -> service.getDetail(USER_ID, POST_ID))
                .isInstanceOf(PostNotFoundException.class);

        assertThat(repository.capturedDetailAuthorId).isEqualTo(USER_ID);
        assertThat(repository.capturedDetailPostId).isEqualTo(POST_ID);
    }

    @Test
    void listRoundsUpTotalPagesAndKeepsRequestedOutOfRangePage() {
        CapturingPostRepository repository = new CapturingPostRepository();
        repository.totalCount = 5;
        PostQueryService service = new PostQueryService(repository);

        PostListResponse response = service.list(USER_ID, "me", null, null, 3, 2, "createdAt,desc");

        assertThat(repository.capturedLimit).isEqualTo(2);
        assertThat(repository.capturedOffset).isEqualTo(6);
        assertThat(response.items()).isEmpty();
        assertThat(response.page()).isEqualTo(new PageResponse(3, 2, 5, 3));
    }

    @Test
    void listReturnsZeroTotalPagesForEmptyFeed() {
        CapturingPostRepository repository = new CapturingPostRepository();
        repository.totalCount = 0;
        PostQueryService service = new PostQueryService(repository);

        PostListResponse response = service.list(USER_ID, "me", null, null, 0, 20, "createdAt,desc");

        assertThat(response.items()).isEmpty();
        assertThat(response.page()).isEqualTo(new PageResponse(0, 20, 0, 0));
    }

    @Test
    void repositoryContractDoesNotExposeUnscopedPostLookup() {
        assertThat(Arrays.stream(PostRepository.class.getDeclaredMethods())
                        .filter(method -> method.getName().equals("findById"))
                        .toList())
                .isEmpty();
    }

    @Test
    void listRejectsUnsupportedScopeUntilFriendSearchTasksExtendIt() {
        PostQueryService service = new PostQueryService(new CapturingPostRepository());

        assertThatThrownBy(() -> service.list(USER_ID, "friends", null, null, 0, 20, "createdAt,desc"))
                .isInstanceOf(PostInvalidQueryException.class);
    }

    @Test
    void listRejectsPageValuesThatWouldOverflowOffset() {
        PostQueryService service = new PostQueryService(new CapturingPostRepository());

        assertThatThrownBy(() -> service.list(USER_ID, "me", null, null, Integer.MAX_VALUE, 100, "createdAt,desc"))
                .isInstanceOf(PostInvalidQueryException.class);
    }

    @Test
    void listPassesNormalizedSearchFiltersToRepository() {
        CapturingPostRepository repository = new CapturingPostRepository();
        PostQueryService service = new PostQueryService(repository);

        PostListResponse response = service.list(USER_ID, "me", "  Memo  ", "  Project  ", 0, 20, "createdAt,desc");

        assertThat(response.items()).isEmpty();
        assertThat(repository.capturedKeyword).isEqualTo("Memo");
        assertThat(repository.capturedNormalizedTag).isEqualTo("project");
    }

    private static PostRecord postRecord(String title, String content) {
        return new PostRecord(
                POST_ID,
                USER_ID,
                "cutan",
                title,
                content,
                List.of("회고"),
                0,
                0,
                false,
                "me",
                "pending",
                NOW,
                NOW);
    }

    private static class CapturingPostRepository implements PostRepository {

        private List<PostRecord> pageRecords = List.of();
        private long totalCount;
        private UUID capturedAuthorId;
        private String capturedKeyword;
        private String capturedNormalizedTag;
        private int capturedLimit;
        private int capturedOffset;
        private UUID capturedDetailPostId;
        private UUID capturedDetailAuthorId;

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
            capturedAuthorId = authorId;
            capturedKeyword = keyword;
            capturedNormalizedTag = normalizedTag;
            capturedLimit = limit;
            capturedOffset = offset;
            return pageRecords;
        }

        @Override
        public long countByAuthor(UUID authorId, String keyword, String normalizedTag) {
            return totalCount;
        }

        @Override
        public Optional<PostRecord> findByIdAndAuthor(UUID postId, UUID authorId) {
            capturedDetailPostId = postId;
            capturedDetailAuthorId = authorId;
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
            throw new UnsupportedOperationException();
        }

        @Override
        public boolean softDeleteByAuthor(UUID postId, UUID authorId, Instant deletedAt) {
            throw new UnsupportedOperationException();
        }
    }
}
