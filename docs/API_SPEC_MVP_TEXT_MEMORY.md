# API 명세 초안 — 텍스트 기반 Memory MVP

## 1. 문서 목적

이 문서는 Memento MVP의 REST API 계약 초안을 정의한다.

범위는 텍스트 기반 게시글, 댓글, 태그, 친구, 좋아요, Memory/RAG, Context Capsule, Agent Workflow, MCP 연동 경계까지 포함한다. 실제 OpenAPI YAML 생성과 세부 스키마 검증 규칙은 후속 작업으로 둔다.

## 2. 공통 규칙

### 2.1 Base URL

```text
/api/v1
```

### 2.2 인증

보호 API는 JWT Bearer 인증을 사용한다.

```http
Authorization: Bearer <accessToken>
```

- `accessToken`은 로그인 API에서 발급한다.
- `accessToken`의 기본 만료 시간은 1시간이다.
- `refreshToken`은 로그인 시 `HttpOnly`, `Secure`, `SameSite=Lax` 쿠키로 발급한다. 로컬 개발 환경에서는 HTTPS 미적용으로 인해 `Secure` 예외를 둘 수 있다.
- `refreshToken`의 기본 만료 시간은 14일이며, 토큰 재발급 시 rotation한다.
- 로그아웃 시 서버는 refresh token을 폐기하고, 클라이언트는 보유 중인 access token을 삭제한다.
- 인증이 필요한 API에 토큰이 없거나 유효하지 않으면 `401 Unauthorized`를 반환한다.

### 2.3 ID와 시간

- 모든 public resource id는 UUID string을 사용한다.
- 시간은 ISO-8601 UTC 문자열을 사용한다.

```json
{
  "id": "8fd5f3df-2df2-44d2-8e4a-85b9734a9f7c",
  "createdAt": "2026-06-15T03:10:00Z"
}
```

### 2.4 응답 형식

성공 응답은 REST 리소스 JSON을 직접 반환한다.

목록 응답은 `items`와 `page`를 포함한다.

```json
{
  "items": [],
  "page": {
    "page": 0,
    "size": 20,
    "totalCount": 0,
    "totalPages": 0
  }
}
```

에러 응답은 RFC 9457 Problem Details 형식을 따른다.

```json
{
  "type": "https://memento.local/problems/validation-error",
  "title": "Validation failed",
  "status": 400,
  "detail": "요청 값이 올바르지 않습니다.",
  "instance": "/api/v1/posts",
  "code": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "title",
      "message": "제목은 필수입니다."
    }
  ]
}
```

### 2.5 공통 상태 코드

| Status | 의미 |
|--------|------|
| 200 | 조회, 수정, 동기 작업 성공 |
| 201 | 리소스 생성 성공 |
| 202 | 비동기 작업 접수 |
| 204 | 삭제 또는 취소 성공 |
| 400 | 입력 검증 실패 |
| 401 | 인증 실패 |
| 403 | 권한 또는 scope 부족 |
| 404 | 리소스 없음 또는 존재를 숨겨야 하는 접근 |
| 409 | 중복 요청 또는 상태 충돌 |
| 422 | 도메인 규칙 위반 |
| 500 | 서버 오류 |
| 502 | 외부 서비스 호출 실패 |

접근 제어 에러 기본 정책:

- 인증되지 않은 요청은 항상 `401`을 반환한다.
- ID 기반 리소스 조회에서 리소스가 없거나 요청자에게 존재를 숨겨야 하는 경우 `404`를 반환한다.
- 이미 접근 가능한 리소스에 대해 수행 권한이 없는 행위는 `403`을 반환한다. 예: 친구 게시글 조회는 가능하지만 수정은 불가한 경우.
- 중복 요청, 이미 처리된 상태 전이, 동시에 충돌한 요청은 `409`를 반환한다.

### 2.6 페이징과 정렬

목록 API는 기본적으로 `page/size` 방식을 사용한다.

| Query | 기본값 | 설명 |
|-------|--------|------|
| `page` | `0` | 0부터 시작하는 페이지 번호 |
| `size` | `20` | 페이지 크기 |
| `sort` | 리소스별 기본값 | 예: `createdAt,desc` |

로그성 API는 MVP에서는 `page/size`로 시작하고, 대량 데이터가 문제가 되면 cursor 방식으로 확장한다.

### 2.7 접근 범위

게시글 목록과 검색 API는 `scope` query parameter를 사용한다.

| Scope | 의미 |
|-------|------|
| `me` | 본인 데이터만 조회한다. 기본값이다. |
| `friends` | 승인된 친구 데이터만 조회한다. |
| `all_accessible` | 본인 데이터와 접근 가능한 친구 데이터를 함께 조회한다. |

친구 데이터는 친구 관계가 `accepted`일 때만 포함된다. AI 기능에서 친구 데이터를 근거로 쓰려면 기록 소유자의 친구 AI 활용 전역 동의가 `true`여야 한다.

## 3. 공통 스키마

### 3.1 UserPublicSummary

```json
{
  "id": "uuid",
  "nickname": "cutan"
}
```

게시글, 댓글, 친구 목록처럼 다른 사용자에게 노출될 수 있는 응답에는 `UserPublicSummary`를 사용한다. 이메일은 공개 요약 응답에 포함하지 않는다.

### 3.2 UserPrivateResponse

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "nickname": "cutan",
  "friendAiSharingEnabled": false,
  "createdAt": "2026-06-15T03:10:00Z"
}
```

회원가입, 로그인, 내 정보 조회처럼 본인에게만 반환되는 응답에는 `UserPrivateResponse`를 사용한다.

### 3.3 PostResponse

```json
{
  "id": "uuid",
  "author": {
    "id": "uuid",
    "nickname": "cutan"
  },
  "title": "첫 기록",
  "content": "오늘 기억하고 싶은 내용",
  "tags": ["회고", "프로젝트"],
  "commentCount": 2,
  "likeCount": 4,
  "likedByMe": true,
  "accessScope": "me",
  "memoryStatus": "succeeded",
  "createdAt": "2026-06-15T03:10:00Z",
  "updatedAt": "2026-06-15T03:10:00Z"
}
```

### 3.4 CommentResponse

```json
{
  "id": "uuid",
  "postId": "uuid",
  "author": {
    "id": "uuid",
    "nickname": "cutan"
  },
  "content": "댓글 내용",
  "createdAt": "2026-06-15T03:10:00Z",
  "updatedAt": "2026-06-15T03:10:00Z"
}
```

### 3.5 AsyncJobResponse

```json
{
  "id": "uuid",
  "type": "memory_reindex",
  "status": "pending",
  "progress": 0,
  "retryable": false,
  "createdAt": "2026-06-15T03:10:00Z",
  "updatedAt": "2026-06-15T03:10:00Z",
  "completedAt": null
}
```

공통 비동기 상태:

```text
pending | running | succeeded | failed | approval_required | rejected
```

### 3.6 비동기 작업 조회

```http
GET /api/v1/jobs/{jobId}
```

Response `200 OK`:

```json
{
  "id": "uuid",
  "type": "memory_reindex",
  "status": "running",
  "progress": 45,
  "retryable": false,
  "result": null,
  "error": null,
  "createdAt": "2026-06-15T03:10:00Z",
  "updatedAt": "2026-06-15T03:11:00Z",
  "completedAt": null
}
```

비동기 작업을 `202 Accepted`로 받은 클라이언트는 이 API로 상태를 조회한다. `failed` 상태의 `error`는 Problem Details와 동일한 필드를 사용한다.

## 4. 인증과 개인정보 설정 API

### 4.1 회원가입

```http
POST /api/v1/auth/signup
```

Request:

```json
{
  "email": "user@example.com",
  "password": "password1234!",
  "nickname": "cutan"
}
```

Response `201 Created`:

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "nickname": "cutan",
  "createdAt": "2026-06-15T03:10:00Z"
}
```

주요 에러:

| Status | Code | 조건 |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | 이메일, 비밀번호, 닉네임 형식 오류 |
| 409 | `EMAIL_ALREADY_EXISTS` | 이미 가입된 이메일 |

### 4.2 로그인

```http
POST /api/v1/auth/login
```

Request:

```json
{
  "email": "user@example.com",
  "password": "password1234!"
}
```

Response `200 OK`:

Header:

```http
Set-Cookie: refreshToken=<jwt-refresh-token>; HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth; Max-Age=1209600
```

```json
{
  "accessToken": "jwt-access-token",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "nickname": "cutan"
  }
}
```

### 4.3 토큰 재발급

```http
POST /api/v1/auth/refresh
```

Request: refresh token 쿠키를 사용한다. 별도 body는 보내지 않는다.

Response `200 OK`:

Header:

```http
Set-Cookie: refreshToken=<new-jwt-refresh-token>; HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth; Max-Age=1209600
```

```json
{
  "accessToken": "new-jwt-access-token",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

처리 규칙:

- refresh token이 유효하면 새 access token과 새 refresh token을 발급한다.
- 기존 refresh token은 재사용할 수 없도록 폐기한다.
- refresh token이 없거나 만료, 위조, 재사용으로 판단되면 `401 Unauthorized`를 반환한다.

### 4.4 로그아웃

```http
POST /api/v1/auth/logout
```

Response `204 No Content`

서버는 요청자의 refresh token을 폐기한다. access token은 짧은 만료 시간을 전제로 클라이언트에서 폐기한다.

### 4.5 내 정보 조회

```http
GET /api/v1/auth/me
```

Response `200 OK`:

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "nickname": "cutan",
  "friendAiSharingEnabled": false,
  "createdAt": "2026-06-15T03:10:00Z"
}
```

### 4.6 친구 AI 활용 전역 동의 설정

```http
PUT /api/v1/privacy/ai-sharing
```

Request:

```json
{
  "enabled": true
}
```

Response `200 OK`:

```json
{
  "friendAiSharingEnabled": true,
  "updatedAt": "2026-06-15T03:10:00Z"
}
```

기본값은 `false`다.

## 5. 게시글, 댓글, 태그 API

### 5.1 게시글 생성

```http
POST /api/v1/posts
```

Request:

```json
{
  "title": "오늘의 회고",
  "content": "오늘 프로젝트에서 배운 점...",
  "tagNames": ["회고", "프로젝트"]
}
```

Response `201 Created`: `PostResponse`

처리 규칙:

- 작성자는 현재 로그인 사용자다.
- 같은 게시글 안의 중복 태그명은 하나로 정리한다.
- 게시글 생성 후 memory chunk/embedding 생성 작업을 시작한다.
- embedding 실패는 게시글 생성 성공을 롤백하지 않는다.

### 5.2 게시글 목록과 키워드 검색

```http
GET /api/v1/posts?scope=me&q=회고&tag=프로젝트&page=0&size=20&sort=createdAt,desc
```

Query:

| 이름 | 필수 | 설명 |
|------|------|------|
| `scope` | N | `me`, `friends`, `all_accessible`. 기본값 `me` |
| `q` | N | 제목, 본문, 댓글, 태그 키워드 |
| `tag` | N | 태그명 필터 |
| `page` | N | 페이지 번호 |
| `size` | N | 페이지 크기 |
| `sort` | N | 기본값 `createdAt,desc` |

Response `200 OK`:

```json
{
  "items": [
    {
      "id": "uuid",
      "author": {
        "id": "uuid",
        "nickname": "cutan"
      },
      "title": "오늘의 회고",
      "contentPreview": "오늘 프로젝트에서 배운 점...",
      "tags": ["회고", "프로젝트"],
      "commentCount": 2,
      "likeCount": 4,
      "likedByMe": false,
      "accessScope": "me",
      "memoryStatus": "succeeded",
      "createdAt": "2026-06-15T03:10:00Z",
      "updatedAt": "2026-06-15T03:10:00Z"
    }
  ],
  "page": {
    "page": 0,
    "size": 20,
    "totalCount": 1,
    "totalPages": 1
  }
}
```

### 5.3 게시글 상세 조회

```http
GET /api/v1/posts/{postId}
```

Response `200 OK`:

```json
{
  "id": "uuid",
  "author": {
    "id": "uuid",
    "nickname": "cutan"
  },
  "title": "오늘의 회고",
  "content": "오늘 프로젝트에서 배운 점...",
  "tags": ["회고", "프로젝트"],
  "recentComments": [],
  "commentCount": 0,
  "likeCount": 4,
  "likedByMe": false,
  "accessScope": "friend",
  "memoryStatus": "succeeded",
  "createdAt": "2026-06-15T03:10:00Z",
  "updatedAt": "2026-06-15T03:10:00Z"
}
```

접근 규칙:

- 작성자는 항상 조회 가능하다.
- 승인된 친구는 조회 가능하다.
- 그 외 사용자는 존재 숨김을 위해 `404 Not Found`를 반환한다.
- 조회는 가능하지만 수정, 삭제 같은 행위 권한이 없는 경우에는 `403 Forbidden`을 반환한다.

### 5.4 게시글 수정

```http
PUT /api/v1/posts/{postId}
```

Request:

```json
{
  "title": "수정된 회고",
  "content": "수정된 내용",
  "tagNames": ["회고"]
}
```

Response `200 OK`: `PostResponse`

작성자만 수정할 수 있다. 수정 후 memory chunk/embedding 갱신 작업을 시작한다.

### 5.5 게시글 삭제

```http
DELETE /api/v1/posts/{postId}
```

Response `204 No Content`

작성자만 삭제할 수 있다. 댓글, 태그 연결, memory 검색 대상도 함께 정리한다.

### 5.6 댓글 목록 조회

```http
GET /api/v1/posts/{postId}/comments?page=0&size=20&sort=createdAt,asc
```

Response `200 OK`:

```json
{
  "items": [
    {
      "id": "uuid",
      "postId": "uuid",
      "author": {
        "id": "uuid",
        "nickname": "friend"
      },
      "content": "좋은 기록이네요.",
      "createdAt": "2026-06-15T03:10:00Z",
      "updatedAt": "2026-06-15T03:10:00Z"
    }
  ],
  "page": {
    "page": 0,
    "size": 20,
    "totalCount": 1,
    "totalPages": 1
  }
}
```

게시글 상세 응답의 `recentComments`는 최근 댓글 일부만 포함한다. 전체 댓글 목록은 이 API로 페이징 조회한다.

### 5.7 댓글 생성

```http
POST /api/v1/posts/{postId}/comments
```

Request:

```json
{
  "content": "좋은 기록이네요."
}
```

Response `201 Created`: `CommentResponse`

작성자 또는 승인된 친구만 댓글을 작성할 수 있다.

### 5.8 댓글 수정

```http
PUT /api/v1/comments/{commentId}
```

Request:

```json
{
  "content": "수정된 댓글"
}
```

Response `200 OK`: `CommentResponse`

댓글 작성자만 수정할 수 있다.

### 5.9 댓글 삭제

```http
DELETE /api/v1/comments/{commentId}
```

Response `204 No Content`

댓글 작성자만 삭제할 수 있다.

### 5.10 태그 목록 조회

```http
GET /api/v1/tags?page=0&size=50
```

Response `200 OK`:

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "회고",
      "postCount": 12
    }
  ],
  "page": {
    "page": 0,
    "size": 50,
    "totalCount": 1,
    "totalPages": 1
  }
}
```

## 6. 친구와 좋아요 API

### 6.1 친구 요청

```http
POST /api/v1/friendships/requests
```

Request:

```json
{
  "addresseeUserId": "uuid"
}
```

Response `201 Created`:

```json
{
  "id": "uuid",
  "requester": {
    "id": "uuid",
    "nickname": "cutan"
  },
  "addressee": {
    "id": "uuid",
    "nickname": "friend"
  },
  "status": "pending",
  "createdAt": "2026-06-15T03:10:00Z",
  "updatedAt": "2026-06-15T03:10:00Z"
}
```

주요 에러:

| Status | Code | 조건 |
|--------|------|------|
| 400 | `CANNOT_FRIEND_SELF` | 자기 자신에게 요청 |
| 409 | `FRIENDSHIP_ALREADY_EXISTS` | 이미 요청 또는 친구 관계 존재 |

### 6.2 친구/요청 목록 조회

```http
GET /api/v1/friendships?status=accepted&page=0&size=20
```

Query:

| 이름 | 필수 | 설명 |
|------|------|------|
| `status` | N | `pending`, `accepted`, `rejected` |
| `page` | N | 페이지 번호 |
| `size` | N | 페이지 크기 |

Response `200 OK`:

```json
{
  "items": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "nickname": "friend"
      },
      "status": "accepted",
      "direction": "outgoing",
      "createdAt": "2026-06-15T03:10:00Z",
      "updatedAt": "2026-06-15T03:10:00Z"
    }
  ],
  "page": {
    "page": 0,
    "size": 20,
    "totalCount": 1,
    "totalPages": 1
  }
}
```

### 6.3 친구 요청 승인

```http
POST /api/v1/friendships/{friendshipId}/accept
```

Response `200 OK`:

```json
{
  "id": "uuid",
  "status": "accepted",
  "updatedAt": "2026-06-15T03:10:00Z"
}
```

요청 수신자만 승인할 수 있다.

### 6.4 친구 요청 거절

```http
POST /api/v1/friendships/{friendshipId}/reject
```

Response `200 OK`:

```json
{
  "id": "uuid",
  "status": "rejected",
  "updatedAt": "2026-06-15T03:10:00Z"
}
```

### 6.5 친구 관계 해제

```http
DELETE /api/v1/friendships/{friendshipId}
```

Response `204 No Content`

처리 규칙:

- `pending` 상태의 요청은 요청 발신자가 취소할 수 있다.
- `accepted` 상태의 친구 관계는 관계 당사자 중 한 명이 해제할 수 있다.
- `rejected` 상태의 요청 삭제는 MVP에서 제공하지 않는다.

### 6.6 게시글 좋아요

```http
POST /api/v1/posts/{postId}/likes
```

Response `200 OK`:

```json
{
  "postId": "uuid",
  "likedByMe": true,
  "likeCount": 5
}
```

처리 규칙:

- 작성자 또는 승인된 친구만 좋아요를 남길 수 있다.
- 같은 사용자는 같은 게시글에 좋아요를 한 번만 남길 수 있다.
- 이미 좋아요를 누른 게시글에 다시 요청하면 멱등적으로 `200 OK`와 현재 상태를 반환한다.
- 동시 요청으로 중복 insert가 발생하면 서버는 단일 좋아요 상태로 수렴시킨다.

### 6.7 게시글 좋아요 취소

```http
DELETE /api/v1/posts/{postId}/likes
```

Response `200 OK`:

```json
{
  "postId": "uuid",
  "likedByMe": false,
  "likeCount": 4
}
```

이미 좋아요가 없는 게시글에 취소를 요청하면 멱등적으로 `200 OK`와 현재 상태를 반환한다.

## 7. Memory/RAG API

### 7.1 게시글 memory 처리 상태 조회

```http
GET /api/v1/posts/{postId}/memory-status
```

Response `200 OK`:

```json
{
  "postId": "uuid",
  "chunkStatus": "succeeded",
  "embeddingStatus": "succeeded",
  "lastIndexedAt": "2026-06-15T03:10:00Z",
  "failureReason": null
}
```

### 7.2 내 memory 재색인 요청

```http
POST /api/v1/memories/reindex
```

Request:

```json
{
  "postIds": ["uuid"],
  "reason": "manual_retry"
}
```

Response `202 Accepted`: `AsyncJobResponse`

클라이언트는 `GET /api/v1/jobs/{jobId}`로 진행 상태와 실패 사유를 조회한다.

### 7.3 Memory Search

```http
POST /api/v1/memory-search
```

Request:

```json
{
  "query": "프로젝트 회고에서 인증 관련 내용 찾아줘",
  "scope": "me",
  "limit": 10
}
```

Response `200 OK`:

```json
{
  "query": "프로젝트 회고에서 인증 관련 내용 찾아줘",
  "scope": "me",
  "results": [
    {
      "postId": "uuid",
      "chunkId": "uuid",
      "ownerUserId": "uuid",
      "ownerNickname": "cutan",
      "title": "인증 구현 회고",
      "snippet": "JWT Bearer 방식을 선택했다...",
      "score": 0.82,
      "sourceType": "post",
      "createdAt": "2026-06-15T03:10:00Z"
    }
  ]
}
```

이 API는 검색 결과를 동기 반환한다. LLM 요약은 별도 API에서 수행한다.

### 7.4 Memory Search 결과 기반 AI 요약

```http
POST /api/v1/memory-search/summarize
```

Request:

```json
{
  "query": "인증 방식 결정 요약해줘",
  "scope": "me",
  "sourcePostIds": ["uuid"],
  "maxSources": 5
}
```

Response `200 OK`:

```json
{
  "query": "인증 방식 결정 요약해줘",
  "answer": "JWT Bearer를 기본 인증 방식으로 선택했습니다...",
  "usedFriendContext": false,
  "sources": [
    {
      "ownerUserId": "uuid",
      "ownerNickname": "cutan",
      "postId": "uuid",
      "title": "API 인증 결정",
      "sourceType": "post"
    }
  ]
}
```

LLM 요약 처리 규칙:

- 검색 결과 자체는 동기 API인 `POST /api/v1/memory-search`에서 먼저 확보한다.
- 요약이 15초 안에 완료되면 `200 OK`로 결과를 반환한다.
- 요약이 15초 안에 완료되지 않으면 `202 Accepted`와 `AsyncJobResponse`를 반환하고, 클라이언트는 `GET /api/v1/jobs/{jobId}`로 결과를 조회한다.
- 요약 실패 시 검색 결과 자체를 실패로 만들지 않는다. 클라이언트는 검색 결과와 요약 실패를 분리해서 표시한다.

### 7.5 친구 Memory Search

```http
POST /api/v1/friends/{friendId}/memory-search
```

Request:

```json
{
  "query": "요즘 친구가 관심 있어 하는 주제 찾아줘",
  "limit": 10
}
```

Response `200 OK`:

```json
{
  "friendId": "uuid",
  "query": "요즘 친구가 관심 있어 하는 주제 찾아줘",
  "usedFriendContext": true,
  "results": [
    {
      "postId": "uuid",
      "chunkId": "uuid",
      "ownerUserId": "uuid",
      "ownerNickname": "friend",
      "title": "요즘 읽는 책",
      "snippet": "최근에는 커피와 디자인에 관심이 많다...",
      "score": 0.78,
      "sourceType": "post"
    }
  ]
}
```

권한 규칙:

- 요청자와 `friendId` 사용자는 accepted 친구 관계여야 한다.
- `friendId` 사용자의 `friendAiSharingEnabled`가 `true`여야 한다.
- 좋아요 패턴은 검색 근거로 사용하지 않는다.

### 7.6 친구 생일선물 추천

```http
POST /api/v1/friends/{friendId}/gift-recommendations
```

Request:

```json
{
  "occasion": "birthday",
  "budget": {
    "min": 30000,
    "max": 70000,
    "currency": "KRW"
  },
  "preferences": "부담스럽지 않은 선물",
  "maxSources": 5
}
```

Response `200 OK`:

```json
{
  "friendId": "uuid",
  "occasion": "birthday",
  "answer": "최근 기록을 보면 커피와 디자인 문구에 관심이 있어 보입니다. 5만 원 이하라면 원두 샘플러나 디자인 노트를 추천합니다.",
  "recommendations": [
    {
      "title": "원두 샘플러",
      "reason": "최근 커피 취향을 언급한 기록이 있습니다.",
      "confidence": "medium"
    }
  ],
  "sources": [
    {
      "ownerUserId": "uuid",
      "ownerNickname": "friend",
      "postId": "uuid",
      "title": "요즘 좋아하는 카페",
      "sourceType": "post"
    }
  ]
}
```

대체 Response `202 Accepted`: `AsyncJobResponse`

처리 규칙:

- 추천 생성이 15초 안에 완료되면 `200 OK`로 결과를 반환한다.
- 추천 생성이 15초 안에 완료되지 않으면 `202 Accepted`와 `AsyncJobResponse`를 반환한다.
- `GET /api/v1/jobs/{jobId}`의 `result`에는 위 `200 OK` 응답과 동일한 추천 결과 스키마를 담는다.
- 답변은 공유된 게시글/댓글 근거에 기반해야 하며, 근거 없는 민감 추론을 하지 않는다.

## 8. Context Capsule API

### 8.1 Capsule 생성

```http
POST /api/v1/context-capsules
```

Request:

```json
{
  "title": "내 프로젝트 맥락",
  "purpose": "외부 LLM에게 최근 프로젝트 맥락 전달",
  "query": "최근 프로젝트 관련 기억",
  "scope": "me",
  "sourcePostIds": ["uuid"]
}
```

Response `201 Created`:

```json
{
  "id": "uuid",
  "title": "내 프로젝트 맥락",
  "purpose": "외부 LLM에게 최근 프로젝트 맥락 전달",
  "summary": "최근 프로젝트에서는 인증, 친구 권한, RAG 흐름을 설계했다.",
  "keyFacts": [
    "JWT Bearer 인증을 사용한다.",
    "친구 AI 활용은 전역 opt-in이 필요하다."
  ],
  "tags": ["프로젝트", "API"],
  "containsFriendContext": false,
  "sources": [],
  "createdAt": "2026-06-15T03:10:00Z",
  "updatedAt": "2026-06-15T03:10:00Z"
}
```

친구 데이터가 포함된 Capsule은 친구 관계와 친구 AI 공유 동의가 유지되는 경우에만 생성할 수 있다.

### 8.2 Capsule 목록 조회

```http
GET /api/v1/context-capsules?page=0&size=20
```

Response `200 OK`:

```json
{
  "items": [
    {
      "id": "uuid",
      "title": "내 프로젝트 맥락",
      "purpose": "외부 LLM에게 최근 프로젝트 맥락 전달",
      "containsFriendContext": false,
      "createdAt": "2026-06-15T03:10:00Z",
      "updatedAt": "2026-06-15T03:10:00Z"
    }
  ],
  "page": {
    "page": 0,
    "size": 20,
    "totalCount": 1,
    "totalPages": 1
  }
}
```

### 8.3 Capsule 상세 조회

```http
GET /api/v1/context-capsules/{capsuleId}
```

Response `200 OK`: Capsule 생성 응답과 동일한 상세 스키마.

### 8.4 Capsule 수정

```http
PUT /api/v1/context-capsules/{capsuleId}
```

Request:

```json
{
  "title": "수정된 제목",
  "purpose": "수정된 목적"
}
```

Response `200 OK`: Capsule 상세 스키마.

### 8.5 Capsule 삭제

```http
DELETE /api/v1/context-capsules/{capsuleId}
```

Response `204 No Content`

## 9. Agent와 승인 API

### 9.1 Agent 실행 시작

```http
POST /api/v1/agent-runs
```

Request:

```json
{
  "goal": "최근 기록을 바탕으로 주간 회고를 만들고 Notion에 저장해줘",
  "allowedTools": ["search_memories", "create_context_capsule", "notion_export"]
}
```

Response `202 Accepted`:

```json
{
  "id": "uuid",
  "goal": "최근 기록을 바탕으로 주간 회고를 만들고 Notion에 저장해줘",
  "status": "pending",
  "requiresApproval": false,
  "createdAt": "2026-06-15T03:10:00Z",
  "updatedAt": "2026-06-15T03:10:00Z"
}
```

### 9.2 Agent 실행 상태/결과 조회

```http
GET /api/v1/agent-runs/{runId}
```

Response `200 OK`:

```json
{
  "id": "uuid",
  "goal": "최근 기록을 바탕으로 주간 회고를 만들고 Notion에 저장해줘",
  "status": "approval_required",
  "result": null,
  "pendingApprovals": [
    {
      "id": "uuid",
      "type": "external_write",
      "description": "Notion 페이지를 생성합니다.",
      "createdAt": "2026-06-15T03:10:00Z"
    }
  ],
  "failureReason": null,
  "createdAt": "2026-06-15T03:10:00Z",
  "updatedAt": "2026-06-15T03:10:00Z"
}
```

### 9.3 Agent step 목록 조회

```http
GET /api/v1/agent-runs/{runId}/steps?page=0&size=20
```

Response `200 OK`:

```json
{
  "items": [
    {
      "id": "uuid",
      "stepOrder": 1,
      "toolName": "search_memories",
      "status": "succeeded",
      "inputSummary": "최근 7일 기록 검색",
      "outputSummary": "관련 게시글 4개 발견",
      "createdAt": "2026-06-15T03:10:00Z",
      "updatedAt": "2026-06-15T03:10:00Z"
    }
  ],
  "page": {
    "page": 0,
    "size": 20,
    "totalCount": 1,
    "totalPages": 1
  }
}
```

### 9.4 승인 대기 작업 승인

```http
POST /api/v1/agent-runs/{runId}/approvals/{approvalId}/approve
```

Response `200 OK`:

```json
{
  "approvalId": "uuid",
  "status": "approved",
  "agentRunStatus": "running",
  "updatedAt": "2026-06-15T03:10:00Z"
}
```

### 9.5 승인 대기 작업 거절

```http
POST /api/v1/agent-runs/{runId}/approvals/{approvalId}/reject
```

Response `200 OK`:

```json
{
  "approvalId": "uuid",
  "status": "rejected",
  "agentRunStatus": "rejected",
  "updatedAt": "2026-06-15T03:10:00Z"
}
```

외부 쓰기 작업은 승인 전 실행되지 않는다.

## 10. MCP 인터페이스

MCP Server/Client의 정확한 wire protocol은 MCP 설계 문서에서 확정한다. REST API 명세에서는 도구 경계, 최소 입력/출력, 권한 규칙을 고정한다.

### 10.1 MCP Server tools

| Tool | 입력 | 출력 | 권한 |
|------|------|------|------|
| `search_memories` | `query`, `limit` | memory 검색 결과 | 본인 memory |
| `search_friend_memories` | `friendId`, `query`, `limit` | 친구 memory 검색 결과 | 친구 관계 + 친구 AI 공유 동의 |
| `get_context_capsule` | `capsuleId` | compact context | Capsule 소유자 |
| `summarize_recent_posts` | `days`, `limit` | 최근 게시글 요약 | 본인 게시글 |

MCP tool 공통 규칙:

- 모든 tool 호출은 실행 사용자 컨텍스트와 scope를 명시해야 한다.
- 친구 데이터를 반환하는 tool은 accepted 친구 관계와 친구 AI 공유 동의를 모두 검증한다.
- 친구 데이터가 포함된 출력은 `sources`에 원본 게시글 참조를 포함한다.
- 외부 시스템 쓰기 tool은 Agent 승인 API의 승인 완료 후에만 실행한다.

### 10.2 MCP Client boundary

MVP MCP Client는 Notion export를 1차 대상으로 한다.

- Agent가 Notion export를 실행하려면 승인 대기 상태를 거쳐야 한다.
- 사용자가 승인하면 외부 쓰기 작업을 실행한다.
- 실패는 Agent 실행 결과와 tool call log에 반영한다.

## 11. 권한 매트릭스

| 행동 | 작성자 | 승인된 친구 | 친구 + AI 공유 동의 | 비친구 |
|------|--------|-------------|----------------------|--------|
| 게시글 조회 | 허용 | 허용 | 허용 | 차단 |
| 게시글 수정/삭제 | 허용 | 차단 | 차단 | 차단 |
| 댓글 작성 | 허용 | 허용 | 허용 | 차단 |
| 댓글 수정/삭제 | 본인 댓글만 | 본인 댓글만 | 본인 댓글만 | 차단 |
| 좋아요 | 허용 | 허용 | 허용 | 차단 |
| 키워드 검색 포함 | 허용 | `scope` 명시 시 허용 | `scope` 명시 시 허용 | 차단 |
| AI 검색/요약 근거 | 허용 | 차단 | 명시 요청 시 허용 | 차단 |
| Capsule 근거 포함 | 허용 | 차단 | 명시 요청 시 허용 | 차단 |
| Agent 친구 맥락 활용 | 해당 없음 | 차단 | 명시 요청 시 허용 | 차단 |

## 12. 검증 시나리오

- 회원가입 → 로그인 → 내 정보 조회가 성공한다.
- 미인증 사용자는 보호 API에서 `401`을 받는다.
- 사용자가 게시글을 작성하고 목록/상세에서 확인한다.
- 작성자만 게시글을 수정/삭제할 수 있다.
- 댓글 작성자는 본인 댓글만 수정/삭제할 수 있다.
- 친구 요청 → 승인 후 친구 게시글 조회, 댓글, 좋아요가 가능하다.
- 비친구는 게시글 조회, 댓글, 좋아요, 검색, AI 활용이 차단된다.
- `scope=me`, `scope=friends`, `scope=all_accessible`이 허용된 데이터만 반환한다.
- 게시글 상세는 최근 댓글 일부만 포함하고, 전체 댓글은 댓글 목록 API에서 페이징 조회된다.
- 좋아요 생성/취소는 중복 요청에도 멱등적으로 현재 상태를 반환한다.
- 만료된 access token은 refresh token 쿠키로 재발급할 수 있고, 재발급 시 refresh token이 rotation된다.
- 로그아웃 후 같은 refresh token으로 재발급을 요청하면 `401`을 받는다.
- 친구 AI 공유 동의가 꺼져 있으면 친구 Memory Search와 생일선물 추천이 실패한다.
- 친구 AI 공유 동의가 켜져 있으면 생일선물 추천이 친구 게시글/댓글 출처를 포함한다.
- Memory Search는 검색 결과를 동기 반환한다.
- AI 요약 또는 선물 추천이 제한 시간 안에 끝나지 않으면 `202 Accepted`를 반환하고, `GET /api/v1/jobs/{jobId}`로 결과를 조회한다.
- Agent 실행은 `202 Accepted` 이후 상태 조회로 진행 상황을 확인한다.
- Notion export는 승인 전 실행되지 않고, 승인 후 실행된다.
- validation/auth/permission/not found/conflict 에러가 Problem Details 형식으로 반환된다.

## 13. 남은 설계 항목

- MCP wire protocol과 외부 LLM client 인증 방식은 MCP 설계 문서에서 확정한다.
- Agent step/tool call log가 커질 경우 cursor 페이징으로 확장한다.
- OpenAPI YAML 생성은 이 초안 검토 후 진행한다.
