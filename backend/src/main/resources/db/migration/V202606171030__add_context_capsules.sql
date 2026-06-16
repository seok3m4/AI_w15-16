CREATE TABLE context_capsules (
    id uuid PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title varchar(200) NOT NULL,
    purpose text NOT NULL,
    query text NULL,
    summary text NOT NULL,
    key_facts jsonb NOT NULL DEFAULT '[]'::jsonb,
    tags jsonb NOT NULL DEFAULT '[]'::jsonb,
    contains_friend_context boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz NULL
);

CREATE INDEX idx_context_capsules_owner_active_created
    ON context_capsules (owner_id, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE TABLE context_capsule_sources (
    capsule_id uuid NOT NULL REFERENCES context_capsules (id) ON DELETE CASCADE,
    post_id uuid NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    chunk_id uuid NULL REFERENCES memory_chunks (id) ON DELETE SET NULL,
    owner_user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    source_type varchar(30) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_context_capsule_sources PRIMARY KEY (capsule_id, post_id),
    CONSTRAINT ck_context_capsule_sources_type
        CHECK (source_type IN ('post', 'comment', 'tag', 'memory_chunk'))
);

CREATE INDEX idx_capsule_sources_owner_user
    ON context_capsule_sources (owner_user_id, created_at DESC);
