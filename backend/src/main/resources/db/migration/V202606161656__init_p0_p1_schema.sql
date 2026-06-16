CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE users (
    id uuid PRIMARY KEY,
    email_ciphertext bytea NOT NULL,
    email_nonce bytea NOT NULL,
    email_key_id varchar(100) NOT NULL,
    email_lookup_hash bytea NOT NULL,
    password_hash text NOT NULL,
    nickname varchar(50) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    withdrawn_at timestamptz NULL,
    CONSTRAINT ck_users_status
        CHECK (status IN ('active', 'withdrawn', 'suspended'))
);

CREATE UNIQUE INDEX uq_users_email_lookup_hash_active
    ON users (email_lookup_hash)
    WHERE status = 'active';

CREATE INDEX idx_users_status_created_at
    ON users (status, created_at DESC);

CREATE TABLE refresh_token_sessions (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    session_family_id uuid NOT NULL,
    token_hash bytea NOT NULL,
    rotated_from_hash bytea NULL,
    user_agent text NULL,
    ip_address inet NULL,
    expires_at timestamptz NOT NULL,
    last_used_at timestamptz NULL,
    revoked_at timestamptz NULL,
    revoked_reason varchar(50) NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    rotated_at timestamptz NULL,
    CONSTRAINT uq_refresh_sessions_token_hash UNIQUE (token_hash),
    CONSTRAINT ck_refresh_sessions_revoked_reason
        CHECK (
            revoked_reason IS NULL
            OR revoked_reason IN ('logout', 'rotation_reuse', 'withdrawal', 'admin', 'expired')
        )
);

CREATE INDEX idx_refresh_sessions_user_active
    ON refresh_token_sessions (user_id, revoked_at, expires_at);

CREATE INDEX idx_refresh_sessions_family
    ON refresh_token_sessions (session_family_id, created_at);

CREATE TABLE user_privacy_settings (
    user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    friend_ai_sharing_enabled boolean NOT NULL DEFAULT false,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE posts (
    id uuid PRIMARY KEY,
    author_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title varchar(200) NOT NULL,
    content text NOT NULL,
    memory_status varchar(20) NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz NULL,
    CONSTRAINT ck_posts_memory_status
        CHECK (memory_status IN ('pending', 'running', 'succeeded', 'failed'))
);

CREATE INDEX idx_posts_author_active_created
    ON posts (author_id, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_posts_active_created
    ON posts (created_at DESC)
    WHERE deleted_at IS NULL;

CREATE TABLE comments (
    id uuid PRIMARY KEY,
    post_id uuid NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    author_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz NULL
);

CREATE INDEX idx_comments_post_active_created
    ON comments (post_id, created_at ASC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_comments_author_active_created
    ON comments (author_id, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE TABLE tags (
    id uuid PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name varchar(50) NOT NULL,
    normalized_name varchar(50) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_tags_owner_normalized_name UNIQUE (owner_id, normalized_name)
);

CREATE INDEX idx_tags_owner_name
    ON tags (owner_id, name);

CREATE TABLE post_tags (
    post_id uuid NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    tag_id uuid NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_post_tags PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE post_likes (
    post_id uuid NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_post_likes PRIMARY KEY (post_id, user_id)
);

CREATE INDEX idx_post_likes_user_created
    ON post_likes (user_id, created_at DESC);

CREATE TABLE friendships (
    id uuid PRIMARY KEY,
    requester_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    addressee_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    least_user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    greatest_user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status varchar(20) NOT NULL DEFAULT 'pending',
    requested_at timestamptz NOT NULL DEFAULT now(),
    responded_at timestamptz NULL,
    removed_at timestamptz NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_friendships_status
        CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'removed')),
    CONSTRAINT ck_friendships_not_self
        CHECK (requester_id <> addressee_id),
    CONSTRAINT ck_friendships_ordered_pair
        CHECK (least_user_id < greatest_user_id)
);

CREATE UNIQUE INDEX uq_friendships_pair_active
    ON friendships (least_user_id, greatest_user_id)
    WHERE status IN ('pending', 'accepted');

CREATE INDEX idx_friendships_requester_status
    ON friendships (requester_id, status);

CREATE INDEX idx_friendships_addressee_status
    ON friendships (addressee_id, status);

CREATE INDEX idx_friendships_pair_status
    ON friendships (least_user_id, greatest_user_id, status);

CREATE TABLE async_jobs (
    id uuid PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type varchar(50) NOT NULL,
    status varchar(30) NOT NULL DEFAULT 'pending',
    progress integer NOT NULL DEFAULT 0,
    input jsonb NOT NULL DEFAULT '{}'::jsonb,
    result jsonb NULL,
    error jsonb NULL,
    retryable boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    started_at timestamptz NULL,
    completed_at timestamptz NULL,
    CONSTRAINT ck_async_jobs_type
        CHECK (type IN ('memory_reindex', 'memory_summarize', 'gift_recommendation', 'agent_task')),
    CONSTRAINT ck_async_jobs_status
        CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'approval_required', 'rejected')),
    CONSTRAINT ck_async_jobs_progress_range
        CHECK (progress BETWEEN 0 AND 100)
);

CREATE INDEX idx_async_jobs_owner_created
    ON async_jobs (owner_id, created_at DESC);

CREATE INDEX idx_async_jobs_status_created
    ON async_jobs (status, created_at);

CREATE TABLE memory_chunks (
    id uuid PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    post_id uuid NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    comment_id uuid NULL REFERENCES comments (id) ON DELETE CASCADE,
    tag_id uuid NULL REFERENCES tags (id) ON DELETE CASCADE,
    source_kind varchar(30) NOT NULL,
    content text NOT NULL,
    content_hash bytea NOT NULL,
    token_count integer NULL,
    status varchar(20) NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz NULL,
    CONSTRAINT ck_memory_chunks_source_kind
        CHECK (source_kind IN ('post_title', 'post_content', 'comment', 'tag')),
    CONSTRAINT ck_memory_chunks_status
        CHECK (status IN ('active', 'stale', 'deleted')),
    CONSTRAINT ck_memory_chunks_token_count
        CHECK (token_count IS NULL OR token_count >= 0),
    CONSTRAINT ck_memory_chunks_source_fk
        CHECK (
            (
                source_kind IN ('post_title', 'post_content')
                AND comment_id IS NULL
                AND tag_id IS NULL
            )
            OR (
                source_kind = 'comment'
                AND comment_id IS NOT NULL
                AND tag_id IS NULL
            )
            OR (
                source_kind = 'tag'
                AND comment_id IS NULL
                AND tag_id IS NOT NULL
            )
        )
);

CREATE INDEX idx_memory_chunks_owner_status
    ON memory_chunks (owner_id, status);

CREATE INDEX idx_memory_chunks_post_status
    ON memory_chunks (post_id, status);

CREATE INDEX idx_memory_chunks_content_hash
    ON memory_chunks (content_hash);

CREATE TABLE memory_embeddings (
    id uuid PRIMARY KEY,
    chunk_id uuid NOT NULL REFERENCES memory_chunks (id) ON DELETE CASCADE,
    provider varchar(50) NOT NULL,
    model varchar(100) NOT NULL,
    dimension integer NOT NULL DEFAULT 1536,
    embedding vector(1536) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'pending',
    failure_reason text NULL,
    job_id uuid NULL REFERENCES async_jobs (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_memory_embeddings_dimension
        CHECK (dimension = 1536),
    CONSTRAINT ck_memory_embeddings_status
        CHECK (status IN ('pending', 'running', 'succeeded', 'failed'))
);

CREATE INDEX idx_memory_embeddings_chunk
    ON memory_embeddings (chunk_id);

CREATE INDEX idx_memory_embeddings_status
    ON memory_embeddings (status);
