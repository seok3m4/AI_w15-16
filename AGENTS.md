# AGENTS.md

## 프로젝트 규범
- 이 저장소는 Memento의 텍스트 기반 Memory MVP를 설계/구현하기 위한 작업 공간이다.
- 변경 전 `README.md`와 `docs/*_MVP_TEXT_MEMORY.md`를 먼저 확인하고, 문서와 구현을 어긋나게 두지 않는다.
- 현재 MVP는 텍스트 게시글, 댓글, 태그, memory chunk/embedding, RAG 검색, Capsule, Agent, MCP를 중심으로 한다.
- 이미지 업로드, OCR, 이미지 캡션, 대규모 검색 인프라, 모바일 앱은 명시 전까지 범위 밖이다.
- 우선순위는 `P0 -> P1 -> P2 -> P3 -> P4` 순서를 따른다.
- P0: 인증, 게시글 CRUD, 댓글, 태그, 페이지/키워드 검색.
- P1: memory chunk, embedding, pgvector 기반 Memory Search.
- P2: AI 요약, 친구 관계/상호작용, 본인 범위 Context Capsule.
- P3: 친구 AI 동의 기반 기능, Agent Workflow, MCP Server/Client, Notion export.
- P4: 실행 이력, 승인 UI, 성능 보강, 배포 smoke, 문서 동기화.

## 아키텍처 경계
- Frontend는 React/Vite를 기본으로 하며 화면 상태와 사용자 흐름에 집중한다.
- Spring Boot는 공개 REST API, 인증, 권한, 소유권, 친구 관계, job 상태, DB write owner다.
- FastAPI는 embedding, RAG 요약, Agent graph, LLM/tool orchestration을 담당한다.
- PostgreSQL은 주 저장소이고, pgvector는 `memory_embeddings` 검색에 사용한다.
- FastAPI가 주요 영속 테이블을 직접 갱신하지 않도록 하고, 결과는 Spring Boot 경계를 통해 저장한다.
- 모든 내부 호출에는 `requestId`, `jobId`, idempotency key, timeout/retry 정책을 고려한다.

## 보안과 개인정보
- 사용자의 memory는 개인 기록으로 취급하고, 권한 검증을 우회하지 않는다.
- 친구 데이터는 accepted 관계와 친구 AI 공유 동의가 모두 확인될 때만 AI 근거로 사용한다.
- 친구 memory를 응답에 사용하면 출처 사용자와 근거 게시글 참조를 구조화해 남긴다.
- raw prompt, provider 응답 원문, token, API key, refresh token, secret, 민감 payload를 로그에 저장하지 않는다.
- 외부 쓰기 작업(Notion export 등)은 사용자 승인 이후에만 실행한다.
- MCP credential은 사용자 scope와 묶어 발급/폐기 가능해야 하며 원문 노출을 피한다.

## 작업 방식
- 사용자가 만든 변경을 되돌리지 말고, 관련 없는 dirty 파일은 건드리지 않는다.
- 새 코드는 기존 문서의 API path, 모델명, 책임 경계를 먼저 따르고 임의로 이름을 바꾸지 않는다.
- 문서가 깨져 보이면 인코딩을 추측해 덮어쓰지 말고 UTF-8 기준으로 확인한다.
- 기능을 추가하면 해당 요구사항 ID, API, 화면 흐름, 배포 문서 중 영향받는 문서를 함께 갱신한다.
- 작은 vertical slice로 구현하고, 각 단계의 완료 게이트를 통과한 뒤 다음 우선순위로 이동한다.
- 권한, 비동기 job, embedding 실패, timeout, retry, stale/deleted memory 처리는 테스트 우선으로 다룬다.
- 로컬 검증은 Track A Docker Compose 기준을 우선하고, AWS Track B는 Track A smoke 통과 후 진행한다.
- 완료 보고에는 바뀐 파일, 검증 명령, 남은 위험을 짧게 남긴다.
