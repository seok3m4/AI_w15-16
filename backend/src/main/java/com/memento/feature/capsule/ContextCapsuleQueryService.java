package com.memento.feature.capsule;

import com.memento.feature.friend.FriendshipAccessService;
import com.memento.feature.privacy.AiSharingConsentReader;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class ContextCapsuleQueryService {

    private static final int MAX_PAGE_SIZE = 100;

    private final ContextCapsuleRepository repository;
    private final FriendshipAccessService friendshipAccessService;
    private final AiSharingConsentReader aiSharingConsentReader;

    ContextCapsuleQueryService(
            ContextCapsuleRepository repository,
            FriendshipAccessService friendshipAccessService,
            AiSharingConsentReader aiSharingConsentReader) {
        this.repository = repository;
        this.friendshipAccessService = friendshipAccessService;
        this.aiSharingConsentReader = aiSharingConsentReader;
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
                .map(record -> ContextCapsuleResponse.from(filterInaccessibleFriendSources(currentUserId, record)))
                .orElseThrow(() -> new ContextCapsuleNotFoundException(contextCapsuleId));
    }

    @Transactional(readOnly = true)
    ContextCapsuleCompactContextResponse compactContext(UUID currentUserId, UUID contextCapsuleId) {
        return repository.findActiveByOwner(currentUserId, contextCapsuleId)
                .map(record -> {
                    if (hasInaccessibleFriendSource(currentUserId, record)) {
                        throw new ContextCapsuleFriendContextStaleException();
                    }
                    return ContextCapsuleCompactContextResponse.from(record);
                })
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

    private ContextCapsuleRecord filterInaccessibleFriendSources(UUID currentUserId, ContextCapsuleRecord record) {
        if (!record.containsFriendContext()) {
            return record;
        }
        List<ContextCapsuleSourceRecord> visibleSources = record.sources().stream()
                .filter(source -> isOwnSource(currentUserId, source) || isFriendContextAllowed(currentUserId, source.ownerUserId()))
                .toList();
        return new ContextCapsuleRecord(
                record.id(),
                record.ownerId(),
                record.title(),
                record.purpose(),
                record.query(),
                record.summary(),
                record.keyFacts(),
                record.tags(),
                record.containsFriendContext(),
                visibleSources,
                record.createdAt(),
                record.updatedAt());
    }

    private boolean hasInaccessibleFriendSource(UUID currentUserId, ContextCapsuleRecord record) {
        if (!record.containsFriendContext()) {
            return false;
        }
        Set<UUID> friendSourceOwnerIds = record.sources().stream()
                .map(ContextCapsuleSourceRecord::ownerUserId)
                .filter(ownerUserId -> !currentUserId.equals(ownerUserId))
                .collect(Collectors.toSet());
        return friendSourceOwnerIds.stream()
                .anyMatch(friendId -> !isFriendContextAllowed(currentUserId, friendId));
    }

    private boolean isOwnSource(UUID currentUserId, ContextCapsuleSourceRecord source) {
        return currentUserId.equals(source.ownerUserId());
    }

    private boolean isFriendContextAllowed(UUID currentUserId, UUID friendId) {
        return friendshipAccessService.hasAcceptedFriendship(currentUserId, friendId)
                && aiSharingConsentReader.isFriendAiSharingEnabled(friendId);
    }
}
