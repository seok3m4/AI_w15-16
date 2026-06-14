ALTER TABLE agent_runs
    ADD COLUMN hidden_at TIMESTAMPTZ;

CREATE INDEX idx_agent_runs_user_visible_created
    ON agent_runs(user_id, created_at DESC)
    WHERE hidden_at IS NULL;
