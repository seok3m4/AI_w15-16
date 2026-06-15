CREATE TABLE IF NOT EXISTS auth_rate_limits (
	rate_key VARCHAR(220) PRIMARY KEY,
	action VARCHAR(40) NOT NULL,
	attempt_count INTEGER NOT NULL,
	window_started_at TIMESTAMPTZ NOT NULL,
	blocked_until TIMESTAMPTZ,
	captcha_required_until TIMESTAMPTZ,
	updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_updated
	ON auth_rate_limits(updated_at DESC);

CREATE TABLE IF NOT EXISTS admin_mfa_settings (
	user_id BIGINT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
	secret_ciphertext TEXT NOT NULL,
	confirmed_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_mfa_recovery_codes (
	id BIGSERIAL PRIMARY KEY,
	user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
	code_hash VARCHAR(128) NOT NULL,
	consumed_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_mfa_recovery_user_active
	ON admin_mfa_recovery_codes(user_id, consumed_at);
