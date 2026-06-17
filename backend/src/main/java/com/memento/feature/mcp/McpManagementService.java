package com.memento.feature.mcp;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class McpManagementService {

    private final McpTokenService tokenService;
    private final McpConnectionRepository connectionRepository;

    McpManagementService(
            McpTokenService tokenService,
            McpConnectionRepository connectionRepository) {
        this.tokenService = tokenService;
        this.connectionRepository = connectionRepository;
    }

    McpCredentialCreateResponse createServerCredential(UUID ownerId, McpCredentialCreateRequest request) {
        return tokenService.createServerCredential(ownerId, request);
    }

    McpToolCatalogResponse listTools() {
        return McpToolCatalog.catalog();
    }

    @Transactional(readOnly = true)
    McpConnectionListResponse listConnections(UUID ownerId) {
        return new McpConnectionListResponse(connectionRepository.findForOwner(ownerId)
                .stream()
                .map(McpConnectionSummaryResponse::from)
                .toList());
    }

    void revokeConnection(UUID ownerId, UUID connectionId) {
        tokenService.revoke(ownerId, connectionId);
    }

    McpCallLogListResponse listCallLogs(UUID ownerId, int page, int size) {
        return new McpCallLogListResponse(connectionRepository.findCallLogsForOwner(ownerId, page, size)
                .stream()
                .map(McpCallLogSummaryResponse::from)
                .toList());
    }
}
