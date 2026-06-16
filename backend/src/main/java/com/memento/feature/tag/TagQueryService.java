package com.memento.feature.tag;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class TagQueryService {

    private static final int MAX_PAGE_SIZE = 100;

    private final TagRepository tagRepository;

    TagQueryService(TagRepository tagRepository) {
        this.tagRepository = tagRepository;
    }

    @Transactional(readOnly = true)
    TagListResponse list(UUID currentUserId, int page, int size) {
        validateQuery(page, size);

        int offset = offset(page, size);
        List<TagResponse> items = tagRepository.findPageByOwner(currentUserId, size, offset)
                .stream()
                .map(TagResponse::from)
                .toList();
        long totalCount = tagRepository.countByOwner(currentUserId);
        int totalPages = totalCount == 0 ? 0 : (int) Math.ceil((double) totalCount / size);

        return new TagListResponse(items, new TagPageResponse(page, size, totalCount, totalPages));
    }

    private void validateQuery(int page, int size) {
        if (page < 0) {
            throw new TagInvalidQueryException("page must be greater than or equal to 0.");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new TagInvalidQueryException("size must be between 1 and 100.");
        }
    }

    private int offset(int page, int size) {
        long offset = (long) page * size;
        if (offset > Integer.MAX_VALUE) {
            throw new TagInvalidQueryException("page is too large.");
        }
        return (int) offset;
    }
}
