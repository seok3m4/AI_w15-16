ALTER TABLE "Post" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Post_viewCount_idx" ON "Post"("viewCount");
