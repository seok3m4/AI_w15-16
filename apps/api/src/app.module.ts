// 📌 NestJS 앱 전체 구조 선언. 어떤 Controller/Service/Module을 쓸지 여기서 등록한다.
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
