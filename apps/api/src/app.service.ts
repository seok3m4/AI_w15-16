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
