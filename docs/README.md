# Docs Overview

이 디렉터리는 프로젝트 설계, 구현 계획, 작업 로그, 프롬프트 저장 규칙을 모아두는 문서 공간이다. 현재까지 반영된 내용은 프론트엔드 초기 설계, 백엔드-프론트 연동, 프롬프트 저장 동의 규칙, 실제 작업 로그다.

## 문서 구성

```text
docs/
+-- README.md
+-- prompt-workflow-hook.md
+-- prompt-history/
|   +-- 2026-06-05.md
+-- concepts/
|   +-- README.md
+-- work-logs/
|   +-- 2026-06-05-backend-frontend-integration.md
+-- superpowers/
    +-- plans/
    |   +-- 2026-06-05-front-ionic-react-capacitor.md
    +-- specs/
        +-- 2026-06-05-front-ionic-react-capacitor-design.md
```

## 현재까지 반영된 작업

### 1. 프론트엔드 초기 설계

문서:

- `docs/superpowers/specs/2026-06-05-front-ionic-react-capacitor-design.md`

반영 내용:

- React, TypeScript, Vite 기반 프론트엔드 구조를 설계했다.
- Ionic React를 앱 셸과 모바일 친화 UI 계층으로 선택했다.
- Capacitor를 추후 Android/iOS 확장용 래퍼로 설정하는 방향을 정리했다.
- 초기 범위에서는 백엔드 통합, 인증, 배포, 네이티브 플랫폼 생성은 제외했다.

### 2. 프론트엔드 구현 계획

문서:

- `docs/superpowers/plans/2026-06-05-front-ionic-react-capacitor.md`

반영 내용:

- `front/` 프로젝트 생성에 필요한 파일 구조를 계획했다.
- `package.json`, Vite, TypeScript, ESLint, Capacitor 설정 파일을 작업 단위로 나눴다.
- Ionic React 앱 셸, 라우팅, 홈 화면, 테마 파일 추가 절차를 정리했다.
- 설치, lint, build, dev server 실행 검증 절차를 포함했다.

### 3. 백엔드-프론트엔드 연동

문서:

- `docs/work-logs/2026-06-05-backend-frontend-integration.md`

반영 내용:

- Spring Boot 백엔드에 `/api/status`, `/api/me` JSON API를 추가했다.
- API 인증 실패는 HTML 로그인 리다이렉트가 아니라 `401 Unauthorized`를 반환하도록 웹 보안 체인과 API 보안 체인을 분리했다.
- Vite 개발 서버에서 `/api` 요청을 `http://localhost:8080`으로 프록시하도록 설정했다.
- Ionic React 홈 화면에서 백엔드 연결 상태와 인증 상태를 표시하도록 구성했다.
- 백엔드 테스트, 프론트 lint, 프론트 build 검증 결과를 기록했다.

검증 상태:

- Backend: `.\mvnw.cmd test` 통과
- Frontend: `npm run lint` 통과
- Frontend: `npm run build` 통과
- Vite build에서 큰 chunk 경고가 있었지만 빌드는 성공했다.

### 4. 프롬프트 저장 및 작업 요약 규칙

문서:

- `docs/prompt-workflow-hook.md`
- `AGENTS.md`

반영 내용:

- 매 프롬프트마다 원문 저장 여부를 사용자에게 먼저 묻는 규칙을 프로젝트 지침으로 정리했다.
- 사용자가 명시적으로 승인한 경우에만 `docs/prompt-history/`에 프롬프트 원문을 저장하도록 했다.
- 구현 작업 내용은 `docs/work-logs/`에 기술 작업 로그로 별도 정리하도록 했다.
- 실제 Codex `UserPromptSubmit` 훅으로 확장할 때의 예시 설정과 주의사항을 정리했다.

### 5. 프롬프트 기록

문서:

- `docs/prompt-history/2026-06-05.md`

반영 내용:

- 사용자가 저장을 승인한 프롬프트 원문과 동의 응답을 기록했다.
- 각 프롬프트별로 실제 수행 작업, 적용 파일, 검증 결과, 관련 문서를 함께 남긴다.
- 프롬프트 기록은 작업별 인덱스 역할을 하고, 긴 기술 설명은 `docs/work-logs/`에 분리해 관리한다.

### 6. 코드 개념 설명

문서:

- `docs/concepts/README.md`

반영 내용:

- 중요한 코드 작성 또는 변경 시 적용된 개념을 별도 문서로 정리하는 규칙을 둔다.
- 개념 문서에는 적용된 패턴, 사용 이유, 관련 파일, 검증 방법, 주의사항을 기록한다.
- 작업 로그가 "무엇을 했는지"를 설명한다면, 개념 문서는 "어떤 개념이 왜 적용되었는지"를 설명한다.

## 문서 사용 기준

- 설계 배경을 확인할 때는 `docs/superpowers/specs/`를 먼저 본다.
- 구현 절차와 작업 분해를 확인할 때는 `docs/superpowers/plans/`를 본다.
- 실제 수행한 작업, 변경 파일, 검증 결과를 확인할 때는 `docs/work-logs/`를 본다.
- 프롬프트 저장 동의 규칙과 훅 확장 방향은 `docs/prompt-workflow-hook.md`와 `AGENTS.md`를 함께 본다.
- 프롬프트 원문은 사용자가 승인한 경우에만 `docs/prompt-history/`에 저장한다.
- 프롬프트별로 실제 작업 내용과 적용 파일을 빠르게 확인하려면 `docs/prompt-history/`를 먼저 본다.
- 코드에 적용된 중요한 개념과 패턴을 확인하려면 `docs/concepts/`를 본다.

## 현재 문서화되지 않은 범위

- 게시판 CRUD 구현 상세
- 데이터베이스 연동 설계
- RAG, MCP, AI Agent 기능 상세 설계
- 실제 배포 환경 설정
- 프론트 자체 로그인 화면 구현
