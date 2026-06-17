package com.memento.feature.mcp;

import com.memento.feature.auth.AuthenticatedUserPrincipal;
import com.memento.feature.auth.CurrentUser;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/mcp")
class McpManagementController {

    private final McpManagementService service;

    McpManagementController(McpManagementService service) {
        this.service = service;
    }

    @GetMapping("/tools")
    McpToolCatalogResponse listTools(@CurrentUser AuthenticatedUserPrincipal currentUser) {
        return service.listTools();
    }

    @GetMapping("/connections")
    McpConnectionListResponse listConnections(@CurrentUser AuthenticatedUserPrincipal currentUser) {
        return service.listConnections(currentUser.userId());
    }

    @GetMapping("/call-logs")
    McpCallLogListResponse listCallLogs(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.listCallLogs(currentUser.userId(), page, size);
    }

    @PostMapping("/server-credentials")
    @ResponseStatus(HttpStatus.CREATED)
    McpCredentialCreateResponse createServerCredential(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @Valid @RequestBody McpCredentialCreateRequest request) {
        return service.createServerCredential(currentUser.userId(), request);
    }

    @DeleteMapping("/connections/{connectionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void revokeConnection(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @PathVariable UUID connectionId) {
        service.revokeConnection(currentUser.userId(), connectionId);
    }
}
