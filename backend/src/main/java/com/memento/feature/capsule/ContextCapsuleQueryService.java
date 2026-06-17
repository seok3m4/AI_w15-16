package com.memento.feature.capsule;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class ContextCapsuleQueryService {

    private static final int MAX_PAGE_SIZE = 100;

    private final ContextCapsuleRepository repository;

    ContextCapsuleQueryService(ContextCapsuleRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    ContextCapsuleListResponse list(UUID currentUserId, int page, int size) {
        validateQuery(page, size);

        int offset = offset(page, size);
        List<ContextCapsuleSummaryResponse> items = repository.findPageByOwner(currentUserId, size, offset)
                .stream()
                .map(ContextCapsuleSummaryResponse::from)
                .toList();
        long totalCount = repository.countByOwner(currentUserId);
        int totalPages = totalCount == 0 ? 0 : (int) Math.ceil((double) totalCount / size);

        return new ContextCapsuleListResponse(items, new ContextCapsulePageResponse(page, size, totalCount, totalPages));
    }

    @Transactional(readOnly = true)
    ContextCapsuleResponse get(UUID currentUserId, UUID contextCapsuleId) {
        return repository.findActiveByOwner(currentUserId, contextCapsuleId)
                .map(ContextCapsuleResponse::from)
                .orElseThrow(() -> new ContextCapsuleNotFoundException(contextCapsuleId));
    }

    private void validateQuery(int page, int size) {
        if (page < 0) {
            throw new ContextCapsuleInvalidQueryException("page must be greater than or equal to 0.");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new ContextCapsuleInvalidQueryException("size must be between 1 and 100.");
        }
    }

    private int offset(int page, int size) {
        long offset = (long) page * size;
        if (offset > Integer.MAX_VALUE) {
            throw new ContextCapsuleInvalidQueryException("page is too large.");
        }
        return (int) offset;
    }
}

