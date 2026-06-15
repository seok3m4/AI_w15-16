ALTER TABLE app_users
	ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
	ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ,
	ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE email_verification_tokens
	ADD COLUMN IF NOT EXISTS code_hash VARCHAR(128),
	ADD COLUMN IF NOT EXISTS code_attempt_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_code_active
	ON email_verification_tokens(user_id, code_hash, consumed_at, expires_at);
