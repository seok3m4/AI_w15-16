// 📌 실제 로직을 처리하는 곳. /health 응답 데이터를 만들어서 반환한다.
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'cine-review-api',
      database: process.env.DATABASE_URL ? 'configured' : 'missing',
    };
  }
}
