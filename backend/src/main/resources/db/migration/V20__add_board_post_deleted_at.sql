ALTER TABLE board_posts
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_board_posts_deleted_at
    ON board_posts(deleted_at);
