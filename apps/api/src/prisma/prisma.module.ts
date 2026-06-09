import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Exports PrismaService so feature modules can inject one shared DB client.
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
