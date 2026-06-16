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

// 📌 Agent가 외부 장소 검색어를 만들 때 질문 속 지역 표현을 표준 도시명으로 바꾸기 위한 목록.
const CITY_ALIASES: Record<string, string[]> = {
  제주: ['제주', '제주도', '제주시', '서귀포', '서귀포시'],
  서울: ['서울', '서울시'],
  부산: ['부산', '부산시'],
  강릉: ['강릉', '강릉시'],
  경주: ['경주', '경주시'],
  전주: ['전주', '전주시'],
};

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
            description:
              '검색어. 사용자의 질문을 거의 그대로, 충분히 구체적인 문장으로 넣어라. ' +
              '두세 단어로 너무 짧게 줄이면 검색이 안 되니, 질문의 표현을 살려서 길게 검색해라. ' +
              '(예: "혼자 조용히 힐링하기 좋은 여행 코스", "부산에서 바다와 맛집 즐기는 코스")',
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
            description:
              '검색할 장소 이름 (예: 광안리 해수욕장, 전주 한옥마을)',
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
          '너는 "정글 여행" 게시판의 AI 도우미야. 이 게시판에 실제로 올라온 코스 후기를 근거로만 답하는 것이 가장 중요해. ' +
          '사용 가능한 도구: ' +
          'search_similar_posts(게시판에 올라온 여행 코스 후기 검색), ' +
          'place_search(실제 장소의 위치·주소·좌표 검색). ' +
          '\n\n[답변 규칙]\n' +
          '1. 코스나 여행을 묻는 질문이면 반드시 먼저 search_similar_posts를 호출해서 게시판 코스를 찾아라. ' +
          '2. search_similar_posts가 코스를 하나라도 반환하면, 그 코스들이 질문과 관련 있다고 믿고 반드시 활용해라. 가장 잘 맞는 코스를 골라 제목·도시·경유지·후기 내용을 근거로 소개해라. 반환된 코스를 "딱 맞지 않다"며 버리지 마라. ' +
          '코스를 추천할 때는 일차별 경유지 흐름을 우선 설명하고, 같은 날에는 가까운 권역끼리 묶인다는 점을 보여줘라. 동선이 불필요하게 길어 보이면 무리한 이동이라고 솔직하게 말하고 더 자연스러운 순서를 제안해라. ' +
          '단, 후기 본문을 그대로 베껴 쓰지 말고, 사용자가 물어본 핵심(예: 바다·맛집)에 초점을 맞춰 그 부분 위주로 정리해라. ' +
          '사용자가 교통·이동을 직접 묻지 않았다면, 교통수단이나 이동 편의(지하철·버스·차·뚜벅이 등)에 대한 내용은 답변에 절대 넣지 마라. ' +
          '3. search_similar_posts가 아무 코스도 반환하지 않으면 거기서 끝내지 말고, place_search를 호출해서 외부 장소 후보를 찾아라. 이때 답변에는 "게시판 코스가 아니라 외부 장소 검색을 참고했다"는 점을 분명히 밝혀라. ' +
          '4. 답변에서 장소(해수욕장·시장·명소 등)를 언급할 때는 place_search로 확인해 정확한 이름으로 적어라(사용자가 카카오맵에서 찾을 수 있게). ' +
          '5. 특정 장소가 어디인지/어떤 곳인지만 묻는 질문이면 place_search로 답해라. ' +
          '\n한국어로 친근하지만 간결하게 답해. 마크다운 제목(#)이나 굵게(**)는 쓰지 말고 자연스러운 문장과 줄바꿈으로 써.',
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

    // 모델이 게시판 0건 상황에서 place_search를 호출하지 못했을 때 코드가 한 번 더 외부 검색을 보완한다.
    if (collectedPosts.size === 0 && collectedPlaces.length === 0) {
      const places = await this.collectExternalFallbackPlaces(
        question,
        collectedPlaces,
      );

      if (places.length > 0) {
        answer = await this.buildExternalFallbackAnswer(question, places);
      }
    }

    // 루프 안에 텍스트 답변을 못 받았으면 한 번 더 정리를 요청한다.
    if (!answer) {
      messages.push({
        role: 'user',
        content: '지금까지 찾은 정보로 질문에 대한 답변을 한국어로 정리해 줘.',
      });
      const final = await this.openai.chatWithTools(messages, TOOLS);
      answer =
        final.content ??
        '죄송해요, 답변을 정리하지 못했어요. 다시 질문해 주세요.';
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
        this.logger.log(
          `search_similar_posts("${query}") → ${posts.length}건: ${posts
            .map((p) => p.title)
            .join(', ')}`,
        );
        posts.forEach((p) => collectedPosts.set(p.id, p));
        if (posts.length === 0) {
          return {
            posts: [],
            nextAction:
              '게시판 검색 결과가 없습니다. place_search를 호출해서 외부 장소 후보를 찾고, 답변에는 외부 검색 참고 정보라고 밝혀 주세요.',
          };
        }
        // thumbnailUrl(base64)은 토큰을 폭증시키므로 제외하고 본문도 줄인다.
        return posts.map((p) => ({
          title: p.title,
          city: p.city,
          duration: p.duration,
          route: this.formatPostRoute(p),
          summary: p.content.slice(0, 600),
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

  // 검색된 게시글의 경유지를 Agent가 읽기 쉬운 일차별 문자열로 바꾼다.
  private formatPostRoute(post: SimilarPost): string[] {
    const groups = new Map<number, string[]>();

    for (const place of post.places) {
      groups.set(place.day, [...(groups.get(place.day) ?? []), place.name]);
    }

    return [...groups.entries()]
      .sort(([a], [b]) => a - b)
      .map(([day, names]) => `${day}일차: ${names.join(' → ')}`);
  }

  // 게시판에 관련 코스가 없을 때 MCP 장소 검색으로 외부 후보를 보강한다.
  private async collectExternalFallbackPlaces(
    question: string,
    collectedPlaces: PlaceResult[],
  ): Promise<PlaceResult[]> {
    const queries = this.buildFallbackPlaceQueries(question);

    for (const query of queries) {
      try {
        const places = await this.mcp.searchPlaces(query, 5);
        for (const place of places) {
          if (!collectedPlaces.some((p) => p.name === place.name)) {
            collectedPlaces.push(place);
          }
        }
      } catch (err) {
        this.logger.warn(
          `외부 장소 fallback 검색 실패("${query}"): ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }

    return collectedPlaces;
  }

  // 질문의 지역·테마를 보고 Kakao 장소 검색에 넣을 구체적인 검색어를 만든다.
  private buildFallbackPlaceQueries(question: string): string[] {
    const city = this.extractCity(question);

    if (!city) {
      return [question];
    }

    if (this.isFamilyQuestion(question)) {
      return [
        `${city} 가족 여행`,
        `${city} 아이와 가볼만한 곳`,
        `${city} 실내 관광지`,
      ];
    }

    return [`${city} 여행 명소`, `${city} 맛집`, `${city} 카페`];
  }

  // 사용자의 자연어 질문에서 여행지를 뽑는다.
  private extractCity(question: string): string | null {
    for (const [city, aliases] of Object.entries(CITY_ALIASES)) {
      if (aliases.some((alias) => question.includes(alias))) {
        return city;
      }
    }

    return null;
  }

  // 가족 여행 질문이면 장소 검색어를 가족/아이 친화적으로 만든다.
  private isFamilyQuestion(question: string): boolean {
    return ['가족', '아이', '부모님', '엄마', '아빠'].some((keyword) =>
      question.includes(keyword),
    );
  }

  // 외부 장소 검색 결과만 있을 때, 게시판 출처와 외부 참고 정보를 구분해서 답변을 생성한다.
  private async buildExternalFallbackAnswer(
    question: string,
    places: PlaceResult[],
  ): Promise<string> {
    const placeContext = places
      .slice(0, 8)
      .map(
        (place, index) =>
          `[${index + 1}] ${place.name} / ${place.category} / ${place.address}`,
      )
      .join('\n');

    return this.openai.chat(
      '너는 여행 코스 공유 게시판의 AI 도우미야. 게시판에서 관련 코스를 찾지 못한 상황이므로, 아래 외부 장소 검색 결과만 참고해서 답해. ' +
        '답변 첫 부분에 게시판 코스가 아니라 외부 장소 검색을 참고했다는 점을 밝혀. ' +
        '장소 이름은 검색 결과에 있는 이름만 사용하고, 없는 세부 정보는 지어내지 마. 한국어로 간결하게 답해.',
      `사용자 질문: ${question}\n\n외부 장소 검색 결과:\n${placeContext}`,
    );
  }
}
