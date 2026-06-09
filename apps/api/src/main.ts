import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// The API workspace runs from apps/api, while the shared .env lives at repo root.
config({ path: '../../.env' });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
