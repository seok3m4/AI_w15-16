# 🎨 STYLE.md — 정글 여행 UI 디자인 시스템

정글 여행 프론트엔드에 실제로 적용된 스타일 규칙. **새 화면/컴포넌트를 만들 때 이 문서를 기준(또는 AI 프롬프트)으로** 쓰면 같은 디자인이 나온다. 모든 값은 현재 코드와 일치한다.

- 디자인 토큰(색·폰트): `apps/web/src/index.css`
- 컴포넌트 스타일: `apps/web/src/App.css`
- 키워드 한 줄: **Apple 스타일 — 회색빛 배경, 흰 카드, 둥근 모서리, 은은한 그림자, 파란 포인트, pill 버튼, 부드러운 모션.**

---

## 0. 원칙 (Do / Don't)
- **Do** — 색은 무조건 CSS 변수로. 카드 기반 + 넉넉한 여백. 포인트색은 액션/강조에만. pill 버튼·둥근 모서리 유지. hover/전환에 짧은 transition.
- **Don't** — 색 하드코딩(그라데이션 제외), 그림자 남발, 모서리 각지게, 포인트색을 배경 전반에 사용, 빽빽한 레이아웃.

---

## 1. 디자인 토큰 (`index.css`)
```css
:root{
  --bg:#f5f5f7;            /* 페이지 배경 */
  --surface:#ffffff;       /* 카드·패널 */
  --field:#ffffff;         /* 입력 배경 */
  --text:#1d1d1f;          /* 본문 */
  --text-strong:#1d1d1f;   /* 제목/강조 */
  --text-muted:#6e6e73;    /* 보조 텍스트 */
  --border:#d2d2d7;        /* 입력 테두리 */
  --border-soft:#e8e8ed;   /* 카드/구분선 */
  --accent:#0071e3;        /* 포인트(버튼·링크) */
  --accent-hover:#0077ed;
  --accent-soft:rgba(0,113,227,.1);  /* 연한 강조 배경(태그·active) */
  --danger:#ff3b30;
  --shadow:0 4px 16px rgba(0,0,0,.06);
  --shadow-hover:0 8px 28px rgba(0,0,0,.1);
  --radius:18px;           /* 카드/패널 */
  --radius-sm:12px;        /* 입력/작은 박스 */
}
```
- pill(버튼·칩·아바타) 모서리는 토큰이 아니라 `980px` 상수.
- 유일하게 허용되는 하드코딩 색: 강조 그라데이션 `linear-gradient(135deg,#0071e3 0%,#00c2ff 100%)`.

## 2. 타이포그래피
```css
font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text',
  'Helvetica Neue',Inter,ui-sans-serif,system-ui,'Segoe UI',sans-serif;
letter-spacing:-0.01em;            /* 기본 */
-webkit-font-smoothing:antialiased;
```
| 용도 | size | weight | letter-spacing |
|---|---|---|---|
| 히어로 H1 | `clamp(34px,6vw,54px)` | 700 | -0.03em |
| 페이지 H1 | 30–32px | 700 | -0.025em |
| 카드/섹션 제목 | 18–22px | 600 | -0.02em |
| 본문 | 16–17px | 400 | — |
| 보조/메타 | 13–14px | 400–500 | — |
| eyebrow(라벨) | 13–15px · `--accent` · 600 | | 대문자 시 0.04–0.08em |

## 3. 간격 · 모서리 · 그림자 · 폭
- 모서리: 카드 `--radius`(18), 입력/작은박스 `--radius-sm`(12), 버튼·칩·아바타 `980px`.
- 그림자: 기본 `--shadow`, hover `--shadow-hover`.
- 여백: 카드 padding 22–36px, 폼 필드 gap 16–18px, 섹션 gap 18px.
- 컨테이너 폭: 본문 `.content-shell` = `min(100%,960px)`, 좁은 폼 `.narrow` = `720px`, 헤더/푸터 inner = `1040px`.
- 페이지 패딩: `.app-page` 48px 22px(상단은 헤더 아래 32px).

---

## 4. 컴포넌트 (클래스 → 규칙)

### 버튼 — 공통 `min-height:46px · radius:980px · weight:600 · active scale(.98)`
| 클래스 | 용도 | 스타일 |
|---|---|---|
| `.primary-link-button` / `.auth-form button` | 주요 액션 | 배경 `--accent`, 흰 글자, hover `--accent-hover` |
| `.secondary-button` / `.secondary-link-button` | 보조 | 배경 `--field`, `--accent` 글자, `1px --border` |
| `.ghost-button` | 헤더용 | 투명, hover `--border-soft`, 작게(36px) |
| `.danger-button` | 삭제 | 투명, `--danger` 글자/테두리 |
| 비활성 | | `opacity:.5; cursor:not-allowed` |

### 카드 `.post-card`
- 흰 배경 + `--border-soft` + `--shadow`, `overflow:hidden`, hover 시 `translateY(-2px)` + `--shadow-hover`.
- 상단 썸네일 `.post-card-thumb`: `aspect-ratio:16/9`, `object-fit:cover`, hover 시 이미지 `scale(1.04)`.
- 사진 없으면 `.post-card-thumb.placeholder`: 그라데이션 + 도시명(흰 글자).
- 본문 `.post-card-body`: padding 22px, gap 8px.
- 목록 컨테이너 `.post-grid`: `grid-template-columns:repeat(auto-fill,minmax(280px,1fr))` (갤러리형).

### 입력 / 폼
- 입력: `--field` 배경, `1px --border`, `--radius-sm`. focus 시 `border-color:--accent` + `box-shadow:0 0 0 4px --accent-soft`.
- 작성 폼은 **단계별 섹션 카드** `.form-section`: 원형 번호 배지 `.form-section-num`(`--accent`) + 제목 + 설명. 하단 우측 정렬 액션바 `.form-actions`(취소=secondary, 저장=primary).
- 파일 업로드 `.thumb-uploader`: 점선 드롭존 `.thumb-dropzone`(`2px dashed`, hover 시 `--accent`/`--accent-soft`) → 선택 후 미리보기 `.thumb-preview` + 글래스 버튼(변경/제거).

### 태그/배지 · 저장
- `.tag-chip`: pill, `--accent-soft` 배경, `--accent` 글자, 13px/600.
- `.save-button`: pill 토글, 저장됨 상태 `.saved`는 `--accent-soft` 배경. `.save-count` 보조 텍스트.

### 헤더 `.site-header` / 푸터 `.site-footer`
- 헤더: `position:sticky; top:0`, 반투명 + `backdrop-filter:saturate(180%) blur(20px)`, 하단 `--border-soft`.
  좌측 로고(✈ 사각 배지 `.brand-mark`) · 가운데 nav(`.nav-link`, active = `--accent-soft`) · 우측 사용자 칩 `.user-chip`(아바타 이니셜+이름) 또는 로그인/회원가입.
- 푸터: `--surface` 배경, 소개 + 링크 + 카피라이트.

### 히어로 `.hero` (홈)
- 풀폭 배너: 배경 이미지 + `linear-gradient` 어두운 오버레이, 흰 텍스트 + text-shadow.
- 보조 버튼 `.hero-secondary-button`: 반투명 글래스(`rgba(255,255,255,.16)` + `backdrop-filter:blur`).

### 상태
- 로딩 `.status-text` · 오류 `.error-message`(`--danger`) · 빈 상태: 안내 문구 + 행동 유도 링크.

---

## 5. 모션 (`App.css` 하단)
- 페이지 진입: `@keyframes pageIn`(아래 10px → fade-up) → `.app-page,.auth-page { animation:pageIn .4s ease backwards }`. 라우트 재마운트 시 재생.
- 카드 stagger: `@keyframes cardIn` → `.post-card`/`.feature-card`/`.form-section`에 `animation-delay` 0.05s 간격.
- `animation-fill-mode:backwards` 사용 — 종료 후 기본 스타일로 복귀해 hover transform과 충돌 방지(`forwards` 쓰지 말 것).
- micro: 버튼 press `scale(.98)`, 카드 hover lift + 썸네일 `scale(1.04)`.
- 접근성: `@media (prefers-reduced-motion:reduce)`에서 애니메이션 off.

## 6. 반응형
- 브레이크포인트 `max-width:640px`: 카드 그리드 1열, 헤더 nav 줄바꿈, 버튼 full-width, 카드/패널 padding 축소, 히어로 패딩 축소.

---

## 7. 복붙용 프롬프트 (요약)
> Apple 스타일의 깔끔한 웹 UI. 배경 `#f5f5f7`, 콘텐츠는 흰 카드(모서리 18px, 은은한 그림자), 포인트 컬러 `#0071e3`. 버튼·태그·아바타는 pill(980px), 버튼 높이 46px, press 시 살짝 축소. 입력은 흰 배경+회색 테두리, focus 시 파란 글로우(4px). 제목은 굵게+음수 letter-spacing, 보조 텍스트 `#6e6e73`. 목록은 `repeat(auto-fill,minmax(280px,1fr))` 갤러리 그리드, 카드 상단 16:9 썸네일(없으면 파란 그라데이션). 헤더는 sticky + backdrop-blur. 페이지 전환·카드 등장에 fade-up 애니메이션(stagger), `prefers-reduced-motion` 존중. 색은 반드시 CSS 변수로.
