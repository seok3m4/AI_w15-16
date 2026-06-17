// 📌 실제 로직을 처리하는 곳. /health 응답 데이터를 만들어서 반환한다.
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  // PrismaService를 주입받아 AppService 안에서 DB 조회를 할 수 있게 한다.
  constructor(private readonly prisma: PrismaService) {}

  // API 상태와 DB 연결 여부를 확인하기 위해 실제 Post 테이블 개수를 조회한다.
  async getHealth() {
    const postCount = await this.prisma.post.count();

    return {
      status: 'ok',
      service: 'travel-course-api',
      database: 'connected',
      postCount,
    };
  }
}
