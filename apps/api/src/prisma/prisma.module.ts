// 📌 PrismaService를 다른 모듈에서 쓸 수 있도록 등록하고 내보내는 모듈.
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// PrismaService를 export해야 AuthModule, ReviewModule 같은 다른 모듈에서도 DB를 주입받을 수 있다.
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
