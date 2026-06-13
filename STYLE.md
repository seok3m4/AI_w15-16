# 🎨 STYLE.md — 정글 여행 UI 디자인 시스템

이 문서는 프로젝트에 적용된 UI 스타일 규칙을 정리한 것이다.
**새 화면/컴포넌트를 만들 때 이 문서를 그대로 프롬프트/기준으로 사용**하면 일관된 디자인이 나온다.

> 톤: **Apple(애플) 스타일** — 깔끔하고 여백이 넉넉하며, 둥근 모서리·은은한 그림자·파란 포인트 컬러.
> 정의 위치: 색·타이포 토큰은 `apps/web/src/index.css`, 컴포넌트 스타일은 `apps/web/src/App.css`.

---

## 1. 디자인 원칙
- **미니멀 & 여백 중심**: 요소를 빽빽하게 두지 않고 충분한 padding/gap.
- **카드 기반 레이아웃**: 콘텐츠는 흰 카드 + `border-soft` + 은은한 그림자.
- **포인트 컬러는 절제**: 파란색(`--accent`)은 버튼·링크·강조에만.
- **둥근 모서리**: 카드 18px, 입력 12px, 버튼/칩은 pill(980px).
- **부드러운 전환**: hover/press에 0.1~0.3s transition, 페이지 진입 애니메이션.
- **접근성**: 의미 있는 `aria-*`, `prefers-reduced-motion` 존중.

---

## 2. 색상 토큰 (CSS 변수)
```css
--bg:          #f5f5f7;   /* 페이지 배경 (회색빛 화이트) */
--surface:     #ffffff;   /* 카드/패널 배경 */
--field:       #ffffff;   /* 입력 필드 배경 */
--text:        #1d1d1f;   /* 본문 텍스트 */
--text-strong: #1d1d1f;   /* 제목/강조 텍스트 */
--text-muted:  #6e6e73;   /* 보조/설명 텍스트 */
--border:      #d2d2d7;   /* 입력 테두리 */
--border-soft: #e8e8ed;   /* 카드/구분선 테두리 */
--accent:      #0071e3;   /* 포인트(버튼·링크) */
--accent-hover:#0077ed;
--accent-soft: rgba(0,113,227,0.1);  /* 연한 강조 배경(태그·active) */
--danger:      #ff3b30;   /* 삭제/오류 */
--shadow:      0 4px 16px rgba(0,0,0,0.06);
--shadow-hover:0 8px 28px rgba(0,0,0,0.1);
--radius:      18px;      /* 카드/패널 */
--radius-sm:   12px;      /* 입력/작은 박스 */
```
- 색은 **항상 변수로** 참조한다(하드코딩 금지). 예외: 히어로/플레이스홀더의 그라데이션.
- 강조 그라데이션: `linear-gradient(135deg, #0071e3 0%, #00c2ff 100%)`.

---

## 3. 타이포그래피
```css
font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display',
  'SF Pro Text', 'Helvetica Neue', Inter, ui-sans-serif, system-ui,
  'Segoe UI', sans-serif;
letter-spacing: -0.01em;          /* 기본 */
-webkit-font-smoothing: antialiased;
```
| 용도 | 크기 | 굵기 | letter-spacing |
| --- | --- | --- | --- |
| 히어로 H1 | `clamp(34px, 6vw, 54px)` | 700 | -0.03em |
| 페이지 H1 | 30~32px | 700 | -0.025em |
| 카드/섹션 제목 | 18~22px | 600 | -0.02em |
| 본문 | 16~17px | 400 | - |
| 보조/메타 | 13~14px | 400~500 | - |
| eyebrow(라벨) | 13~15px, `--accent`, 600 | | 대문자는 0.04~0.08em |

---

## 4. 간격 · 모서리 · 그림자
- **모서리**: 카드 `--radius`(18px), 입력/작은박스 `--radius-sm`(12px), 버튼·칩·아바타 `980px`(pill/원형).
- **그림자**: 평상시 `--shadow`, hover 시 `--shadow-hover`.
- **간격**: 카드 내부 padding 22~36px, 폼 필드 gap 16~18px, 섹션 간 gap 18px.
- **컨테이너 폭**: 본문 `min(100%, 960px)`(`.content-shell`), 좁은 폼 `720px`(`.narrow`), 헤더/푸터 `1040px`.

---

## 5. 컴포넌트 규칙

### 버튼
- 공통: `min-height: 46px`, `border-radius: 980px`(pill), `font-weight:600`, press 시 `transform: scale(0.98)`.
- **Primary**: 배경 `--accent`, 글자 흰색. hover `--accent-hover`. (주요 액션)
- **Secondary**: 배경 `--field`, 글자 `--accent`, `1px` 테두리. (보조 액션)
- **Ghost**(헤더용): 투명 배경, hover 시 `--border-soft`. 작게.
- **Danger**: 투명 + `--danger` 글자/테두리.
- 비활성: `opacity:0.5; cursor:not-allowed`.

### 카드 (`.post-card`)
- 흰 배경 + `--border-soft` + `--shadow`, `overflow:hidden`, hover 시 `translateY(-2px)` + `--shadow-hover`.
- 상단 **썸네일**(16:9, `object-fit:cover`), 사진 없으면 **그라데이션 + 도시명** 플레이스홀더.
- 본문(`.post-card-body`)은 padding 22px, gap 8px.
- 목록은 **갤러리 그리드**: `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`.

### 입력 / 폼
- 입력: 배경 `--field`, `1px --border`, `--radius-sm`, focus 시 `border-color:--accent` + `box-shadow: 0 0 0 4px --accent-soft`.
- 폼은 **단계별 섹션 카드**로 구성: 번호 배지(원형 `--accent`) + 제목 + 설명, 하단에 우측 정렬 액션바(취소/저장).
- 파일 업로드는 **점선 드롭존**(`2px dashed`) → 선택 시 미리보기 + 변경/제거 버튼.

### 태그 / 배지
- 칩(`.tag-chip`): pill, 배경 `--accent-soft`, 글자 `--accent`, 13px/600.

### 헤더 / 푸터
- 헤더: `position:sticky`, 반투명 + `backdrop-filter: blur(20px)`, 하단 `--border-soft`.
  좌측 로고(✈ 사각 배지) · 가운데 nav(active는 `--accent-soft`) · 우측 사용자 칩(아바타 이니셜+이름) 또는 로그인/회원가입.
- 푸터: `--surface` 배경, 소개 + 링크 + 카피라이트.

### 상태 표현
- **로딩**: `.status-text`("불러오는 중...").
- **오류**: `.error-message`(`--danger`).
- **빈 상태**: 안내 문구 + 행동 유도 링크.

---

## 6. 모션 / 애니메이션
- **페이지 진입**: 라우트 전환 시 `pageIn`(아래 10px → fade-up, 0.4s).
- **카드 stagger**: `cardIn`으로 카드들이 순차 등장(`animation-delay` 0.05s씩).
- `animation-fill-mode: backwards`로 종료 후 원상복귀 → hover transform과 충돌 방지.
- `@media (prefers-reduced-motion: reduce)`에서 애니메이션 비활성화.
- micro-interaction: 버튼 press `scale(0.98)`, 카드 hover lift + 썸네일 `scale(1.04)`.

---

## 7. 반응형
- 기준 브레이크포인트: `max-width: 640px`.
- 모바일: 그리드 1열, 헤더 nav 줄바꿈, 버튼 full-width, 카드/패널 padding 축소.

---

## 8. 프롬프트로 쓸 때 (요약)
> "Apple 스타일의 깔끔한 UI. 배경 `#f5f5f7`, 카드 흰색+둥근 모서리(18px)+은은한 그림자, 포인트 컬러 `#0071e3`. 버튼과 태그는 pill(980px). 입력 focus 시 파란 글로우. 제목은 굵게(letter-spacing 음수), 보조 텍스트는 `#6e6e73`. 카드형 레이아웃과 충분한 여백, hover/페이지 전환에 부드러운 애니메이션. 색은 CSS 변수로만 사용."
