// 📌 요청을 받는 곳. GET /health 요청이 오면 AppService를 호출한다.
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // 서버와 DB가 정상 동작하는지 확인하는 health check API.
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }
}
