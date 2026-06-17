// 📌 NestJS 앱의 시작점. 서버를 켜고 포트를 열고 CORS를 설정한다.
import { ValidationPipe } from '@nestjs/common';
import { config } from 'dotenv';
import { json, urlencoded } from 'express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// apps/api에서 서버를 실행하지만, 실제 .env는 프로젝트 루트에 있어서 경로를 직접 지정한다.
config({ path: '../../.env' });

// NestJS 애플리케이션을 생성하고 HTTP 서버를 실행한다.
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 대표 사진을 base64로 함께 전송하므로 기본 본문 크기 제한(100kb)을 넉넉히 올린다.
  app.use(json({ limit: '8mb' }));
  app.use(urlencoded({ limit: '8mb', extended: true }));

  // DTO에 적은 class-validator 규칙을 실제 요청 검증에 사용한다.
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  // React 개발 서버가 다른 포트에서 API를 호출할 수 있도록 CORS를 허용한다.
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
