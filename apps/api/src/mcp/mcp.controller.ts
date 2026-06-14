// 📌 MCP 도구를 HTTP로 노출한다. AI Agent 단계에서 내부적으로도 쓰인다.
import { Controller, Get, Query } from '@nestjs/common';
import { McpService } from './mcp.service';

@Controller('mcp')
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  // GET /mcp/places?q=해운대&size=5
  // Kakao 장소 검색 결과를 반환한다. (AI Agent + 프론트 PlaceEditor에서 활용)
  @Get('places')
  searchPlaces(
    @Query('q') query: string,
    @Query('size') size?: string,
  ) {
    const sizeNum = size ? Math.min(parseInt(size, 10) || 5, 15) : 5;
    return this.mcpService.searchPlaces(query, sizeNum);
  }
}
