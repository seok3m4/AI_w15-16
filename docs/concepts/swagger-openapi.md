# Swagger OpenAPI

## Where It Appears

- `backend/pom.xml`
- `backend/src/main/java/com/junglecamp/backend/config/OpenApiConfig.java`
- `backend/src/main/java/com/junglecamp/backend/config/SecurityConfig.java`
- `backend/src/test/java/com/junglecamp/backend/ApiIntegrationTests.java`
- `README.md`

## What Was Applied

- Springdoc OpenAPI starter를 사용해 Spring Boot API를 OpenAPI JSON과 Swagger UI로 노출했다.
- `OpenApiConfig`에서 API 문서의 제목, 설명, 버전을 설정했다.
- Spring Security에서 Swagger UI와 OpenAPI JSON 경로를 인증 없이 접근 가능하도록 허용했다.
- 테스트에서 `/v3/api-docs`와 `/swagger-ui.html` 접근을 검증했다.

## Why It Matters

- Swagger UI는 백엔드 API를 직접 확인하고 테스트할 수 있는 개발자용 진입점이다.
- OpenAPI JSON은 프론트엔드, 문서화 도구, API 클라이언트 생성 도구가 공통 계약으로 사용할 수 있다.
- 과제에서는 구현한 API를 설명하고 시연해야 하므로 Swagger가 API 구조를 빠르게 보여주는 역할을 한다.

## Verification

- `.\mvnw.cmd -Dtest=ApiIntegrationTests test`: 통과, 5 tests / 0 failures
- `.\mvnw.cmd test`: 통과, 9 tests / 0 failures

## Pitfalls And Follow-Ups

- 운영 환경에서 Swagger UI를 공개할지 여부는 별도로 결정해야 한다.
- Springdoc은 기본적으로 `/v3/api-docs`, `/swagger-ui.html`을 활성화한다. 운영에서 비활성화하려면 `springdoc.api-docs.enabled=false`, `springdoc.swagger-ui.enabled=false` 설정을 검토한다.
- API가 늘어나면 컨트롤러와 DTO에 설명 어노테이션을 추가해 문서 품질을 높일 수 있다.
