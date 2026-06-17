CREATE TABLE agent_runs (
    id uuid PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    goal text NOT NULL,
    allowed_tools jsonb NOT NULL DEFAULT '[]'::jsonb,
    status varchar(30) NOT NULL,
    result jsonb NULL,
    failure_reason text NULL,
    job_id uuid NULL REFERENCES async_jobs (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz NULL,
    CONSTRAINT ck_agent_runs_status
        CHECK (status IN ('pending', 'running', 'approval_required', 'succeeded', 'failed', 'rejected'))
);

CREATE INDEX idx_agent_runs_owner_created
    ON agent_runs (owner_id, created_at DESC);

CREATE INDEX idx_agent_runs_status_created
    ON agent_runs (status, created_at);

CREATE TABLE agent_steps (
    id uuid PRIMARY KEY,
    run_id uuid NOT NULL REFERENCES agent_runs (id) ON DELETE CASCADE,
    step_order integer NOT NULL,
    tool_name varchar(100) NOT NULL,
    status varchar(30) NOT NULL,
    input_summary text NULL,
    output_summary text NULL,
    error jsonb NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_agent_steps_status
        CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'skipped')),
    CONSTRAINT uq_agent_steps_run_order UNIQUE (run_id, step_order)
);

CREATE INDEX idx_agent_steps_run_created
    ON agent_steps (run_id, created_at);

CREATE TABLE agent_approvals (
    id uuid PRIMARY KEY,
    run_id uuid NOT NULL REFERENCES agent_runs (id) ON DELETE CASCADE,
    type varchar(50) NOT NULL,
    description text NOT NULL,
    status varchar(20) NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    requested_at timestamptz NOT NULL DEFAULT now(),
    decided_at timestamptz NULL,
    decided_by uuid NULL REFERENCES users (id) ON DELETE SET NULL,
    expires_at timestamptz NULL,
    CONSTRAINT ck_agent_approvals_status
        CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    CONSTRAINT ck_agent_approvals_type
        CHECK (type IN ('external_write', 'post_create', 'notion_export'))
);

CREATE INDEX idx_agent_approvals_run_status
    ON agent_approvals (run_id, status);

CREATE TABLE tool_call_logs (
    id uuid PRIMARY KEY,
    run_id uuid NULL REFERENCES agent_runs (id) ON DELETE SET NULL,
    step_id uuid NULL REFERENCES agent_steps (id) ON DELETE SET NULL,
    caller_user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    tool_name varchar(100) NOT NULL,
    input jsonb NOT NULL DEFAULT '{}'::jsonb,
    output jsonb NULL,
    status varchar(30) NOT NULL,
    error jsonb NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_tool_call_logs_status
        CHECK (status IN ('succeeded', 'failed', 'approval_required'))
);

CREATE INDEX idx_tool_call_logs_user_created
    ON tool_call_logs (caller_user_id, created_at DESC);

CREATE INDEX idx_tool_call_logs_run_created
    ON tool_call_logs (run_id, created_at);
