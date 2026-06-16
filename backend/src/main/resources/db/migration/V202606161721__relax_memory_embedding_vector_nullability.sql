ALTER TABLE memory_embeddings
    ALTER COLUMN embedding DROP NOT NULL;

UPDATE memory_embeddings
SET embedding = NULL
WHERE status IN ('pending', 'running', 'failed');

ALTER TABLE memory_embeddings
    DROP CONSTRAINT IF EXISTS ck_memory_embeddings_vector_matches_status;

ALTER TABLE memory_embeddings
    ADD CONSTRAINT ck_memory_embeddings_vector_matches_status
        CHECK (
            (
                status = 'succeeded'
                AND embedding IS NOT NULL
            )
            OR (
                status IN ('pending', 'running', 'failed')
                AND embedding IS NULL
            )
        );
