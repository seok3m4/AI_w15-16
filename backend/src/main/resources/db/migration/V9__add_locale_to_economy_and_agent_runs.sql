ALTER TABLE economy_briefs
    ADD COLUMN locale VARCHAR(20) NOT NULL DEFAULT 'ko';

CREATE INDEX idx_economy_briefs_locale_generated_at
    ON economy_briefs(locale, generated_at DESC, id DESC);

ALTER TABLE agent_runs
    ADD COLUMN locale VARCHAR(20) NOT NULL DEFAULT 'ko';

CREATE INDEX idx_agent_runs_user_locale_created
    ON agent_runs(user_id, locale, created_at DESC)
    WHERE hidden_at IS NULL;
