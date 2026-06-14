CREATE TABLE economy_metric_snapshots (
    id VARCHAR(80) PRIMARY KEY,
    series_id VARCHAR(80) NOT NULL,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(80) NOT NULL,
    "value" VARCHAR(80) NOT NULL,
    unit VARCHAR(80) NOT NULL,
    period VARCHAR(80) NOT NULL,
    base_date VARCHAR(40) NOT NULL,
    source_name VARCHAR(160) NOT NULL,
    source_url VARCHAR(500) NOT NULL,
    previous_value VARCHAR(80) NOT NULL,
    change VARCHAR(80) NOT NULL,
    change_percent VARCHAR(80) NOT NULL,
    interpretation TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE economy_events (
    id VARCHAR(80) PRIMARY KEY,
    title VARCHAR(160) NOT NULL,
    release_date_time TIMESTAMPTZ NOT NULL,
    importance VARCHAR(20) NOT NULL,
    previous_value VARCHAR(80) NOT NULL,
    forecast_value VARCHAR(80) NOT NULL,
    actual_value VARCHAR(80),
    unit VARCHAR(80) NOT NULL,
    status VARCHAR(40) NOT NULL,
    interpretation TEXT NOT NULL,
    source_name VARCHAR(160) NOT NULL,
    source_url VARCHAR(500) NOT NULL,
    related_metric_ids TEXT NOT NULL
);

CREATE TABLE economy_briefs (
    id BIGSERIAL PRIMARY KEY,
    summary TEXT NOT NULL,
    status_label VARCHAR(120) NOT NULL,
    korea_impact TEXT NOT NULL,
    risks TEXT NOT NULL,
    evidence_metric_ids TEXT NOT NULL,
    evidence_event_ids TEXT NOT NULL,
    model VARCHAR(120) NOT NULL,
    generation_status VARCHAR(80) NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE economy_sync_runs (
    id BIGSERIAL PRIMARY KEY,
    source VARCHAR(80) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(40) NOT NULL,
    error_message TEXT
);

CREATE INDEX idx_economy_metric_snapshots_updated_at ON economy_metric_snapshots(updated_at DESC);
CREATE INDEX idx_economy_events_release_date_time ON economy_events(release_date_time ASC);
CREATE INDEX idx_economy_briefs_generated_at ON economy_briefs(generated_at DESC);
CREATE INDEX idx_economy_sync_runs_started_at ON economy_sync_runs(started_at DESC);
