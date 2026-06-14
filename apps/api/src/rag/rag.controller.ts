// 📌 RAG API. 유사 코스 추천, 시맨틱 검색, 게시판 Q&A를 노출한다.
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AskDto } from './dto/ask.dto';
import { RagService } from './rag.service';

@Controller()
export class RagController {
  constructor(private readonly ragService: RagService) {}

  // 특정 게시글과 의미가 비슷한 다른 코스를 추천한다.
  // GET /posts/:id/similar?limit=4
  @Get('posts/:id/similar')
  similar(@Param('id') id: string, @Query('limit') limit?: string) {
    const limitNum = limit ? Math.min(parseInt(limit, 10) || 4, 10) : 4;
    return this.ragService.findSimilarToPost(id, limitNum);
  }

  // 자유 텍스트로 의미가 가까운 코스를 검색한다. (시맨틱 검색)
  // GET /rag/search?q=바다 보면서 힐링&limit=4
  @Get('rag/search')
  search(@Query('q') query: string, @Query('limit') limit?: string) {
    const limitNum = limit ? Math.min(parseInt(limit, 10) || 4, 10) : 4;
    return this.ragService.searchByQuery(query ?? '', limitNum);
  }

  // 게시판 Q&A: 질문을 받아 기존 후기를 근거로 답변을 생성한다.
  // POST /rag/ask  { "question": "부산 1박 2일 추천 코스 있어?" }
  @Post('rag/ask')
  ask(@Body() dto: AskDto) {
    return this.ragService.ask(dto.question);
  }
}
