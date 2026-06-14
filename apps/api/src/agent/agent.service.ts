// 📌 AI Agent. OpenAI function calling 루프로 여행 코스 초안을 자동 생성한다.
// 사용자의 자유 요청을 받아 →
//   1) place_search(MCP/Kakao)로 실제 장소의 좌표를 찾고
//   2) search_similar_posts(RAG)로 기존 인기 코스를 참고한 뒤
//   3) build_course 도구로 완성된 코스 초안(JSON)을 제출하게 한다.
import { Injectable, Logger } from '@nestjs/common';
import type OpenAI from 'openai';
import { McpService } from '../mcp/mcp.service';
import { OpenAiService } from '../rag/openai.service';
import { RagService } from '../rag/rag.service';

// Agent가 최종적으로 만들어내는 코스 초안. 프론트 작성 폼에 그대로 채울 수 있다.
export type CourseDraft = {
  title: string;
  city: string;
  duration: number | null;
  content: string;
  tags: string[];
  places: {
    name: string;
    address?: string;
    lat: number;
    lng: number;
  }[];
};

// 무한 루프를 막기 위한 도구 호출 라운드 상한.
const MAX_ROUNDS = 6;

// 모델에게 제공하는 도구 정의.
const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'place_search',
      description:
        '키워드로 국내 실제 장소를 검색해 이름·주소·위도(lat)·경도(lng)를 얻는다. 코스 경유지의 좌표는 반드시 이 도구로 확인한다.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '검색할 장소 이름 (예: 해운대 해수욕장, 광안리)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_similar_posts',
      description:
        '게시판에 이미 올라온 비슷한 여행 코스 후기를 의미 기반으로 검색한다. 코스를 구성할 때 참고한다.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '찾고 싶은 여행 분위기나 주제 (예: 부산 바다 맛집 코스)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'build_course',
      description:
        '수집한 정보로 완성된 여행 코스 초안을 제출한다. 이 도구를 호출하면 작업이 끝난다. places의 lat/lng는 반드시 place_search로 얻은 실제 좌표를 사용한다.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '코스 제목' },
          city: { type: 'string', description: '주요 여행 도시 (예: 부산)' },
          duration: {
            type: 'number',
            description: '여행 일수 (예: 2)',
          },
          content: {
            type: 'string',
            description: '코스 소개 본문. 동선과 추천 이유를 자연스럽게 설명.',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: '코스를 설명하는 태그 3~5개',
          },
          places: {
            type: 'array',
            description: '코스 경유지 목록 (방문 순서대로, 최소 3곳)',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                address: { type: 'string' },
                lat: { type: 'number' },
                lng: { type: 'number' },
              },
              required: ['name', 'lat', 'lng'],
            },
          },
        },
        required: ['title', 'city', 'content', 'tags', 'places'],
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

  // 사용자 요청을 받아 코스 초안을 생성한다.
  async draftCourse(request: string): Promise<CourseDraft> {
    if (!this.openai.enabled) {
      throw new Error(
        'OPENAI_API_KEY가 설정되지 않아 AI 코스 생성 기능을 사용할 수 없습니다.',
      );
    }

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content:
          '너는 국내 여행 코스를 짜주는 전문 플래너야. ' +
          '사용자의 요청을 받아 실제로 존재하는 장소들로 동선이 자연스러운 코스를 만든다. ' +
          '경유지의 좌표(lat/lng)는 반드시 place_search 도구로 실제 값을 확인해서 사용하고, 추측하지 마. ' +
          '먼저 search_similar_posts로 기존 코스를 참고하면 더 좋아. ' +
          '경유지는 최소 3곳 이상 포함하고, 모든 장소의 좌표를 확인한 뒤 build_course 도구로 최종 코스를 제출해. ' +
          '본문과 태그는 한국어로 작성해.',
      },
      { role: 'user', content: request },
    ];

    for (let round = 0; round < MAX_ROUNDS; round += 1) {
      const message = await this.openai.chatWithTools(messages, TOOLS);
      messages.push(message);

      const toolCalls = message.tool_calls ?? [];

      // 도구 호출이 없으면 모델이 더 진행하지 않겠다는 뜻 → 루프 종료.
      if (toolCalls.length === 0) {
        break;
      }

      for (const toolCall of toolCalls) {
        if (toolCall.type !== 'function') {
          continue;
        }

        const { name } = toolCall.function;
        const args = this.parseArgs(toolCall.function.arguments);

        // build_course가 호출되면 그 인자가 곧 최종 코스 초안이다.
        if (name === 'build_course') {
          return this.normalizeDraft(args);
        }

        // 그 외 도구는 실행하고 결과를 대화에 다시 넣는다.
        const result = await this.runTool(name, args);
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
    }

    // 라운드 안에 build_course를 못 받으면 마지막으로 한 번 더 강제로 요청한다.
    return this.forceBuild(messages);
  }

  // 도구 이름에 맞는 실제 동작을 실행한다.
  private async runTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    try {
      if (name === 'place_search') {
        const query = String(args.query ?? '');
        const places = await this.mcp.searchPlaces(query, 5);
        // 모델에 필요한 필드만 추린다. (url 등 불필요한 값 제외)
        return places.map((p) => ({
          name: p.name,
          category: p.category,
          address: p.address,
          lat: p.lat,
          lng: p.lng,
        }));
      }
      if (name === 'search_similar_posts') {
        const query = String(args.query ?? '');
        const posts = await this.rag.searchByQuery(query, 4);
        // thumbnailUrl(base64)은 토큰을 폭증시키므로 제외하고 본문도 적당히 줄인다.
        return posts.map((p) => ({
          title: p.title,
          city: p.city,
          duration: p.duration,
          summary: p.content.slice(0, 300),
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

  // build_course를 끝내 호출하지 않은 경우, tool_choice를 강제해 한 번 더 요청한다.
  private async forceBuild(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  ): Promise<CourseDraft> {
    messages.push({
      role: 'user',
      content:
        '지금까지 수집한 정보로 build_course 도구를 호출해서 코스를 완성해 줘.',
    });

    const message = await this.openai.chatWithTools(messages, TOOLS);
    const buildCall = (message.tool_calls ?? []).find(
      (call) => call.type === 'function' && call.function.name === 'build_course',
    );

    if (buildCall && buildCall.type === 'function') {
      return this.normalizeDraft(this.parseArgs(buildCall.function.arguments));
    }

    throw new Error('AI가 코스 초안을 만들지 못했습니다. 다시 시도해 주세요.');
  }

  // 모델이 준 JSON 문자열 인자를 안전하게 파싱한다.
  private parseArgs(raw: string): Record<string, unknown> {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  // build_course 인자를 CourseDraft 형태로 정리한다. (타입/누락 방어)
  private normalizeDraft(args: Record<string, unknown>): CourseDraft {
    const rawPlaces = Array.isArray(args.places) ? args.places : [];
    const places = rawPlaces
      .map((p) => {
        const place = p as Record<string, unknown>;
        return {
          name: String(place.name ?? ''),
          address: place.address ? String(place.address) : undefined,
          lat: Number(place.lat),
          lng: Number(place.lng),
        };
      })
      // 좌표가 유효한 경유지만 남긴다.
      .filter((p) => p.name && Number.isFinite(p.lat) && Number.isFinite(p.lng));

    const rawTags = Array.isArray(args.tags) ? args.tags : [];
    const tags = rawTags.map((t) => String(t)).filter(Boolean);

    const durationNum = Number(args.duration);

    return {
      title: String(args.title ?? ''),
      city: String(args.city ?? ''),
      duration: Number.isFinite(durationNum) && durationNum > 0 ? durationNum : null,
      content: String(args.content ?? ''),
      tags,
      places,
    };
  }
}
