package com.memento.feature.capsule;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class ContextCapsuleCreateService {

    private static final String SCOPE_ME = "me";
    private static final int DEFAULT_QUERY_SOURCE_LIMIT = 5;
    private static final int MAX_EXPLICIT_SOURCES = 20;

    private final ContextCapsuleSourceReader sourceReader;
    private final FastApiContextCapsuleClient aiClient;
    private final ContextCapsuleRepository repository;

    ContextCapsuleCreateService(
            ContextCapsuleSourceReader sourceReader,
            FastApiContextCapsuleClient aiClient,
            ContextCapsuleRepository repository) {
        this.sourceReader = sourceReader;
        this.aiClient = aiClient;
        this.repository = repository;
    }

    @Transactional
    ContextCapsuleResponse create(UUID ownerId, CreateContextCapsuleRequest request) {
        String title = normalizeRequired(request.title(), "title");
        String purpose = normalizeRequired(request.purpose(), "purpose");
        String query = normalizeOptional(request.query());
        normalizeScope(request.scope());

        List<UUID> sourcePostIds = normalizeSourcePostIds(request.sourcePostIds());
        List<ContextCapsuleSourceCandidate> sources;
        if (!sourcePostIds.isEmpty()) {
            sources = sourceReader.findSourcesForOwnerPostIds(ownerId, sourcePostIds);
            if (sources.size() != sourcePostIds.size()) {
                throw new ContextCapsuleSourceNotFoundException();
            }
        } else {
            if (query == null) {
                throw new ContextCapsuleInvalidRequestException("sourcePostIds or query must be provided.");
            }
            sources = sourceReader.searchSourcesForOwner(ownerId, query, DEFAULT_QUERY_SOURCE_LIMIT);
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
                SCOPE_ME,
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
                false,
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

    private void normalizeScope(String scope) {
        if (scope == null || scope.isBlank()) {
            return;
        }
        if (!SCOPE_ME.equals(scope.trim())) {
            throw new ContextCapsuleInvalidRequestException("scope must be me for P2 context capsule creation.");
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
