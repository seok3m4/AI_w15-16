// 📌 NestJS 앱의 시작점. 서버를 켜고 포트를 열고 CORS를 설정한다.
import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// The API workspace runs from apps/api, while the shared .env lives at repo root.
config({ path: '../../.env' });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
