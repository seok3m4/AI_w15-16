ALTER TABLE app_users
	ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
	ADD COLUMN IF NOT EXISTS roles TEXT NOT NULL DEFAULT 'ROLE_USER',
	ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

UPDATE app_users
SET roles = 'ROLE_USER'
WHERE roles IS NULL OR roles = '';

UPDATE app_users
SET email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP)
WHERE provider = 'google';

CREATE TABLE IF NOT EXISTS email_verification_tokens (
	id BIGSERIAL PRIMARY KEY,
	user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
	token_hash VARCHAR(128) NOT NULL UNIQUE,
	expires_at TIMESTAMPTZ NOT NULL,
	consumed_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_active
	ON email_verification_tokens(user_id, consumed_at, expires_at);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
	id BIGSERIAL PRIMARY KEY,
	admin_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
	action VARCHAR(80) NOT NULL,
	target_type VARCHAR(80) NOT NULL,
	target_id VARCHAR(120) NOT NULL,
	detail TEXT NOT NULL DEFAULT '',
	created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created
	ON admin_audit_logs(created_at DESC, id DESC);
