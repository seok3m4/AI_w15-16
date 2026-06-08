# AGENTS.md

## Project

Baseball AI Board는 RAG, MCP, AI Agent를 활용한 AI 야구 브리핑 게시판입니다.

사용자는 야구 경기 리뷰, 선수 분석, 팀 이슈, 뉴스 브리핑 게시글을 작성하고 댓글, 태그, 검색, 페이지네이션을 통해 게시판을 사용할 수 있습니다. AI 기능은 유사 야구 게시글 추천, 야구 뉴스/외부 URL 브리핑, 경기 리뷰 작성 보조를 목표로 합니다.

## Learning Direction

이 프로젝트는 단순히 완성된 코드를 만드는 것보다, 사용자가 프론트엔드, 백엔드, 데이터베이스, AI 응용 기능의 흐름을 직접 이해하는 것을 중요하게 둡니다.

작업할 때는 다음 원칙을 지킵니다.

- 한 번에 큰 기능을 만들지 않고 작은 단위로 나누어 구현합니다.
- 각 작업의 목적, 변경 파일, 검증 방법을 간단히 설명합니다.
- 사용자가 명확히 요청하기 전에는 대규모 구조 변경을 하지 않습니다.
- 인증, DB, RAG, MCP, Agent처럼 중요한 기능은 구현 전에 설계 의도를 먼저 설명합니다.
- Android 개발자로 확장할 수 있도록 API는 가능한 한 명확한 REST 흐름으로 설계합니다.
- AI가 만든 코드는 항상 lint/build/test 같은 검증 단계를 거칩니다.

## Tech Stack

- Frontend: React + Next.js
- Backend: Next.js API Routes / Server Actions
- Language: TypeScript
- Styling: Tailwind CSS
- Database: PostgreSQL
- ORM: Prisma
- Vector DB: PostgreSQL + pgvector
- RAG Framework: LangChain.js
- LLM / Embedding: OpenAI API
- MCP: Node.js 기반 JSON-RPC 서버
- Agent: Function Calling 기반 직접 구현
- Auth: JWT + HttpOnly Cookie

## Commit Convention

Conventional Commits 형식을 사용합니다.

- `feat`: 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 수정
- `chore`: 설정, 환경, 빌드 관련 작업
- `refactor`: 동작 변경 없는 구조 개선
- `style`: UI/CSS 또는 포맷 수정
- `test`: 테스트 추가 또는 수정

작업 후에는 항상 추천 커밋 메시지를 제안합니다.

예시:

```bash
git commit -m "chore: Next.js 프로젝트 초기 세팅"
git commit -m "feat: 게시글 CRUD API 구현"
git commit -m "docs: AI 기능 아키텍처 정리"
```

## Development Commands

PowerShell에서는 `npm` 대신 `npm.cmd`를 사용합니다.

```bash
npm.cmd run dev
npm.cmd run lint
npm.cmd run build
npm.cmd audit --audit-level=moderate
```

개발 서버 URL:

```text
http://localhost:3000
```

## Implementation Order

권장 구현 순서는 다음과 같습니다.

1. Next.js 프로젝트 초기 세팅
2. PostgreSQL / Prisma 설정
3. 데이터 모델 설계
4. 회원가입 / 로그인 구현
5. 게시글 CRUD 구현
6. 댓글 기능 구현
7. 태그 기능 구현
8. 검색 / 페이지네이션 구현
9. RAG 유사 야구 게시글 추천 구현
10. MCP 야구 뉴스/URL 브리핑 구현
11. Agent 경기 리뷰 작성 도우미 구현
12. README / 데모 / 회고 정리

## MVP Requirements

### Basic Board

- 회원가입 / 로그인
- 게시글 작성, 조회, 수정, 삭제
- 댓글
- 태그
- 검색
- 페이지네이션

### AI Features

- RAG: 기존 야구 게시글 기반 유사 게시글 추천 및 요약
- MCP: 야구 뉴스 검색 또는 외부 URL 브리핑
- Agent: 사용자의 경기 메모를 기반으로 태그 추천, 유사 글 검색, 브리핑 조회, 경기 리뷰 초안 생성

## AI Feature Notes

### RAG

LangChain.js를 사용해 게시글 데이터를 검색 가능한 지식 소스로 연결합니다.

흐름:

```text
게시글 작성/수정
→ OpenAI Embedding 생성
→ PostgreSQL pgvector 저장
→ 유사 게시글 검색
→ 검색 결과를 LLM context로 전달
→ 유사 게시글 요약 생성
```

### MCP

MCP 서버는 JSON-RPC 기반으로 구현합니다.

KBO 공식 경기 데이터 API가 명확하지 않으므로 비공식 KBO API에 의존하지 않습니다. MVP에서는 야구 뉴스 검색 또는 사용자가 입력한 외부 URL 브리핑을 중심으로 구현합니다.

### Agent

Agent는 단순 LLM 호출이 아니라 도구 선택과 실행 결과 반영을 반복하는 구조로 구현합니다.

고려 사항:

- Function Calling 사용
- 실행 상태 저장
- 최대 반복 횟수 제한
- 같은 도구 반복 호출 방지
- 도구 실패 시 fallback 응답 제공
