package com.memento.feature.tag;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class TagQueryServiceTest {

    private static final UUID USER_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID TAG_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Test
    void listReturnsCurrentUserTagsWithPageMetadata() {
        CapturingTagRepository repository = new CapturingTagRepository();
        repository.records = List.of(new TagRecord(TAG_ID, "retrospective", 2));
        repository.totalCount = 1;
        TagQueryService service = new TagQueryService(repository);

        TagListResponse response = service.list(USER_ID, 1, 20);

        assertThat(repository.capturedOwnerId).isEqualTo(USER_ID);
        assertThat(repository.capturedLimit).isEqualTo(20);
        assertThat(repository.capturedOffset).isEqualTo(20);
        assertThat(response.items()).containsExactly(new TagResponse(TAG_ID, "retrospective", 2));
        assertThat(response.page()).isEqualTo(new TagPageResponse(1, 20, 1, 1));
    }

    @Test
    void listRejectsInvalidPageValues() {
        TagQueryService service = new TagQueryService(new CapturingTagRepository());

        assertThatThrownBy(() -> service.list(USER_ID, -1, 50))
                .isInstanceOf(TagInvalidQueryException.class);
        assertThatThrownBy(() -> service.list(USER_ID, 0, 0))
                .isInstanceOf(TagInvalidQueryException.class);
        assertThatThrownBy(() -> service.list(USER_ID, 0, 101))
                .isInstanceOf(TagInvalidQueryException.class);
        assertThatThrownBy(() -> service.list(USER_ID, Integer.MAX_VALUE, 100))
                .isInstanceOf(TagInvalidQueryException.class);
    }

    private static class CapturingTagRepository implements TagRepository {

        private List<TagRecord> records = List.of();
        private long totalCount;
        private UUID capturedOwnerId;
        private int capturedLimit;
        private int capturedOffset;

        @Override
        public List<TagRecord> findPageByOwner(UUID ownerId, int limit, int offset) {
            capturedOwnerId = ownerId;
            capturedLimit = limit;
            capturedOffset = offset;
            return records;
        }

        @Override
        public long countByOwner(UUID ownerId) {
            return totalCount;
        }
    }
}
