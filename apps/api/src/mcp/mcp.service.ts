// 📌 MCP 클라이언트. mcp-server 프로세스를 띄우고 도구를 호출한다.
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class McpService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(McpService.name);
  private client: Client;
  private transport: StdioClientTransport;
  private ready = false;

  async onModuleInit() {
    const serverPath = this.resolveMcpServerPath();

    this.transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath],
      env: {
        ...process.env,
        KAKAO_REST_API_KEY: process.env.KAKAO_REST_API_KEY ?? '',
      },
    });

    this.client = new Client(
      { name: 'jungle-travel-api', version: '1.0.0' },
      { capabilities: {} },
    );

    try {
      await this.client.connect(this.transport);
      this.ready = true;
      this.logger.log('MCP 서버에 연결됐습니다.');
    } catch (err) {
      this.logger.error('MCP 서버 연결 실패:', err);
    }
  }

  async onModuleDestroy() {
    if (this.ready) {
      await this.client.close();
    }
  }

  // Kakao 장소 검색 도구를 호출하고 결과를 반환한다.
  async searchPlaces(query: string, size = 5): Promise<PlaceResult[]> {
    if (!this.ready) {
      throw new Error('MCP 서버가 준비되지 않았습니다.');
    }

    const result = await this.client.callTool({
      name: 'place_search',
      arguments: { query, size },
    });

    // MCP 응답은 content 배열 안에 text 블록으로 JSON이 들어온다.
    const text = (result.content as Array<{ type: string; text: string }>).find(
      (c) => c.type === 'text',
    )?.text;

    if (!text) {
      return [];
    }

    try {
      return JSON.parse(text) as PlaceResult[];
    } catch {
      // 결과 없음 메시지가 오면 빈 배열 반환
      return [];
    }
  }

  private resolveMcpServerPath(): string {
    // 빌드된 dist/index.js를 기준으로 찾는다.
    const candidates = [
      path.resolve(__dirname, '../../../mcp-server/dist/index.js'),
      path.resolve(process.cwd(), '../mcp-server/dist/index.js'),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    throw new Error(
      `mcp-server를 찾을 수 없습니다. 먼저 apps/mcp-server 에서 npm run build를 실행하세요.\n` +
      `시도한 경로: ${candidates.join(', ')}`,
    );
  }
}

export type PlaceResult = {
  index: number;
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  url: string;
};
