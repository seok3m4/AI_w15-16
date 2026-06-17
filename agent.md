# AI Agent 구현 설계 (9단계)

## 목표
사용자가 여행지/기간/키워드를 입력하면 Agent가 장소 검색 MCP tool과 RAG 검색을 스스로 선택·호출해서 여행 코스 초안(경유지 좌표 포함)을 생성한다.

## 핵심 원칙
LangGraph 대신 **OpenAI function calling 직접 루프**를 사용한다.
`while (tool_calls exist) { call tool → append result → re-call LLM }` 구조가 학습 효과도 더 직관적이고 2주 일정에 현실적이다.

---

## 아키텍처

```
React UI
  ↓ POST /agent/travel-plan
NestJS AgentService
  ├── OpenAI Chat Completions (function calling)
  │     tools: [place_search, search_similar_posts, generate_tags]
  ├── MCP Client → apps/mcp-server
  │     tool: place.search (Kakao 장소 검색)
  └── RAG SearchService
        pgvector similarity search
```

---

## Agent가 사용하는 Tool 목록

### 1. `place_search`
```json
{
  "name": "place_search",
  "description": "장소 이름을 받아 좌표(lat/lng)와 주소를 반환한다. Agent가 추천한 코스 경유지를 지도에 표시할 좌표로 변환할 때 쓴다.",
  "parameters": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "검색할 장소 이름 (예: 성산일출봉)" }
    },
    "required": ["query"]
  }
}
```
구현: NestJS → MCP Client → `apps/mcp-server` → Kakao 장소 검색 API
(날씨 대신 채택 — Agent가 코스 초안을 만들면서 각 장소의 좌표를 자동으로 채워 지도에 바로 표시할 수 있게 한다.)

### 2. `search_similar_posts`
```json
{
  "name": "search_similar_posts",
  "description": "기존 여행 후기 중 유사한 코스를 벡터 검색으로 찾는다.",
  "parameters": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "검색할 여행 키워드 또는 설명" },
      "limit": { "type": "number", "description": "가져올 결과 수 (기본 3)" }
    },
    "required": ["query"]
  }
}
```
구현: NestJS → RAG SearchService → pgvector cosine similarity

### 3. `generate_tags`
```json
{
  "name": "generate_tags",
  "description": "여행 코스 내용을 분석해서 태그 목록을 추천한다.",
  "parameters": {
    "type": "object",
    "properties": {
      "content": { "type": "string", "description": "태그를 뽑을 게시글 내용" }
    },
    "required": ["content"]
  }
}
```
구현: NestJS → OpenAI Chat (structured output)

---

## Agent 루프 구현 (NestJS AgentService)

```typescript
// apps/api/src/agent/agent.service.ts 에 구현 예정

async generateTravelPlan(input: TravelPlanInput): Promise<AgentResult> {
  const messages = [systemPrompt, userMessage(input)];
  const tools = [placeSearchTool, searchPostsTool, generateTagsTool];
  const MAX_TOOL_CALLS = 5; // 무한 루프 방지
  let callCount = 0;

  while (callCount < MAX_TOOL_CALLS) {
    const response = await openai.chat.completions.create({
      model: 'claude-sonnet-4-6', // 또는 gpt-4o
      messages,
      tools,
    });

    const choice = response.choices[0];

    // tool_calls 없으면 최종 답변
    if (choice.finish_reason === 'stop') {
      return { draft: choice.message.content, tags: extractedTags };
    }

    // tool 실행 후 결과를 messages에 추가
    for (const call of choice.message.tool_calls) {
      const result = await this.executeTool(call);
      messages.push({ role: 'tool', tool_call_id: call.id, content: result });
    }

    callCount++;
  }

  // 최대 횟수 초과 시 fallback
  return { draft: '여행 코스 초안을 생성하지 못했습니다. 다시 시도해주세요.', tags: [] };
}
```

---

## System Prompt

```
당신은 여행 코스 초안 작성 전문가입니다.
사용자가 여행지, 기간, 키워드를 알려주면:
1. search_similar_posts tool로 유사한 기존 여행 후기를 참고한다.
2. 참고한 정보를 바탕으로 하루 단위 여행 코스 초안을 작성한다.
3. 코스에 넣은 각 장소는 place_search tool로 좌표를 확인해 지도에 표시할 수 있게 한다.
4. generate_tags tool로 어울리는 태그를 추천한다.

응답은 한국어로 작성한다. 확인되지 않은 정보는 단정하지 말고 "~일 수 있습니다" 형태로 표현한다.
```

---

## API 엔드포인트

```
POST /agent/travel-plan
Authorization: Bearer <JWT>

Request:
{
  "city": "교토",
  "country": "일본",
  "duration": 3,
  "keywords": ["사찰", "단풍", "료칸"]
}

Response:
{
  "draft": "## 3일 교토 코스\n\n**1일차**: ...",
  "tags": ["일본", "교토", "사찰", "단풍"],
  "usedTools": ["place_search", "search_similar_posts"],
  "places": [{ "name": "기요미즈데라", "lat": 34.9949, "lng": 135.7851, "order": 0 }]
}
```

---

## 안전장치

| 항목 | 내용 |
|------|------|
| 최대 tool 호출 수 | 5회 초과 시 fallback 반환 |
| API timeout | OpenAI 30초, Kakao 장소 검색 5초 |
| 외부 API 실패 | tool 결과에 에러 메시지 포함 후 LLM이 계속 진행 |
| 사용자 최종 검토 | Agent 결과를 바로 저장하지 않고 React에서 사용자가 확인 후 게시글 작성 |

---

## React UI 흐름

```
PostFormPage (게시글 작성 화면)
  └── "AI 초안 생성" 버튼
        ↓ city, duration, keywords 입력 모달
        ↓ POST /agent/travel-plan
        ↓ 로딩 스피너
        ↓ 결과를 title/content/tags 필드에 자동 채움
        → 사용자가 검토 후 직접 수정 → 게시
```

---

## 구현 파일 위치 (예정)

```
apps/api/src/
  agent/
    agent.module.ts
    agent.controller.ts   # POST /agent/travel-plan
    agent.service.ts      # 메인 루프
    tools/
      place-search.tool.ts # MCP client 호출 (Kakao 장소 검색)
      search.tool.ts      # RAG SearchService 호출
      tags.tool.ts        # OpenAI structured output
    dto/
      travel-plan.dto.ts

apps/mcp-server/          # 7단계에서 별도 생성
  src/
    index.ts              # MCP server entry (stdio transport)
    tools/
      place-search.ts     # Kakao 장소 검색 호출

apps/web/src/
  AgentModal.tsx          # AI 초안 생성 모달
```

---

## 의존 단계
- 6단계(지도/장소) 완료 후 → 7단계(MCP) 구현 → 8단계(RAG) 구현 → 9단계(Agent) 구현
- Agent는 MCP와 RAG가 모두 있어야 제대로 동작한다.
