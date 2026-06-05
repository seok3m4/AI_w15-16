# Backend Frontend Integration Work Log

## 목표

Spring Boot 백엔드와 Ionic React 프론트엔드가 독립적으로만 존재하던 상태에서, 프론트가 백엔드 API를 호출해 연결 상태와 인증 상태를 확인할 수 있도록 연동한다.

## 변경 파일

- `backend/src/test/java/com/junglecamp/backend/ApiIntegrationTests.java`
- `backend/src/main/java/com/junglecamp/backend/controller/ApiController.java`
- `backend/src/main/java/com/junglecamp/backend/config/SecurityConfig.java`
- `front/src/api/backend.ts`
- `front/vite.config.ts`
- `front/src/pages/HomePage.tsx`
- `front/src/pages/HomePage.css`
- `AGENTS.md`
- `docs/prompt-workflow-hook.md`
- `docs/work-logs/2026-06-05-backend-frontend-integration.md`

## API 계약

### `GET /api/status`

공개 API다. 프론트 개발 서버에서 백엔드 연결 상태를 확인할 때 사용한다.

응답 예시:

```json
{
  "service": "Jungle AI Backend",
  "status": "running",
  "message": "Backend API is connected."
}
```

### `GET /api/me`

인증된 사용자 정보를 반환한다. 인증되지 않은 요청은 HTML 로그인 페이지로 리다이렉트하지 않고 `401 Unauthorized`를 반환한다.

인증된 응답 예시:

```json
{
  "username": "tester"
}
```

## 구현 내용

### Backend

- `ApiIntegrationTests`를 먼저 작성해 API 계약을 고정했다.
- 구현 전 테스트 실행 결과:
  - `/api/status`: 기대 `200`, 실제 `302`
  - `/api/me` 익명 요청: 기대 `401`, 실제 `302`
  - `/api/me` 인증 요청: 기대 `200`, 실제 `404`
- `ApiController`를 추가해 `/api/status`, `/api/me` JSON API를 제공했다.
- `SecurityConfig`에서 `/api/status`는 공개하고, `/api/**` 인증 실패는 API답게 `401`로 응답하도록 설정했다.
- API용 401 처리와 웹 페이지용 로그인 리다이렉트가 섞이지 않도록 `/api/**` 전용 보안 체인과 웹 페이지 보안 체인을 분리했다.

### Frontend

- `front/src/api/backend.ts`를 추가해 백엔드 API 호출을 한 곳으로 모았다.
- Vite 개발 서버에서 `/api` 요청을 `http://localhost:8080`으로 프록시하도록 설정했다.
- 홈 화면에서 백엔드 연결 상태를 표시한다.
- 인증 세션이 없으면 백엔드 로그인 페이지로 이동할 수 있는 버튼을 표시한다.

### Prompt Save Workflow

- `AGENTS.md`에 프롬프트 원문 저장 전 사용자 동의를 반드시 묻는 프로젝트 지침을 추가했다.
- `docs/prompt-workflow-hook.md`에 지속 적용 방식과 향후 `UserPromptSubmit` 훅 확장 예시를 정리했다.
- 이 작업 로그에는 프롬프트 원문을 저장하지 않았다.

## 실행 방법

백엔드:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

프론트:

```powershell
cd front
npm run dev
```

프론트 개발 서버에서 `/api/*` 요청은 Vite 프록시를 통해 백엔드 `http://localhost:8080`으로 전달된다.

## 검증

백엔드 API 테스트:

```powershell
cd backend
.\mvnw.cmd -Dtest=ApiIntegrationTests test
```

결과:

```text
Tests run: 3, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

전체 백엔드 테스트:

```powershell
cd backend
.\mvnw.cmd test
```

결과:

```text
Tests run: 7, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

프론트 lint:

```powershell
cd front
npm run lint
```

결과:

```text
eslint .
Exit code: 0
```

프론트 build:

```powershell
cd front
npm run build
```

결과:

```text
tsc -b && vite build
234 modules transformed.
built in 6.58s
```

비고:

- Vite build에서 `assets/index-*.js` chunk가 500 kB를 초과한다는 경고가 출력됐다.
- 현재 Ionic React 초기 번들에서 발생한 경고이며 빌드 실패는 아니다.

## 남은 작업

- 프론트 로그인 화면을 별도로 구현하면 `/api/me`와 직접 연결해 같은 화면 안에서 인증 흐름을 완성할 수 있다.
- 현재 백엔드 로그인은 Thymeleaf 페이지를 새 창으로 여는 방식이다.
- 운영 환경에서는 `VITE_API_BASE_URL`, `VITE_BACKEND_ORIGIN` 값을 배포 주소에 맞춰 설정해야 한다.
