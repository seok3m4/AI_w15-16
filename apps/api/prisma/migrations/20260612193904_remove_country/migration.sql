-- 국내 여행 전용으로 전환하면서 Post.country 컬럼을 제거한다.
ALTER TABLE "Post" DROP COLUMN "country";
