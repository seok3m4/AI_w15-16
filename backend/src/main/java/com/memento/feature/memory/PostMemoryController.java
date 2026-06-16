package com.memento.feature.memory;

import com.memento.feature.auth.AuthenticatedUserPrincipal;
import com.memento.feature.auth.CurrentUser;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
class PostMemoryController {

    private final PostMemoryFeatureService service;

    PostMemoryController(PostMemoryFeatureService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/posts/{postId}/memory-status")
    PostMemoryStatusResponse getPostMemoryStatus(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @PathVariable UUID postId) {
        return service.getPostMemoryStatus(currentUser.userId(), postId);
    }

    @PostMapping("/api/v1/memories/reindex")
    @ResponseStatus(HttpStatus.ACCEPTED)
    AsyncJobResponse reindexMemories(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @Valid @RequestBody ReindexMemoriesRequest request) {
        return service.reindexPosts(currentUser.userId(), request);
    }

    @GetMapping("/api/v1/jobs/{jobId}")
    AsyncJobResponse getJob(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @PathVariable UUID jobId) {
        return service.getJob(currentUser.userId(), jobId);
    }

    @PostMapping("/api/v1/memory-search")
    MemorySearchResponse searchMemories(
            @CurrentUser AuthenticatedUserPrincipal currentUser,
            @Valid @RequestBody MemorySearchRequest request) {
        return service.searchMemories(currentUser.userId(), request);
    }
}
