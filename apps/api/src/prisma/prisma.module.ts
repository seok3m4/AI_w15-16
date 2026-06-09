// 📌 PrismaService를 다른 모듈에서 쓸 수 있도록 등록하고 내보내는 모듈.
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Exports PrismaService so feature modules can inject one shared DB client.
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
