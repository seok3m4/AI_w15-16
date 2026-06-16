package com.memento.feature.post;

import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class PostQueryService {

    private static final String SUPPORTED_SCOPE = "me";
    private static final String SUPPORTED_SORT = "createdAt,desc";
    private static final int MAX_PAGE_SIZE = 100;
    private static final int PREVIEW_CODE_POINTS = 120;

    private final PostRepository postRepository;

    PostQueryService(PostRepository postRepository) {
        this.postRepository = postRepository;
    }

    @Transactional(readOnly = true)
    PostListResponse list(UUID currentUserId, String scope, String q, String tag, int page, int size, String sort) {
        validateListQuery(scope, q, tag, page, size, sort);

        String keyword = normalizeKeyword(q);
        String normalizedTag = normalizeTag(tag);
        int offset = offset(page, size);
        List<PostSummaryResponse> items = postRepository.findPageByAuthor(
                        currentUserId,
                        keyword,
                        normalizedTag,
                        size,
                        offset)
                .stream()
                .map(record -> PostSummaryResponse.from(record, preview(record.content())))
                .toList();
        long totalCount = postRepository.countByAuthor(currentUserId, keyword, normalizedTag);
        int totalPages = totalCount == 0 ? 0 : (int) Math.ceil((double) totalCount / size);

        return new PostListResponse(items, new PageResponse(page, size, totalCount, totalPages));
    }

    @Transactional(readOnly = true)
    PostDetailResponse getDetail(UUID currentUserId, UUID postId) {
        return postRepository.findByIdAndAuthor(postId, currentUserId)
                .map(PostDetailResponse::from)
                .orElseThrow(() -> new PostNotFoundException(postId));
    }

    private void validateListQuery(String scope, String q, String tag, int page, int size, String sort) {
        if (!SUPPORTED_SCOPE.equals(scope)) {
            throw new PostInvalidQueryException("Only scope=me is supported in P0-BE-12.");
        }
        if (page < 0) {
            throw new PostInvalidQueryException("page must be greater than or equal to 0.");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new PostInvalidQueryException("size must be between 1 and 100.");
        }
        if (!SUPPORTED_SORT.equals(sort)) {
            throw new PostInvalidQueryException("Only sort=createdAt,desc is supported in P0-BE-12.");
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private String normalizeKeyword(String value) {
        return hasText(value) ? value.trim() : null;
    }

    private String normalizeTag(String value) {
        return hasText(value) ? value.trim().toLowerCase(Locale.ROOT) : null;
    }

    private int offset(int page, int size) {
        long offset = (long) page * size;
        if (offset > Integer.MAX_VALUE) {
            throw new PostInvalidQueryException("page is too large.");
        }
        return (int) offset;
    }

    private String preview(String content) {
        String normalized = content.replaceAll("\\s+", " ").trim();
        if (normalized.codePointCount(0, normalized.length()) <= PREVIEW_CODE_POINTS) {
            return normalized;
        }
        int endIndex = normalized.offsetByCodePoints(0, PREVIEW_CODE_POINTS);
        return normalized.substring(0, endIndex) + "...";
    }
}
