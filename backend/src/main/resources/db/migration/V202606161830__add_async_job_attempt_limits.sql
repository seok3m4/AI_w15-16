ALTER TABLE async_jobs
    ADD COLUMN attempt_count integer NOT NULL DEFAULT 0,
    ADD COLUMN max_attempts integer NOT NULL DEFAULT 1;

ALTER TABLE async_jobs
    ADD CONSTRAINT ck_async_jobs_attempts_non_negative
    CHECK (attempt_count >= 0 AND max_attempts >= 1 AND attempt_count <= max_attempts);
