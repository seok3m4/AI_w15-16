-- 게시글 대표 사진(리사이즈된 base64 data URL) 컬럼 추가.
ALTER TABLE "Post" ADD COLUMN "thumbnailUrl" TEXT;
