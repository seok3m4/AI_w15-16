CREATE TABLE economy_metric_observations (
    metric_id VARCHAR(80) NOT NULL,
    series_id VARCHAR(80) NOT NULL,
    observation_date DATE NOT NULL,
    "value" VARCHAR(80) NOT NULL,
    unit VARCHAR(80) NOT NULL,
    source_name VARCHAR(160) NOT NULL,
    source_url VARCHAR(500) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (metric_id, observation_date)
);

CREATE INDEX idx_economy_metric_observations_metric_date
    ON economy_metric_observations(metric_id, observation_date ASC);

CREATE TABLE economy_metric_source_values (
    metric_id VARCHAR(80) NOT NULL,
    provider VARCHAR(80) NOT NULL,
    provider_series_id VARCHAR(160) NOT NULL,
    "value" VARCHAR(80) NOT NULL,
    unit VARCHAR(80) NOT NULL,
    base_date VARCHAR(40) NOT NULL,
    source_url VARCHAR(500) NOT NULL,
    status VARCHAR(40) NOT NULL,
    error_message TEXT,
    updated_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (metric_id, provider, provider_series_id)
);

CREATE INDEX idx_economy_metric_source_values_metric
    ON economy_metric_source_values(metric_id);

ALTER TABLE economy_events
    ADD COLUMN source_type VARCHAR(40) NOT NULL DEFAULT 'FRED';

ALTER TABLE economy_events
    ADD COLUMN source_event_id VARCHAR(160) NOT NULL DEFAULT '';

ALTER TABLE economy_events
    ADD COLUMN event_category VARCHAR(80) NOT NULL DEFAULT 'general';

ALTER TABLE economy_events
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX idx_economy_events_source_type
    ON economy_events(source_type);

CREATE INDEX idx_economy_events_event_category
    ON economy_events(event_category);
