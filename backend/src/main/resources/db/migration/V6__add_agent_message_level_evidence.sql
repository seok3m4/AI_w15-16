ALTER TABLE agent_messages
    ADD COLUMN answer_status VARCHAR(40),
    ADD COLUMN evidence_metric_ids TEXT NOT NULL DEFAULT '',
    ADD COLUMN evidence_event_ids TEXT NOT NULL DEFAULT '',
    ADD COLUMN evidence_news_ids TEXT NOT NULL DEFAULT '',
    ADD COLUMN evidence_rag_chunk_ids TEXT NOT NULL DEFAULT '';

ALTER TABLE agent_evidence_items
    ADD COLUMN message_id BIGINT REFERENCES agent_messages(id) ON DELETE SET NULL;

ALTER TABLE agent_steps
    ADD COLUMN message_id BIGINT REFERENCES agent_messages(id) ON DELETE SET NULL;

CREATE INDEX idx_agent_evidence_items_message ON agent_evidence_items(message_id);
CREATE INDEX idx_agent_steps_message_order ON agent_steps(message_id, step_order);
