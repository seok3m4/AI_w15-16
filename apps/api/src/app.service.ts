// 📌 실제 로직을 처리하는 곳. /health 응답 데이터를 만들어서 반환한다.
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth() {
    const userCount = await this.prisma.user.count();

    return {
      status: 'ok',
      service: 'cine-review-api',
      database: 'connected',
      userCount,
    };
  }
}
