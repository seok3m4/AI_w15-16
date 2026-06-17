package com.memento.feature.capsule;

import com.memento.feature.auth.AuthenticatedUserPrincipal;
import com.memento.feature.auth.CurrentUser;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/context-capsules")
class ContextCapsuleController {

    private final ContextCapsuleCreateService createService;
    private final ContextCapsuleQueryService queryService;
    private final ContextCapsuleCommandService commandService;

    ContextCapsuleController(
            ContextCapsuleCreateService createService,
            ContextCapsuleQueryService queryService,
            ContextCapsuleCommandService commandService) {
        this.createService = createService;
        this.queryService = queryService;
        this.commandService = commandService;
    }

    @GetMapping
    ContextCapsuleListResponse list(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return queryService.list(currentUser.userId(), page, size);
    }

    @GetMapping("/{contextCapsuleId}")
    ContextCapsuleResponse get(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @PathVariable UUID contextCapsuleId) {
        return queryService.get(currentUser.userId(), contextCapsuleId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ContextCapsuleResponse create(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @Valid @RequestBody CreateContextCapsuleRequest request) {
        return createService.create(currentUser.userId(), request);
    }

    @PutMapping("/{contextCapsuleId}")
    ContextCapsuleResponse update(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @PathVariable UUID contextCapsuleId,
            @Valid @RequestBody UpdateContextCapsuleRequest request) {
        return commandService.update(currentUser.userId(), contextCapsuleId, request);
    }

    @DeleteMapping("/{contextCapsuleId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @PathVariable UUID contextCapsuleId) {
        commandService.delete(currentUser.userId(), contextCapsuleId);
    }
}

