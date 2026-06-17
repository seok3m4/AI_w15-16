// 📌 기존 게시글에 임베딩을 일괄 생성하는 일회성 스크립트.
// RAG를 처음 켜거나 seed 직후, 이미 존재하는 게시글들에 임베딩이 없을 때 실행한다.
//   실행: cd apps/api && npx ts-node src/rag/backfill-embeddings.ts
import { config } from 'dotenv';
config({ path: '../../.env' });

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from './rag.service';
import { OpenAiService } from './openai.service';

async function main() {
  const logger = new Logger('BackfillEmbeddings');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const openai = app.get(OpenAiService);
  if (!openai.enabled) {
    logger.error('OPENAI_API_KEY가 비어 있어 임베딩을 생성할 수 없습니다.');
    await app.close();
    process.exit(1);
  }

  const prisma = app.get(PrismaService);
  const rag = app.get(RagService);

  const posts = await prisma.post.findMany({ select: { id: true, title: true } });
  logger.log(`게시글 ${posts.length}건의 임베딩을 생성합니다.`);

  let ok = 0;
  for (const post of posts) {
    try {
      await rag.upsertEmbedding(post.id);
      ok += 1;
      logger.log(`✅ (${ok}/${posts.length}) ${post.title}`);
    } catch (err) {
      logger.error(
        `❌ ${post.title}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  logger.log(`완료: ${ok}/${posts.length}건 임베딩 생성.`);
  await app.close();
  process.exit(0);
}

main();
