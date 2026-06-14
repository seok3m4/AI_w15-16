# Board PostgreSQL RAG Schema

## Where It Appears

- `backend/pom.xml`
- `backend/src/main/resources/application.properties`
- `backend/src/main/resources/application-test.properties`
- `backend/src/main/resources/db/migration/V1__create_board_and_rag_schema.sql`
- `backend/src/main/java/com/junglecamp/backend/board/`
- `backend/src/main/java/com/junglecamp/backend/controller/BoardPostController.java`
- `front/src/api/posts.ts`
- `front/src/pages/HomePage.tsx`
- `study/postgresql-rds-rag.md`
- `study/board-crud-api.md`

## What Was Applied

- 게시글, 댓글, 태그는 정규화된 관계형 테이블로 설계했다.
- PostgreSQL 연결은 `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` 환경 변수로 바꿀 수 있게 했다.
- 로컬 개발과 RDS 운영은 같은 Flyway migration을 사용하고, RDS 전환 시 앱 코드가 아니라 datasource 값만 바꾸는 구조로 잡았다.
- RAG 확장을 위해 `rag_documents`, `rag_chunks`, `rag_index_jobs` 테이블을 별도로 만들었다.
- `rag_chunks.embedding`은 `pgvector`의 `vector(1536)` 타입을 사용하도록 설계했다.
- 테스트는 H2와 `test` profile을 사용하고 Flyway를 끈다. 운영 schema 검증은 PostgreSQL/Flyway가 담당한다.

## Why It Matters

- 태그를 문자열 컬럼 하나에 저장하지 않고 별도 테이블과 join table로 분리하면 검색과 중복 제거가 안정적이다.
- 게시판 검색은 키워드 검색으로 먼저 제공하고, RAG 검색은 같은 게시글 데이터를 chunk 단위로 색인하는 방식으로 확장할 수 있다.
- RDS는 애플리케이션 입장에서 PostgreSQL endpoint만 바뀌는 배포 대상이므로, 환경 변수 기반 datasource 설정이 가장 단순하다.

## Verification

- `mvn -Dtest=ApiIntegrationTests test`: 7 tests, failures 0, errors 0.
- `mvn test`: 11 tests, failures 0, errors 0, skipped 0.
- `npm run lint`: exit code 0.
- `npm run build`: exit code 0. Vite chunk size warning remains.
- `Invoke-WebRequest http://localhost:8080/api/posts`: HTTP 200.
- `Invoke-WebRequest http://127.0.0.1:5173/api/posts`: HTTP 200 through the frontend dev proxy.

## Pitfalls And Follow-Ups

- RDS PostgreSQL 버전이 `pgvector`를 지원해야 한다.
- ECS task security group에서 RDS security group으로 5432 접근이 허용되어야 한다.
- 실제 embedding dimension은 사용할 모델에 맞춰야 한다. 현재 schema는 `vector(1536)` 기준이다.
- 운영에서는 `spring.jpa.hibernate.ddl-auto=validate`를 유지하고 schema 변경은 Flyway migration으로 관리한다.
- RAG 색인과 embedding 생성은 아직 구현하지 않았다. 현재는 DB schema와 확장 경로만 준비했다.
