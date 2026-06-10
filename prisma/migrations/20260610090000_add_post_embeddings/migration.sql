-- Enable pgvector for semantic search over board posts.
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "PostEmbedding" (
    "postId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostEmbedding_pkey" PRIMARY KEY ("postId")
);

-- CreateIndex
CREATE INDEX "PostEmbedding_updatedAt_idx" ON "PostEmbedding"("updatedAt");

-- CreateIndex
CREATE INDEX "PostEmbedding_embedding_idx" ON "PostEmbedding" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

-- AddForeignKey
ALTER TABLE "PostEmbedding" ADD CONSTRAINT "PostEmbedding_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
