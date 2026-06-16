CREATE UNIQUE INDEX uq_async_jobs_memory_reindex_pending_post
    ON async_jobs (owner_id, (input ->> 'postId'))
    WHERE type = 'memory_reindex' AND status = 'pending';

CREATE UNIQUE INDEX uq_memory_embeddings_active_chunk_provider_model
    ON memory_embeddings (chunk_id, provider, model)
    WHERE status IN ('pending', 'running', 'succeeded');
