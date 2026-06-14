# Board CRUD, PostgreSQL, RAG Work Log

## Request Date And Time

- 2026-06-12 Asia/Seoul

## Objective

- 게시글 CRUD, 댓글, 태그, 검색 화면을 구성한다.
- PostgreSQL을 기준 DB로 설계하고, 나중에 RDS endpoint로 전환하기 쉽게 환경 변수 기반 datasource 설정을 추가한다.
- RAG 확장을 위해 pgvector 기반 document/chunk/index job schema를 준비한다.
- 학습용 markdown을 `study/` 폴더에 정리한다.
- 프롬프트 원문은 저장하지 않는다.

## Changed Files

- `backend/pom.xml`
- `backend/src/main/resources/application.properties`
- `backend/src/main/resources/application-test.properties`
- `backend/src/main/resources/db/migration/V1__create_board_and_rag_schema.sql`
- `backend/src/main/java/com/junglecamp/backend/board/BoardPost.java`
- `backend/src/main/java/com/junglecamp/backend/board/BoardComment.java`
- `backend/src/main/java/com/junglecamp/backend/board/BoardTag.java`
- `backend/src/main/java/com/junglecamp/backend/board/BoardPostRepository.java`
- `backend/src/main/java/com/junglecamp/backend/board/BoardCommentRepository.java`
- `backend/src/main/java/com/junglecamp/backend/board/BoardTagRepository.java`
- `backend/src/main/java/com/junglecamp/backend/board/BoardPostDtos.java`
- `backend/src/main/java/com/junglecamp/backend/board/BoardPostService.java`
- `backend/src/main/java/com/junglecamp/backend/controller/BoardPostController.java`
- `backend/src/main/java/com/junglecamp/backend/config/SecurityConfig.java`
- `backend/src/test/java/com/junglecamp/backend/ApiIntegrationTests.java`
- `backend/src/test/java/com/junglecamp/backend/BackendApplicationTests.java`
- `backend/src/test/java/com/junglecamp/backend/LoginSecurityTests.java`
- `front/src/api/posts.ts`
- `front/src/pages/HomePage.tsx`
- `front/src/pages/HomePage.css`
- `docs/superpowers/specs/2026-06-12-board-crud-rag-postgresql-design.md`
- `docs/superpowers/plans/2026-06-12-board-crud-rag-postgresql.md`
- `docs/concepts/board-rag-postgresql.md`
- `study/postgresql-rds-rag.md`
- `study/board-crud-api.md`

## Key Implementation Decisions

- Spring Data JPA를 사용해 게시글, 댓글, 태그 관계를 엔티티로 모델링했다.
- 게시글 read/search/tag list는 공개하고, create/update/delete/comment write는 인증을 요구한다.
- `/api/**`는 JSON API 호출 편의를 위해 CSRF를 무시하도록 했다.
- 태그는 trim, lowercase, duplicate removal 후 저장한다.
- PostgreSQL schema는 Flyway SQL migration으로 관리한다.
- 테스트는 H2 기반 `test` profile을 사용하고 Flyway를 비활성화해 빠르게 검증한다.
- 프론트엔드는 기존 연결 상태 화면을 게시판 작업 화면으로 교체했다.
- `study/`에는 PostgreSQL/RDS/pgvector/RAG와 게시판 API 설계 노트를 분리했다.

## Verification

- `mvn -Dtest=ApiIntegrationTests test`: first run failed as expected before implementation; final run passed with 7 tests, failures 0, errors 0.
- `mvn test`: passed with 11 tests, failures 0, errors 0, skipped 0.
- `npm run lint`: exit code 0.
- `npm run build`: exit code 0. Vite chunk size warning remains.
- `git diff --check`: exit code 0. Git reported LF-to-CRLF normalization warnings only.
- `Invoke-WebRequest http://localhost:8080/api/posts`: HTTP 200 with `[]`.
- `Invoke-WebRequest http://127.0.0.1:5173/`: HTTP 200.
- `Invoke-WebRequest http://127.0.0.1:5173/api/posts`: HTTP 200 with `[]`.

## Remaining Issues Or Follow-Up Work

- 실제 PostgreSQL 또는 RDS 연결 smoke test는 DB 인스턴스가 준비된 뒤 진행해야 한다.
- RAG embedding 생성, chunking job, semantic search API는 아직 구현하지 않았다.
- 운영용 사용자/권한 모델은 현재 인메모리 로그인 이후 작업으로 남아 있다.
- Browser plugin 화면 검증은 로컬 Node 런타임이 v22.17.0이고 플러그인 요구 버전이 v22.22.0 이상이라 실행하지 못했다.
