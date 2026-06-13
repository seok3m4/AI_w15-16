-- 썸네일 기능을 현재 범위에서 제외하므로 Post.thumbnailUrl 컬럼을 제거한다.
ALTER TABLE "Post" DROP COLUMN IF EXISTS "thumbnailUrl";
