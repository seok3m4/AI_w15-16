# Dashboard Board UI

## Core Pattern

`img.png`는 게시판보다 운영 대시보드에 가까운 화면입니다. 핵심은 화려한 장식이 아니라 정보를 안정적으로 훑을 수 있는 구조입니다.

- Sidebar: 사용자가 지금 어느 기능 영역에 있는지 알려줍니다.
- Topbar: 전역 검색, 새로고침, 로그인 같은 반복 액션을 둡니다.
- Summary cards: 전체 게시글, 댓글, 태그처럼 현재 상태를 숫자로 보여줍니다.
- Workspace cards: 목록, 상세, 작성, 댓글처럼 실제 작업 영역을 카드로 나눕니다.
- Thin borders: 강한 색 대신 얇은 선으로 영역을 구분합니다.

## Why This Fits The Project

이 프로젝트는 단순 게시판에서 RAG 지식 베이스로 확장될 예정입니다. 그래서 일반 블로그형 UI보다 "데이터가 쌓이고 관리되는 화면"처럼 보이는 편이 더 자연스럽습니다.

현재 화면은 다음 흐름을 한 화면에서 보여줍니다.

```text
검색/태그 필터
-> 게시글 목록
-> 선택 게시글 상세
-> 새 글 또는 수정
-> 댓글 작성/수정/삭제
```

이 흐름은 나중에 다음 기능을 붙이기도 좋습니다.

- RAG 인덱싱 상태
- 문서 chunk 수
- 임베딩 완료 여부
- AI 요약
- 관련 게시글 추천

## Layout Translation From `img.png`

`img.png`의 경제 지표 대시보드를 게시판에 맞게 바꾸면 다음처럼 대응됩니다.

| Reference UI | Board UI |
| --- | --- |
| 주요 지표 카드 | 게시글, 댓글, 태그, RAG 상태 카드 |
| 지표 검색 | 게시글/태그/RAG 키워드 검색 |
| 경제 캘린더 | 게시글 목록 |
| AI 인사이트 | 선택 게시글 상세와 댓글 |
| 최근 리포트 | 새 게시글 작성/수정 영역 |

## Design Rules

- 카드 radius는 8px 이하로 유지합니다.
- 배경은 `#f7f7f5`, 카드는 `#ffffff`, 텍스트는 `#111111` 중심으로 둡니다.
- 포인트 색은 거의 쓰지 않고, 버튼의 검정색과 에러의 빨간색 정도만 사용합니다.
- 본문 화면에 설명 문구를 과하게 넣지 않습니다.
- 모바일에서는 사이드바를 위쪽 메뉴처럼 접고, 본문 카드는 한 줄로 쌓습니다.

## Files To Study

- `front/src/pages/HomePage.tsx`
- `front/src/pages/HomePage.css`
- `front/src/theme/variables.css`
- `docs/superpowers/specs/2026-06-12-dashboard-board-ui-design.md`
- `docs/superpowers/plans/2026-06-12-dashboard-board-ui.md`

## Verification

```powershell
cd front
npm.cmd run lint
npm.cmd run build
```

빌드가 성공하면 TypeScript와 CSS import 경로가 정상입니다. 실제 화면은 `http://localhost:5173/home`에서 확인합니다.
