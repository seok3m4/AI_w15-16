ALTER TABLE agent_runs
    ADD COLUMN evidence_news_ids TEXT NOT NULL DEFAULT '',
    ADD COLUMN evidence_rag_chunk_ids TEXT NOT NULL DEFAULT '';

CREATE TABLE agent_evidence_items (
    id BIGSERIAL PRIMARY KEY,
    run_id BIGINT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    evidence_id VARCHAR(160) NOT NULL,
    evidence_type VARCHAR(40) NOT NULL,
    title VARCHAR(240) NOT NULL,
    source_name VARCHAR(160) NOT NULL,
    source_url VARCHAR(700) NOT NULL,
    observed_at VARCHAR(80),
    snippet TEXT NOT NULL,
    payload TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_evidence_items_run ON agent_evidence_items(run_id);
CREATE INDEX idx_agent_evidence_items_type_id ON agent_evidence_items(evidence_type, evidence_id);
