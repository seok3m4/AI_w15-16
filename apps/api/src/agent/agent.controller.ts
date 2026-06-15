// 📌 AI Agent API. 질문을 받아 도구(RAG 코스 검색 + MCP 장소 검색)를 활용해 답한다.
import { Body, Controller, Post } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentAskDto } from './dto/ask.dto';

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  // POST /agent/ask  { "question": "부산에서 바다 보기 좋은 코스 알려줘" }
  @Post('ask')
  ask(@Body() dto: AgentAskDto) {
    return this.agentService.ask(dto.question);
  }
}
