package com.memento.feature.capsule;

import com.memento.feature.friend.FriendshipAccessService;
import com.memento.feature.privacy.AiSharingConsentReader;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class ContextCapsuleCreateService {

    private static final String SCOPE_ME = "me";
    private static final String SCOPE_FRIEND = "friend";
    private static final int DEFAULT_QUERY_SOURCE_LIMIT = 5;
    private static final int MAX_EXPLICIT_SOURCES = 20;

    private final ContextCapsuleSourceReader sourceReader;
    private final FastApiContextCapsuleClient aiClient;
    private final ContextCapsuleRepository repository;
    private final FriendshipAccessService friendshipAccessService;
    private final AiSharingConsentReader aiSharingConsentReader;

    ContextCapsuleCreateService(
            ContextCapsuleSourceReader sourceReader,
            FastApiContextCapsuleClient aiClient,
            ContextCapsuleRepository repository,
            FriendshipAccessService friendshipAccessService,
            AiSharingConsentReader aiSharingConsentReader) {
        this.sourceReader = sourceReader;
        this.aiClient = aiClient;
        this.repository = repository;
        this.friendshipAccessService = friendshipAccessService;
        this.aiSharingConsentReader = aiSharingConsentReader;
    }

    @Transactional
    ContextCapsuleResponse create(UUID ownerId, CreateContextCapsuleRequest request) {
        String title = normalizeRequired(request.title(), "title");
        String purpose = normalizeRequired(request.purpose(), "purpose");
        String query = normalizeOptional(request.query());
        String scope = normalizeScope(request.scope());
        UUID friendId = normalizeFriendId(scope, request.friendId());

        List<UUID> sourcePostIds = normalizeSourcePostIds(request.sourcePostIds());
        List<ContextCapsuleSourceCandidate> sources;
        if (!sourcePostIds.isEmpty()) {
            sources = findExplicitSources(ownerId, friendId, scope, sourcePostIds);
            if (sources.size() != sourcePostIds.size()) {
                throw new ContextCapsuleSourceNotFoundException();
            }
        } else {
            if (query == null) {
                throw new ContextCapsuleInvalidRequestException("sourcePostIds or query must be provided.");
            }
            sources = searchSources(ownerId, friendId, scope, query);
            if (sources.isEmpty()) {
                throw new ContextCapsuleInvalidRequestException("No memory sources found for query.");
            }
        }

        UUID capsuleId = UUID.randomUUID();
        ContextCapsuleDraftResponse draft = aiClient.createDraft(new ContextCapsuleDraftRequest(
                UUID.randomUUID().toString(),
                null,
                "context-capsule:" + capsuleId,
                purpose,
                query,
                scope,
                Math.min(sources.size(), MAX_EXPLICIT_SOURCES),
                sources.stream().map(ContextCapsuleDraftSource::from).toList()));

        NewContextCapsule newCapsule = new NewContextCapsule(
                capsuleId,
                ownerId,
                title,
                purpose,
                query,
                draft.summary(),
                safeList(draft.keyFacts()),
                safeList(draft.tags()),
                SCOPE_FRIEND.equals(scope),
                sources.stream().map(ContextCapsuleSourceRecord::from).toList());
        return ContextCapsuleResponse.from(repository.save(newCapsule));
    }

    private String normalizeRequired(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new ContextCapsuleInvalidRequestException(fieldName + " must not be blank.");
        }
        return value.trim();
    }

    private String normalizeOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String normalizeScope(String scope) {
        if (scope == null || scope.isBlank()) {
            return SCOPE_ME;
        }
        String normalized = scope.trim();
        if (!SCOPE_ME.equals(normalized) && !SCOPE_FRIEND.equals(normalized)) {
            throw new ContextCapsuleInvalidRequestException("scope must be me or friend for context capsule creation.");
        }
        return normalized;
    }

    private UUID normalizeFriendId(String scope, UUID friendId) {
        if (!SCOPE_FRIEND.equals(scope)) {
            return null;
        }
        if (friendId == null) {
            throw new ContextCapsuleInvalidRequestException("friendId is required when scope is friend.");
        }
        return friendId;
    }

    private List<ContextCapsuleSourceCandidate> findExplicitSources(
            UUID ownerId,
            UUID friendId,
            String scope,
            List<UUID> sourcePostIds) {
        if (SCOPE_FRIEND.equals(scope)) {
            ensureFriendContextAllowed(ownerId, friendId);
            return sourceReader.findSourcesForFriendPostIds(ownerId, friendId, sourcePostIds);
        }
        return sourceReader.findSourcesForOwnerPostIds(ownerId, sourcePostIds);
    }

    private List<ContextCapsuleSourceCandidate> searchSources(
            UUID ownerId,
            UUID friendId,
            String scope,
            String query) {
        if (SCOPE_FRIEND.equals(scope)) {
            ensureFriendContextAllowed(ownerId, friendId);
            return sourceReader.searchSourcesForFriend(ownerId, friendId, query, DEFAULT_QUERY_SOURCE_LIMIT);
        }
        return sourceReader.searchSourcesForOwner(ownerId, query, DEFAULT_QUERY_SOURCE_LIMIT);
    }

    private void ensureFriendContextAllowed(UUID ownerId, UUID friendId) {
        if (!friendshipAccessService.hasAcceptedFriendship(ownerId, friendId)
                || !aiSharingConsentReader.isFriendAiSharingEnabled(friendId)) {
            throw new ContextCapsuleFriendContextNotAllowedException();
        }
    }

    private List<UUID> normalizeSourcePostIds(List<UUID> sourcePostIds) {
        if (sourcePostIds == null) {
            return List.of();
        }
        List<UUID> normalized = new LinkedHashSet<>(sourcePostIds).stream().toList();
        if (normalized.size() > MAX_EXPLICIT_SOURCES) {
            throw new ContextCapsuleInvalidRequestException("sourcePostIds must contain at most 20 posts.");
        }
        return normalized;
    }

    private List<String> safeList(List<String> values) {
        return values == null ? List.of() : values;
    }
}
