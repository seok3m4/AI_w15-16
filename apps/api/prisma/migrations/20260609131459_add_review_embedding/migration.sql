CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "ReviewEmbedding" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewEmbedding_reviewId_key" ON "ReviewEmbedding"("reviewId");

-- AddForeignKey
ALTER TABLE "ReviewEmbedding" ADD CONSTRAINT "ReviewEmbedding_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
