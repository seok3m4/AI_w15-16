CREATE TABLE mcp_connections (
    id uuid PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name varchar(100) NOT NULL,
    provider varchar(50) NOT NULL,
    direction varchar(20) NOT NULL,
    config jsonb NOT NULL DEFAULT '{}'::jsonb,
    secret_ref varchar(200) NULL,
    status varchar(20) NOT NULL DEFAULT 'active',
    expires_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_mcp_connections_direction
        CHECK (direction IN ('server', 'client')),
    CONSTRAINT ck_mcp_connections_status
        CHECK (status IN ('active', 'disabled', 'failed'))
);

CREATE INDEX idx_mcp_connections_owner_status
    ON mcp_connections (owner_id, status);

CREATE TABLE mcp_connection_secrets (
    connection_id uuid PRIMARY KEY REFERENCES mcp_connections (id) ON DELETE CASCADE,
    secret_hash bytea NOT NULL,
    algorithm varchar(30) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    rotated_at timestamptz NULL,
    CONSTRAINT uq_mcp_connection_secrets_hash UNIQUE (secret_hash)
);

CREATE TABLE mcp_call_logs (
    id uuid PRIMARY KEY,
    connection_id uuid NULL REFERENCES mcp_connections (id) ON DELETE SET NULL,
    run_id uuid NULL REFERENCES agent_runs (id) ON DELETE SET NULL,
    caller_user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    tool_name varchar(100) NOT NULL,
    direction varchar(20) NOT NULL,
    input jsonb NOT NULL DEFAULT '{}'::jsonb,
    output jsonb NULL,
    status varchar(30) NOT NULL,
    error jsonb NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_mcp_call_logs_direction
        CHECK (direction IN ('server_inbound', 'client_outbound')),
    CONSTRAINT ck_mcp_call_logs_status
        CHECK (status IN ('succeeded', 'failed', 'approval_required'))
);

CREATE INDEX idx_mcp_call_logs_user_created
    ON mcp_call_logs (caller_user_id, created_at DESC);

CREATE INDEX idx_mcp_call_logs_connection_created
    ON mcp_call_logs (connection_id, created_at DESC);

CREATE TABLE mcp_oauth_states (
    state varchar(120) PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    provider varchar(50) NOT NULL,
    code_verifier_hash bytea NOT NULL,
    redirect_uri text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL
);

CREATE INDEX idx_mcp_oauth_states_owner_created
    ON mcp_oauth_states (owner_id, created_at DESC);
