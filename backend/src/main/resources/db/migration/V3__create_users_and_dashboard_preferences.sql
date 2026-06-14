CREATE TABLE app_users (
    id BIGSERIAL PRIMARY KEY,
    provider VARCHAR(40) NOT NULL,
    provider_user_id VARCHAR(160) NOT NULL,
    email VARCHAR(320),
    display_name VARCHAR(160) NOT NULL,
    avatar_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_user_id)
);

CREATE TABLE user_dashboard_preferences (
    user_id BIGINT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    core_metric_ids TEXT NOT NULL,
    watch_metric_ids TEXT NOT NULL,
    event_ids TEXT NOT NULL,
    report_ids TEXT NOT NULL,
    visible_sections TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_app_users_email ON app_users(email);
CREATE INDEX idx_app_users_provider_user_id ON app_users(provider, provider_user_id);
