package com.memento.feature.comment;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class CommentQueryService {

    private static final String SUPPORTED_SORT = "createdAt,asc";
    private static final int MAX_PAGE_SIZE = 100;

    private final CommentRepository commentRepository;

    CommentQueryService(CommentRepository commentRepository) {
        this.commentRepository = commentRepository;
    }

    @Transactional(readOnly = true)
    CommentListResponse list(UUID currentUserId, UUID postId, int page, int size, String sort) {
        validateQuery(page, size, sort);

        if (!commentRepository.existsActivePostAccessibleTo(postId, currentUserId)) {
            throw new CommentPostNotFoundException(postId);
        }

        int offset = offset(page, size);
        List<CommentResponse> items = commentRepository.findPageByAccessiblePost(postId, currentUserId, size, offset)
                .stream()
                .map(CommentResponse::from)
                .toList();
        long totalCount = commentRepository.countByAccessiblePost(postId, currentUserId);
        int totalPages = totalCount == 0 ? 0 : (int) Math.ceil((double) totalCount / size);

        return new CommentListResponse(items, new CommentPageResponse(page, size, totalCount, totalPages));
    }

    private void validateQuery(int page, int size, String sort) {
        if (page < 0) {
            throw new CommentInvalidQueryException("page must be greater than or equal to 0.");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new CommentInvalidQueryException("size must be between 1 and 100.");
        }
        if (!SUPPORTED_SORT.equals(sort)) {
            throw new CommentInvalidQueryException("Only sort=createdAt,asc is supported in P0-FE-3.");
        }
    }

    private int offset(int page, int size) {
        long offset = (long) page * size;
        if (offset > Integer.MAX_VALUE) {
            throw new CommentInvalidQueryException("page is too large.");
        }
        return (int) offset;
    }
}
