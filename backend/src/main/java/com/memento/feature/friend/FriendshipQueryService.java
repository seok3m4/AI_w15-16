package com.memento.feature.friend;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class FriendshipQueryService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> SUPPORTED_STATUSES = Set.of("pending", "accepted", "rejected");

    private final FriendshipRepository friendshipRepository;

    FriendshipQueryService(FriendshipRepository friendshipRepository) {
        this.friendshipRepository = friendshipRepository;
    }

    @Transactional(readOnly = true)
    FriendshipListResponse list(UUID currentUserId, String status, int page, int size) {
        validateQuery(status, page, size);

        int offset = offset(page, size);
        List<FriendshipListItemResponse> items = friendshipRepository
                .findPageByUserAndStatus(currentUserId, status, size, offset)
                .stream()
                .map(FriendshipListItemResponse::from)
                .toList();
        long totalCount = friendshipRepository.countByUserAndStatus(currentUserId, status);
        int totalPages = totalCount == 0 ? 0 : (int) Math.ceil((double) totalCount / size);

        return new FriendshipListResponse(items, new FriendshipPageResponse(page, size, totalCount, totalPages));
    }

    private void validateQuery(String status, int page, int size) {
        if (!SUPPORTED_STATUSES.contains(status)) {
            throw new FriendshipInvalidQueryException("status must be one of pending, accepted, rejected.");
        }
        if (page < 0) {
            throw new FriendshipInvalidQueryException("page must be greater than or equal to 0.");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new FriendshipInvalidQueryException("size must be between 1 and 100.");
        }
    }

    private int offset(int page, int size) {
        long offset = (long) page * size;
        if (offset > Integer.MAX_VALUE) {
            throw new FriendshipInvalidQueryException("page is too large.");
        }
        return (int) offset;
    }
}
