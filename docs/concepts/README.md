# Concepts Overview

이 폴더는 코드 작성 중 적용된 중요한 개념과 패턴을 따로 설명하기 위한 공간이다.

작업 로그가 "무엇을 변경했는지"를 기록한다면, 개념 문서는 "어떤 개념이 왜 적용되었는지"를 정리한다. 예를 들어 Spring Security 필터 체인 분리, Swagger/OpenAPI 문서화, Vite 프록시, API 인증 응답 분리 같은 내용을 이곳에 정리한다.

## 작성 기준

중요한 코드 작성 또는 변경이 있을 때 다음 기준 중 하나라도 해당하면 개념 문서를 추가하거나 갱신한다.

- 보안, 인증, 권한, 외부 API 연동처럼 실수하면 영향이 큰 개념
- 백엔드와 프론트엔드가 함께 이해해야 하는 계약 또는 통신 구조
- 라이브러리나 프레임워크의 핵심 사용 방식
- 과제 발표나 회고에서 설명해야 할 기술 선택
- 이후 팀원이 같은 패턴을 재사용해야 하는 코드 구조

## 문서 형식

```markdown
# Concept Name

## Where It Appears

- `path/to/file`

## What Was Applied

- 프로젝트 코드에 적용된 핵심 개념을 설명한다.

## Why It Matters

- 이 개념을 사용한 이유와 대안을 설명한다.

## Verification

- `command`: 결과

## Pitfalls And Follow-Ups

- 주의사항과 후속 개선점을 정리한다.
```

## 현재 작성 대상 후보

- Spring Security API/Web 필터 체인 분리
- Swagger/OpenAPI 문서화
- Vite 개발 서버 API 프록시
- 프롬프트 기록과 작업 로그 분리
