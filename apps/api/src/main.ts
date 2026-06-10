// 📌 NestJS 앱의 시작점. 서버를 켜고 포트를 열고 CORS를 설정한다.
import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// apps/api에서 서버를 실행하지만, 실제 .env는 프로젝트 루트에 있어서 경로를 직접 지정한다.
config({ path: '../../.env' });

// NestJS 애플리케이션을 생성하고 HTTP 서버를 실행한다.
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // React 개발 서버가 다른 포트에서 API를 호출할 수 있도록 CORS를 허용한다.
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
