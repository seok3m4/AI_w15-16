// 📌 AI Agent. OpenAI function calling 루프로 게시판 Q&A에 답한다.
// 사용자의 질문을 받아, 모델이 스스로 도구를 골라 호출하며 정보를 모은다.
//   - search_similar_posts(RAG): 게시판에 올라온 비슷한 코스 후기 검색
//   - place_search(MCP/Kakao): 실제 장소의 위치·주소·좌표 검색
// 수집한 정보를 근거로 답변을 생성하고, 참고한 코스/장소를 함께 반환한다.
import { Injectable, Logger } from '@nestjs/common';
import type OpenAI from 'openai';
import { McpService, PlaceResult } from '../mcp/mcp.service';
import { OpenAiService } from '../rag/openai.service';
import { RagService, SimilarPost } from '../rag/rag.service';

// Q&A 응답: 답변 + 참고한 게시판 코스 + 참고한 실제 장소
export type AgentAnswer = {
  answer: string;
  sources: SimilarPost[];
  places: PlaceResult[];
};

// 무한 루프를 막기 위한 도구 호출 라운드 상한.
const MAX_ROUNDS = 5;

// 모델에게 제공하는 도구 정의. (코스 검색 + 장소 검색)
const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_similar_posts',
      description:
        '게시판에 이미 올라온 여행 코스 후기를 의미 기반으로 검색한다. 코스 추천·후기 관련 질문에 사용한다.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '찾고 싶은 여행 주제나 분위기 (예: 부산 바다 맛집, 혼자 힐링)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'place_search',
      description:
        '키워드로 국내 실제 장소를 검색해 이름·주소·좌표를 얻는다. 특정 장소의 위치/주소 정보를 묻거나, 코스에 넣을 장소를 제안할 때 사용한다.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '검색할 장소 이름 (예: 광안리 해수욕장, 전주 한옥마을)',
          },
        },
        required: ['query'],
      },
    },
  },
];

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly openai: OpenAiService,
    private readonly mcp: McpService,
    private readonly rag: RagService,
  ) {}

  // 사용자 질문에 답한다. 도구를 반복 호출하며 정보를 모은 뒤 답변을 생성한다.
  async ask(question: string): Promise<AgentAnswer> {
    if (!this.openai.enabled) {
      throw new Error(
        'OPENAI_API_KEY가 설정되지 않아 AI 질문 기능을 사용할 수 없습니다.',
      );
    }

    // 루프 동안 도구로 찾은 코스/장소를 모아 출처로 반환한다.
    const collectedPosts = new Map<string, SimilarPost>();
    const collectedPlaces: PlaceResult[] = [];

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content:
          '너는 국내 여행 코스 공유 게시판의 AI 도우미야. ' +
          '사용자 질문에 답하기 위해 다음 도구를 활용해: ' +
          'search_similar_posts(게시판의 비슷한 코스 후기 검색), ' +
          'place_search(실제 장소의 위치·주소·좌표 검색). ' +
          '코스 추천 질문이면 search_similar_posts로 게시판 후기를 찾고, ' +
          '특정 장소가 어디인지·어떤 곳인지 물으면 place_search로 실제 정보를 찾아 활용해. ' +
          '두 도구를 함께 써도 좋아. ' +
          '답변에서 특정 장소(해수욕장·시장·명소 등)를 언급하거나 추천할 때는, ' +
          '그 장소를 place_search로 한 번씩 검색해 실제로 존재하는 정확한 이름으로 답해줘. ' +
          '이렇게 하면 사용자가 그 장소를 카카오맵에서 바로 찾아볼 수 있어. ' +
          '수집한 정보를 근거로 한국어로 친근하게 답하고, 게시판 코스를 참고했으면 자연스럽게 언급해. ' +
          '도구로 찾은 장소의 주소 같은 정보도 답변에 녹여줘. 모르면 솔직히 모른다고 말해.',
      },
      { role: 'user', content: question },
    ];

    let answer = '';

    for (let round = 0; round < MAX_ROUNDS; round += 1) {
      const message = await this.openai.chatWithTools(messages, TOOLS);
      messages.push(message);

      const toolCalls = message.tool_calls ?? [];

      // 도구 호출이 없으면 모델이 최종 답변을 낸 것 → 종료.
      if (toolCalls.length === 0) {
        answer = message.content ?? '';
        break;
      }

      for (const toolCall of toolCalls) {
        if (toolCall.type !== 'function') {
          continue;
        }
        const { name } = toolCall.function;
        const args = this.parseArgs(toolCall.function.arguments);
        const result = await this.runTool(
          name,
          args,
          collectedPosts,
          collectedPlaces,
        );
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
    }

    // 루프 안에 텍스트 답변을 못 받았으면 한 번 더 정리를 요청한다.
    if (!answer) {
      messages.push({
        role: 'user',
        content: '지금까지 찾은 정보로 질문에 대한 답변을 한국어로 정리해 줘.',
      });
      const final = await this.openai.chatWithTools(messages, TOOLS);
      answer = final.content ?? '죄송해요, 답변을 정리하지 못했어요. 다시 질문해 주세요.';
    }

    return {
      answer,
      sources: [...collectedPosts.values()],
      places: collectedPlaces,
    };
  }

  // 도구 이름에 맞는 동작을 실행하고, 결과를 수집 컨테이너에 모은다.
  private async runTool(
    name: string,
    args: Record<string, unknown>,
    collectedPosts: Map<string, SimilarPost>,
    collectedPlaces: PlaceResult[],
  ): Promise<unknown> {
    try {
      if (name === 'search_similar_posts') {
        const query = String(args.query ?? '');
        const posts = await this.rag.searchByQuery(query, 4);
        posts.forEach((p) => collectedPosts.set(p.id, p));
        // thumbnailUrl(base64)은 토큰을 폭증시키므로 제외하고 본문도 줄인다.
        return posts.map((p) => ({
          title: p.title,
          city: p.city,
          duration: p.duration,
          summary: p.content.slice(0, 300),
        }));
      }
      if (name === 'place_search') {
        const query = String(args.query ?? '');
        const places = await this.mcp.searchPlaces(query, 5);
        // 같은 이름의 장소가 중복 수집되지 않도록 추가한다.
        for (const place of places) {
          if (!collectedPlaces.some((p) => p.name === place.name)) {
            collectedPlaces.push(place);
          }
        }
        return places.map((p) => ({
          name: p.name,
          category: p.category,
          address: p.address,
          lat: p.lat,
          lng: p.lng,
        }));
      }
    } catch (err) {
      this.logger.warn(
        `도구 ${name} 실행 실패: ${err instanceof Error ? err.message : err}`,
      );
      return { error: '도구 실행에 실패했습니다.' };
    }
    return { error: `알 수 없는 도구: ${name}` };
  }

  // 모델이 준 JSON 문자열 인자를 안전하게 파싱한다.
  private parseArgs(raw: string): Record<string, unknown> {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}
