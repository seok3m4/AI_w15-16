# AI_w15-16
팀원 : [고민석, 김규민, 김민철, 김석제, 박민석, 백승진]

## 프로젝트 구조

React + Spring Boot + PostgreSQL 기반 게시판 기본 골격입니다. RAG, AI Agent, MCP는 바로 구현하지 않고 `backend/src/main/java/com/week15/board/ai`와 `frontend/src/features/ai`에 확장용 인터페이스와 타입만 분리해 두었습니다.

```text
.
├── backend/              # Spring Boot REST API
├── frontend/             # Vite React TypeScript
├── docker-compose.yml    # PostgreSQL 개발 DB
└── .env.example          # 로컬 환경 변수 예시
```

## 실행 준비

- JDK 21
- Gradle 설치 불필요: Gradle Wrapper 사용
- Node.js 20.19+ 또는 22.12+
- Docker Desktop 또는 PostgreSQL 16+

> Windows에 JDK가 설치되어 있어도 WSL에서 실행하려면 WSL 안의 `java` 명령이 잡혀야 합니다. `java -version`이 실패하면 WSL에 JDK 21을 설치하거나 `JAVA_HOME`/`PATH`를 WSL 기준으로 설정해 주세요.

## PostgreSQL 실행

```bash
cp .env.example .env
docker compose up -d postgres
```

## 백엔드 실행

```bash
cd backend
./gradlew bootRun
```

Windows PowerShell에서는 다음 명령을 사용합니다.

```powershell
cd backend
.\gradlew.bat bootRun
```

기본 API 주소는 `http://localhost:8080/api`입니다.

## Docker 접근 문제

`docker info`에서 `/var/run/docker.sock permission denied`가 나오면 Docker CLI는 설치되어 있지만 현재 WSL 사용자가 Docker daemon에 접근하지 못하는 상태입니다.

- Docker Desktop을 실행합니다.
- Docker Desktop `Settings > Resources > WSL Integration`에서 현재 WSL 배포판을 켭니다.
- WSL 터미널을 완전히 다시 열고 `docker context use desktop-linux`를 실행합니다.
- 다시 `docker info`와 `docker compose up -d postgres`를 확인합니다.

## 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

프론트엔드는 `http://localhost:5173`에서 실행되고, Vite 프록시가 `/api` 요청을 백엔드로 전달합니다.

## 확장 지점

- 게시판 도메인: `backend/src/main/java/com/week15/board/post`
- RAG 포트: `backend/src/main/java/com/week15/board/ai/rag/RagService.java`
- Agent 포트: `backend/src/main/java/com/week15/board/ai/agent/AgentGateway.java`
- MCP 포트: `backend/src/main/java/com/week15/board/ai/mcp/McpClientGateway.java`
- AI 설정: `backend/src/main/resources/application.yml`의 `app.ai`
