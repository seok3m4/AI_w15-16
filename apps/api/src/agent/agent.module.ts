import { Module } from '@nestjs/common';
import { McpModule } from '../mcp/mcp.module';
import { RagModule } from '../rag/rag.module';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';

@Module({
  // MCP(place_search), RAG(검색 + OpenAiService)를 도구로 사용한다.
  imports: [McpModule, RagModule],
  controllers: [AgentController],
  providers: [AgentService],
})
export class AgentModule {}
