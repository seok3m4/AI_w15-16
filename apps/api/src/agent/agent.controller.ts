// 📌 AI Agent API. 자유 요청을 받아 여행 코스 초안을 생성한다.
// 로그인한 사용자만 사용할 수 있다. (작성 폼에서 호출)
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AgentService } from './agent.service';
import { DraftDto } from './dto/draft.dto';

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  // POST /agent/draft  { "request": "부산 2박 3일 바다 코스 만들어줘" }
  @UseGuards(JwtAuthGuard)
  @Post('draft')
  draft(@Body() dto: DraftDto) {
    return this.agentService.draftCourse(dto.request);
  }
}
