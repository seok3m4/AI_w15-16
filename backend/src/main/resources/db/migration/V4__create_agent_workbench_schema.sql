CREATE TABLE agent_runs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    run_type VARCHAR(40) NOT NULL,
    status VARCHAR(40) NOT NULL,
    summary TEXT NOT NULL,
    status_label VARCHAR(120) NOT NULL,
    korea_impact TEXT NOT NULL,
    risks TEXT NOT NULL,
    evidence_metric_ids TEXT NOT NULL,
    evidence_event_ids TEXT NOT NULL,
    model VARCHAR(120) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE agent_steps (
    id BIGSERIAL PRIMARY KEY,
    run_id BIGINT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    agent VARCHAR(120) NOT NULL,
    action TEXT NOT NULL,
    guardrail VARCHAR(120) NOT NULL,
    result VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agent_messages (
    id BIGSERIAL PRIMARY KEY,
    run_id BIGINT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    role VARCHAR(40) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_runs_user_created ON agent_runs(user_id, created_at DESC);
CREATE INDEX idx_agent_steps_run_order ON agent_steps(run_id, step_order);
CREATE INDEX idx_agent_messages_run_created ON agent_messages(run_id, created_at);
