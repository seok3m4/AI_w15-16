-- 여행 코스 경유지를 1일차/2일차처럼 나눠 표시하기 위한 컬럼.
ALTER TABLE "Place" ADD COLUMN "day" INTEGER NOT NULL DEFAULT 1;

-- 상세 화면과 RAG 컨텍스트에서 일차 → 방문 순서대로 빠르게 읽기 위한 인덱스.
CREATE INDEX "Place_postId_day_order_idx" ON "Place"("postId", "day", "order");
