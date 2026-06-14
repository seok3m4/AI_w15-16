ALTER TABLE app_users
    ADD COLUMN IF NOT EXISTS nickname VARCHAR(40);

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_nickname
    ON app_users (nickname)
    WHERE nickname IS NOT NULL;

ALTER TABLE board_posts
    ADD COLUMN IF NOT EXISTS category VARCHAR(40) NOT NULL DEFAULT 'general',
    ADD COLUMN IF NOT EXISTS author_user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;

ALTER TABLE board_comments
    ADD COLUMN IF NOT EXISTS author_user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS parent_comment_id BIGINT REFERENCES board_comments(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS board_post_likes (
    post_id BIGINT NOT NULL REFERENCES board_posts(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS board_reports (
    id BIGSERIAL PRIMARY KEY,
    target_type VARCHAR(40) NOT NULL,
    post_id BIGINT NOT NULL REFERENCES board_posts(id) ON DELETE CASCADE,
    comment_id BIGINT REFERENCES board_comments(id) ON DELETE CASCADE,
    reporter_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    reason VARCHAR(80) NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS board_notifications (
    id BIGSERIAL PRIMARY KEY,
    recipient_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    actor_user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
    post_id BIGINT NOT NULL REFERENCES board_posts(id) ON DELETE CASCADE,
    comment_id BIGINT REFERENCES board_comments(id) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_board_posts_category_visible
    ON board_posts(category, hidden_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_board_comments_parent_visible
    ON board_comments(post_id, parent_comment_id, hidden_at, created_at);

CREATE INDEX IF NOT EXISTS idx_board_notifications_recipient_unread
    ON board_notifications(recipient_user_id, read_at, created_at DESC);
