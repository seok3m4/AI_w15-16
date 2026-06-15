# Memento 디자인 시스템 — Mono Notebook

> **기준 산출물**: `docs/design/memento-style-preview.html` (v2 freeze 기준)  
> 이 문서의 모든 토큰·패턴은 HTML 미리보기를 통해 시각 검증된 값만 담는다.  
> 구현 시 이 문서를 단일 출처(source of truth)로 삼는다.

---

## 1. 문서 목적

이 문서는 Memento MVP 프런트엔드 구현의 디자인 계약서다. 두 가지 문제를 해결한다.

1. **추상 형용사 금지** — "따뜻한", "모던한" 같은 표현 대신 정확한 hex·단위·easing을 박는다.
2. **레퍼런스 앵커** — 어디서 무엇을 가져왔고 의도적으로 뺀 것은 무엇인지 기록한다.

연관 문서:

- `docs/REQUIREMENTS_MVP_TEXT_MEMORY.md` — 기능 요구사항, 권한 원칙(§6.2)
- `docs/API_SPEC_MVP_TEXT_MEMORY.md` — API path, 응답 스키마
- `docs/SCREEN_FLOW_MVP_TEXT_MEMORY.md` — 화면별 상세 흐름

---

## 2. 디자인 원칙

| # | 원칙 | 의미 |
|---|------|------|
| 1 | **잉크 위의 기억** | 모든 강조는 hue를 추가하지 않는다. 잉크 단일 톤에서 굵기·투명도·아이콘으로 계층을 만든다. |
| 2 | **밀도감 있는 노트북** | 카드는 숨이 막히지 않을 만큼 촘촘하게. 여백을 채우는 것이 아니라 기록을 최대한 보여주는 것이 목적이다. |
| 3 | **조용한 AI** | AI 기능은 색이 아니라 아이콘(magic-stars)과 테두리 힌트로 구분한다. 내용이 AI를 증명한다. |
| 4 | **움직임은 맥락을 준다** | 등장·호버·접힘 애니메이션은 모두 spring easing 하나로 통일한다. blur·흔들림 없이 이동과 투명도만 쓴다. |
| 5 | **접근성은 선택이 아니다** | 모든 인터랙티브 요소는 포커스 링, 대비비 WCAG AA 이상, 키보드 탐색을 충족한다. |

---

## 3. 레퍼런스 앵커

### 가져온 것

| 레퍼런스 | 가져온 요소 |
|----------|-------------|
| **Cal.com** | 화이트 캔버스 + 잉크 `#111` CTA 구조, hairline 카드 테두리, 다크 풋터 패턴 |
| **Intercom** | charcoal ink 단색 체계, 단일 강조색(Fin Orange → 잉크로 대체), zero drop shadow 기조 |
| **Clay.com** | 조밀한 카드 밀도, 데이터가 한 화면에 많이 보이는 모듈형 구성 |
| **Stoic** | 조용한 저널 톤, 기록 중심 IA |

### 의도적으로 뺀 것

| 뺀 것 | 이유 |
|-------|------|
| 세리프(Fraunces 등) | Pretendard 단일 산세리프로 통일 — 서체 혼용이 노트북 톤을 흐림 |
| 2번째 강조색(teal/pine) | 색으로 AI·친구를 구분하면 팔레트가 늘어나고 통일감이 깨짐 |
| 그림자 elevation 체계 | box-shadow 2단계만 사용, 복잡한 elevation depth 없음 |
| 모바일 앱 전용 레이아웃 | 웹 반응형만; 앱 전용 bottomsheet·탭바 패턴 제외 |
| 다크 모드 토큰 | MVP 범위 외 (light only 기준) |

---

## 4. 디자인 토큰

### 4.1 컬러

**프리뷰 표시 팔레트 — 중립 6 + 시맨틱 2**

`docs/design/memento-style-preview.html`의 스타일 타일에 노출된 8개 칩을 기준으로 한다. `soft`, `bodytext`는 구현 편의를 위한 역할 토큰이며, 새로운 강조 hue가 아니다. 대기 상태도 별도 전용 색 토큰을 만들지 않고 `ink` alpha와 `raised` 조합으로 처리한다.

| 이름 | hex | CSS 변수 | 용도 |
|------|-----|----------|------|
| `paper` | `#F1F0EC` | `--color-paper` | 전체 캔버스 배경 |
| `surface` | `#FFFFFF` | `--color-surface` | 카드·모달·인풋 배경 |
| `raised` | `#EAE9E4` | `--color-raised` | 아바타 배경, SNB 배지 배경 |
| `hairline` | `#E2E1DB` | `--color-hairline` | 구분선, 카드 테두리, 인풋 테두리 기본 |
| `muted` | `#94928C` | `--color-muted` | 날짜·부가 정보 텍스트, 아이콘 기본 |
| `ink` | `#18181B` | `--color-ink` | 헤딩, 강조 버튼 배경, 포커스 링 |
| `success` | `#3F7D4E` | `--color-success` | 성공 뱃지, 온라인 상태 도트 |
| `error` | `#B23B3B` | `--color-error` | 에러 텍스트·뱃지 |

**역할 보조 토큰**

| 이름 | hex | CSS 변수 | 용도 |
|------|-----|----------|------|
| `soft` | `#F6F5F2` | `--color-soft` | 인풋 기본 배경, AI 블록 배경 |
| `bodytext` | `#56554F` | `--color-bodytext` | 본문 텍스트 |

**CSS 변수**

```css
:root {
  --color-paper:     #F1F0EC;
  --color-surface:   #FFFFFF;
  --color-soft:      #F6F5F2;
  --color-raised:    #EAE9E4;
  --color-hairline:  #E2E1DB;
  --color-muted:     #94928C;
  --color-ink:       #18181B;
  --color-bodytext:  #56554F;
  --color-success:   #3F7D4E;
  --color-error:     #B23B3B;
}
```

**대비비 검증 (WCAG AA 기준 4.5:1)**

| 전경 | 배경 | 비율 | 판정 |
|------|------|------|------|
| `ink #18181B` | `paper #F1F0EC` | ~14.8:1 | ✅ AAA |
| `bodytext #56554F` | `surface #FFFFFF` | ~7.8:1 | ✅ AAA |
| `muted #94928C` | `surface #FFFFFF` | ~3.3:1 | ⚠️ 장식용만 (소형 본문 금지) |
| `surface #FFF` | `ink #18181B` | ~14.8:1 | ✅ 버튼 내 흰 텍스트 |
| `success #3F7D4E` | `surface #FFFFFF` | ~5.1:1 | ✅ AA |
| `error #B23B3B` | `surface #FFFFFF` | ~5.3:1 | ✅ AA |

### 4.2 타이포그래피

**서체** — Pretendard 단일. 한국어·영문 모두 동일 서체.

```css
font-family: 'Pretendard', system-ui, sans-serif;
-webkit-font-smoothing: antialiased;
word-break: keep-all; /* 한글 단어 단위 줄바꿈 */
```

**로딩** (HTML `<head>` 상단)

```html
<link rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.min.css" />
```

프로덕션에서는 서브셋 woff2 self-host 권장 (`pretendard-subset`).

**타입 스케일**

| 역할 | 클래스 기준 | size | weight | line-height | tracking |
|------|------------|------|--------|-------------|---------|
| Display | `.text-display` | 36–48px | 800 (extrabold) | tight (1.15) | `-0.02em` |
| Heading | `.text-heading` | 20px | 700 (bold) | snug (1.25) | `-0.01em` |
| Sub-heading | `.text-subhead` | 15–16px | 700 | snug | 0 |
| Body | `.text-body` | 15px | 400 | relaxed (1.65) | 0 |
| UI | `.text-ui` | 13–14px | 400–500 | normal | 0 |
| Caption | `.text-caption` | 12–13px | 400 | normal | 0 |
| Eyebrow | `.text-eyebrow` | 11px | 500 | normal | `+0.14em` |

Eyebrow는 항상 `uppercase` + `letter-spacing: 0.14em`. 본문 구분선 레이블, 섹션 제목 등에 사용.

### 4.3 스페이싱

Tailwind 4-unit(16px) 기준.

```
4  →  16px   (카드 내부 패딩 기본)
5  →  20px   (섹션 간 gap)
6  →  24px   (카드 패딩 확장)
7  →  28px
8  →  32px   (섹션 패딩)
12 →  48px
14 →  56px   (헤더 margin-bottom)
```

### 4.4 Radius

| 이름 | 값 | 용도 |
|------|-----|------|
| `rounded-xl` | 12px | 카드, 인풋, 모달 |
| `rounded-2xl` | 16px | 스타일 타일 패널, 큰 카드 |
| `rounded-full` | 9999px | 버튼 pill, 태그 칩, 아바타 |
| `rounded-lg` | 8px | citation 링크, 소형 뱃지 |

### 4.5 Shadow (2단계만)

```css
.shadow-softer {
  box-shadow:
    0 1px 2px rgba(24,24,27,.03),
    0 6px 16px -12px rgba(24,24,27,.12);
}
.shadow-soft {
  box-shadow:
    0 1px 2px rgba(24,24,27,.04),
    0 12px 30px -18px rgba(24,24,27,.18);
}
/* hover lift 상태 */
.lift:hover {
  box-shadow:
    0 1px 2px rgba(24,24,27,.05),
    0 16px 32px -22px rgba(24,24,27,.20);
}
```

`shadow-softer` → 카드 기본. `shadow-soft` → 모달·드롭다운. blur·spread 단계 추가 금지.

### 4.6 Border

```css
border: 1px solid var(--color-hairline);   /* 기본 카드·인풋 */
border: 1px solid var(--color-ink);        /* 포커스·강조 */
border: 1px solid rgba(24,24,27,.15);      /* AI 블록 (ink/15) */
border: 1px solid rgba(24,24,27,.25);      /* AI 배지 (ink/25) */
```

### 4.7 모션 (MOTION_INTENSITY 8)

`docs/design/memento-style-preview.html` v2 기준값인 `8`을 고정한다. 체감은 풍부하게 유지하되 blur, rotate, 과한 overshoot 없이 `opacity`, `translate`, `scale`만 사용한다.

```css
:root { --ease: cubic-bezier(0.16, 1, 0.3, 1); }

/* 등장 reveal — IntersectionObserver 트리거 */
.reveal {
  opacity: 0;
  transform: translateY(12px);
  transition: opacity .55s var(--ease), transform .55s var(--ease);
}
.reveal.in { opacity: 1; transform: none; }

/* 호버 lift */
.lift:hover { transform: translateY(-2px); }

/* 클릭 press */
.press:active { transform: scale(.98); }

/* AI 아이콘 breathe */
@keyframes breathe {
  0%,100% { transform: scale(1);   opacity: .85 }
  50%      { transform: scale(1.1); opacity: 1   }
}
.breathe { animation: breathe 3.8s var(--ease) infinite; }

/* 상태 도트 floaty */
@keyframes floaty {
  0%,100% { opacity: .55 }
  50%      { opacity: 1   }
}
.floaty { animation: floaty 2.6s ease-in-out infinite; }

/* 사이드바 collapse — CSS grid transition */
#shell { display: grid; grid-template-columns: 212px 1fr; transition: grid-template-columns .55s var(--ease); }
#shell.collapsed { grid-template-columns: 64px 1fr; }

/* reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .reveal { opacity: 1; transform: none; }
  .breathe, .floaty { animation: none; }
}
```

**모션 규칙 요약**

- easing은 `var(--ease)` 하나만 사용. ease-in-out / bounce 혼용 금지.
- reveal은 `translateY + opacity`만. blur·scale·rotate 추가 금지.
- duration: 등장 0.55s / SNB 토글 0.55s / 라벨 페이드 0.35s.
- `prefers-reduced-motion` 대응 필수.

---

## 5. 컴포넌트 프리미티브

### 5.1 버튼

| 종류 | 구조 | 배경 | 텍스트 | 테두리 |
|------|------|------|--------|--------|
| Primary | pill, 아이콘 우측 원형 | `ink` | white | none |
| Secondary | pill | `surface` | `ink` | `hairline` |
| Ghost / Link | no bg | `ink` | — | hover 시 gap 증가 |

```html
<!-- Primary -->
<button class="inline-flex items-center gap-2 bg-ink text-white rounded-full pl-4 pr-1.5 py-2 text-[13px] font-medium press">
  기록 작성
  <span class="w-6 h-6 rounded-full bg-white/15 grid place-items-center">
    <iconify-icon icon="solar:pen-new-square-linear"></iconify-icon>
  </span>
</button>

<!-- Secondary -->
<button class="inline-flex items-center gap-1.5 bg-surface text-ink border border-hairline rounded-full px-4 py-2 text-[13px] font-medium hover:bg-soft press">
  <iconify-icon icon="solar:users-group-rounded-linear"></iconify-icon>
  친구
</button>
```

### 5.2 인풋

```html
<div class="flex items-center gap-2 bg-soft border border-hairline rounded-xl px-3.5 py-2.5
            focus-within:border-ink focus-within:bg-surface transition-all duration-200">
  <iconify-icon icon="solar:magnifer-linear" class="text-muted"></iconify-icon>
  <input class="bg-transparent outline-none text-[14px] text-ink placeholder:text-muted w-full"
         placeholder="자연어로 검색" />
</div>
```

포커스 시: `border-ink`, `bg-surface`.  
에러 시: `border-error text-error`.

### 5.3 태그 칩

```html
<!-- 일반 태그 -->
<span class="bg-soft text-bodytext border border-hairline rounded-full px-2.5 py-1 text-[12px]"># 카페</span>

<!-- 강조 태그 -->
<span class="bg-raised text-ink rounded-full px-2.5 py-1 text-[12px] font-medium"># 회고</span>

<!-- AI 배지 -->
<span class="inline-flex items-center gap-1 border border-ink/25 text-ink rounded-full px-2 py-1 text-[12px] font-medium">
  <iconify-icon icon="solar:magic-stars-linear" class="breathe"></iconify-icon> AI
</span>

<!-- 친구 배지 -->
<span class="inline-flex items-center gap-1 border border-hairline text-muted rounded-full px-2 py-1 text-[12px]">
  <iconify-icon icon="solar:users-group-rounded-linear"></iconify-icon> 친구
</span>
```

### 5.4 메모리 포스트 카드

```html
<article class="lift bg-surface border border-hairline rounded-xl p-4 shadow-softer transition-all duration-500">
  <!-- 작성자 + 날짜 -->
  <div class="flex items-center gap-2 text-[12px] text-muted mb-1.5">
    <span class="w-5 h-5 rounded-full bg-raised text-ink grid place-items-center text-[10px] font-bold">윤</span>
    하윤서 · 3일 전
  </div>
  <!-- 제목 -->
  <h3 class="text-ink text-[15px] font-bold leading-snug mb-1">제목</h3>
  <!-- 본문 요약 -->
  <p class="text-bodytext text-[13.5px] leading-relaxed mb-2.5">본문 텍스트…</p>
  <!-- 태그 + 액션 -->
  <div class="flex items-center justify-between">
    <div class="flex gap-1">
      <span class="bg-soft border border-hairline rounded-full px-2 py-0.5 text-[11px]"># 태그</span>
    </div>
    <div class="flex items-center gap-2.5 text-muted text-[12px]">
      <span class="inline-flex items-center gap-1">
        <iconify-icon icon="solar:heart-linear"></iconify-icon> 4
      </span>
      <span class="inline-flex items-center gap-1">
        <iconify-icon icon="solar:chat-round-linear"></iconify-icon> 2
      </span>
    </div>
  </div>
</article>
```

### 5.5 AI 답변 블록 + 근거 인용

```html
<div class="rounded-xl border border-ink/15 bg-soft p-4">
  <!-- AI 헤더 -->
  <div class="flex items-center gap-1.5 mb-1.5 text-ink">
    <iconify-icon icon="solar:magic-stars-bold" class="breathe"></iconify-icon>
    <span class="text-[12px] font-bold">AI 요약</span>
  </div>
  <!-- 답변 텍스트 -->
  <p class="text-ink text-[13.5px] leading-relaxed mb-2.5">
    작년 가을 비 오는 날 카페에서 집중이 잘 됐다고 남긴 기록이 있어요.
  </p>
  <!-- citation 링크 -->
  <div class="flex flex-wrap gap-1.5">
    <a class="inline-flex items-center gap-1 bg-surface border border-hairline rounded-lg px-2 py-1 text-[12px] text-ink hover:border-ink transition-all duration-200">
      <iconify-icon icon="solar:document-text-linear"></iconify-icon>
      성수동 카페
    </a>
  </div>
  <!-- 면책 고지 (친구 기록 기반 답변 시) -->
  <!-- <p class="text-[11px] text-muted mt-2">
    친구가 AI 공유에 동의한 기록만을 기반으로 답합니다.
  </p> -->
</div>
```

AI 구분 원칙: 별도 배경 hue 없음. `border border-ink/15` + `bg-soft` + `solar:magic-stars-bold` breathe 아이콘으로만 구분.

### 5.6 승인 대기 카드 (Agent)

```html
<div class="rounded-xl border border-ink/20 bg-surface p-4">
  <div class="flex items-center gap-2 mb-2">
    <iconify-icon icon="solar:clock-circle-bold" class="text-ink floaty"></iconify-icon>
    <span class="text-[13px] font-bold text-ink">승인 대기</span>
    <span class="ml-auto bg-raised text-ink rounded-full px-2 py-0.5 text-[11px] font-medium">대기 중</span>
  </div>
  <p class="text-bodytext text-[13px] mb-3">에이전트가 외부 쓰기 액션을 요청했습니다.</p>
  <div class="flex gap-2">
    <button class="flex-1 bg-ink text-white rounded-full py-1.5 text-[13px] font-medium press">승인</button>
    <button class="flex-1 bg-surface text-error border border-error/30 rounded-full py-1.5 text-[13px] font-medium press">거부</button>
  </div>
</div>
```

대기 상태는 별도 전용 색을 만들지 않는다. `ink`, `ink/20`, `raised` 조합과 `.floaty`만 사용한다.

### 5.7 네비게이션 (SNB — 사이드 내비게이션 바)

```html
<nav id="shell" class="min-h-[100dvh]">
  <!-- sidebar: 212px ↔ 64px CSS grid -->
  <aside class="bg-surface border-r border-hairline flex flex-col py-5 px-3 overflow-hidden">
    <!-- 로고 -->
    <div class="wordmark-full text-ink font-bold text-[16px] px-3 mb-6">Memento</div>
    <div class="wordmark-mini hidden text-ink font-bold text-[16px] text-center mb-6">M</div>
    <!-- nav item -->
    <a class="nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] text-bodytext hover:bg-soft hover:text-ink">
      <iconify-icon icon="solar:home-2-linear"></iconify-icon>
      <span class="nav-label">홈</span>
    </a>
    <!-- ... -->
    <!-- 토글 버튼 -->
    <button id="snb-toggle" class="mt-auto mx-auto w-8 h-8 rounded-full bg-raised grid place-items-center text-muted hover:text-ink">
      <iconify-icon icon="solar:sidebar-minimalistic-linear"></iconify-icon>
    </button>
  </aside>
  <!-- main content -->
  <main>…</main>
</nav>
```

상태: `#shell.collapsed { grid-template-columns: 64px 1fr }`.  
레이블: `white-space:nowrap` 유지 → collapse 시 `opacity:0; transform:translateX(-6px)`.

### 5.8 모달 · 시트

- 배경 오버레이: `bg-ink/40 backdrop-blur-[2px]`
- 패널: `bg-surface rounded-2xl shadow-soft p-6 max-w-md w-full`
- 열림/닫힘: `opacity + scale(0.97 → 1)`, `--ease`, 0.3s

### 5.9 토스트

```html
<div class="fixed bottom-5 left-1/2 -translate-x-1/2 z-50
            bg-ink text-white rounded-full px-5 py-2.5 text-[13px] font-medium
            shadow-soft flex items-center gap-2">
  <iconify-icon icon="solar:check-circle-linear"></iconify-icon>
  저장되었습니다
</div>
```

성공: `bg-ink`. 에러: `bg-error`. 위치: `bottom-5 center`. 자동 소멸: 3s.

### 5.10 빈 상태 / 로딩 / 에러 패턴

**빈 상태 (Empty State)**

```html
<div class="flex flex-col items-center justify-center py-16 text-center">
  <iconify-icon icon="solar:notebook-minimalistic-linear" class="text-4xl text-muted mb-3"></iconify-icon>
  <p class="text-[15px] font-bold text-ink mb-1">아직 기록이 없어요</p>
  <p class="text-[13px] text-muted mb-4">첫 번째 기억을 남겨보세요.</p>
  <button class="bg-ink text-white rounded-full px-5 py-2 text-[13px] font-medium press">기록 작성</button>
</div>
```

**로딩 스켈레톤**

```html
<!-- 카드 스켈레톤 -->
<div class="bg-surface border border-hairline rounded-xl p-4 animate-pulse">
  <div class="h-3 bg-raised rounded-full w-1/3 mb-3"></div>
  <div class="h-4 bg-raised rounded-full w-3/4 mb-2"></div>
  <div class="h-3 bg-raised rounded-full w-full mb-1"></div>
  <div class="h-3 bg-raised rounded-full w-4/5"></div>
</div>
```

**에러 패턴**

- 인라인 에러: `text-error text-[12px]` — 인풋 하단
- 페이지 에러: empty state 구조 + error 아이콘 + "다시 시도" 버튼

### 5.11 아이콘

**라이브러리**: Iconify Solar (`solar:*`) 단독 사용.

```html
<script src="https://code.iconify.design/iconify-icon/2.3.0/iconify-icon.min.js"></script>
```

| 기능 | 아이콘 |
|------|--------|
| 홈 | `solar:home-2-linear` |
| 검색 | `solar:magnifer-linear` |
| 작성 | `solar:pen-new-square-linear` |
| 좋아요 | `solar:heart-linear` / `solar:heart-bold` |
| 댓글 | `solar:chat-round-linear` |
| AI 기능 | `solar:magic-stars-bold` (breathe) / `solar:magic-stars-linear` |
| 친구 | `solar:users-group-rounded-linear` |
| Capsule | `solar:box-minimalistic-linear` |
| Agent | `solar:robot-linear` |
| MCP | `solar:plug-circle-linear` |
| 설정 | `solar:settings-linear` |
| 문서 (citation) | `solar:document-text-linear` |
| 대기 | `solar:clock-circle-bold` (floaty) |
| 노트북/로고 | `solar:notebook-minimalistic-linear` |
| SNB 토글 | `solar:sidebar-minimalistic-linear` |
| 화살표 | `solar:alt-arrow-right-linear` |
| 체크 | `solar:check-circle-linear` |

규칙: `linear` 계열 기본 → 강조 상태는 `bold` 계열. 타 라이브러리(Heroicons 등) 혼용 금지.  
`aria-hidden="true"` 항상 추가. 의미 있는 아이콘은 `aria-label` 명시.

---

## 6. 레이아웃 그리드 · 반응형

### 6.1 전체 쉘 구조

```
[SNB 212px] [Main content 1fr]
```

- SNB collapsed: `64px`
- 최대 콘텐츠 폭: `max-w-[1120px]`
- 인증 전 페이지 (로그인·가입): `max-w-lg` 중앙 정렬 또는 2-column (폼 + 브랜드)

### 6.2 반응형 브레이크포인트 (웹 기준)

| 이름 | 값 | 설명 |
|------|-----|------|
| `sm` | 640px | 작은 화면 (2-column 해제) |
| `md` | 768px | 중간 화면 |
| `lg` | 1024px | SNB 표시 기본 |
| `xl` | 1280px | 넉넉한 레이아웃 |

모바일(`< 640px`): SNB 숨김 + 상단 헤더 패턴. 단, 모바일 앱 전용 레이아웃(바텀탭·시트)은 MVP 범위 외.

### 6.3 콘텐츠 그리드

| 영역 | 그리드 |
|------|--------|
| 메모리 피드 카드 목록 | `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, gap-4 |
| Capsule 목록 | `grid-cols-1 md:grid-cols-2`, gap-4 |
| 스타일 타일 색 칩 | `grid-cols-4 sm:grid-cols-8`, gap-2.5 |
| 설정 폼 | single column, max-w-xl |

---

## 7. 접근성 기준

| 항목 | 기준 |
|------|------|
| 본문 텍스트 대비 | WCAG AA (4.5:1 이상) |
| 대형 텍스트 (18px bold, 24px+) | WCAG AA (3:1 이상) |
| 장식용 `muted` 텍스트 | 본문 정보 전달 금지 — 날짜·부가설명에만 허용 |
| 포커스 링 | `focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2` |
| 키보드 탐색 | Tab 순서 논리적 유지, SNB 아이템 모두 focusable |
| 아이콘 접근성 | 장식: `aria-hidden="true"` / 의미: `aria-label` 명시 |
| 모션 | `prefers-reduced-motion: reduce` 시 reveal·breathe·floaty 비활성화 |
| 최소 터치 타겟 | 44×44px (버튼 pill은 py-2 + px-4로 충족) |

---

## 8. 구현 매핑

### 8.1 Tailwind 커스텀 토큰

```js
// tailwind.config.js (또는 vite.config.ts 내 tailwind 옵션)
theme: {
  extend: {
    fontFamily: {
      sans: ['Pretendard', 'system-ui', 'sans-serif'],
    },
    colors: {
      paper:    '#F1F0EC',
      surface:  '#FFFFFF',
      soft:     '#F6F5F2',
      raised:   '#EAE9E4',
      hairline: '#E2E1DB',
      ink:      '#18181B',
      bodytext: '#56554F',
      muted:    '#94928C',
      success:  '#3F7D4E',
      error:    '#B23B3B',
    },
  },
},
```

### 8.2 CSS 전역 변수 (index.css)

```css
:root {
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
  --color-paper:    #F1F0EC;
  --color-surface:  #FFFFFF;
  --color-soft:     #F6F5F2;
  --color-raised:   #EAE9E4;
  --color-hairline: #E2E1DB;
  --color-muted:    #94928C;
  --color-ink:      #18181B;
  --color-bodytext: #56554F;
  --color-success:  #3F7D4E;
  --color-error:    #B23B3B;
}

* { word-break: keep-all; }
body {
  background: var(--color-paper);
  color: var(--color-bodytext);
  font-family: 'Pretendard', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

### 8.3 Grain 텍스처 오버레이

```css
/* index.css — 전역 grain layer */
.grain {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  opacity: .028;
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
```

```html
<!-- App.tsx 최상단 -->
<div class="grain" aria-hidden="true"></div>
```

콘텐츠 영역은 `z-index: 2` 이상 유지.

### 8.4 React 컴포넌트 구조 제안

```
src/
  components/
    ui/          ← 범용 프리미티브 (Button, Input, Tag, Toast, Modal)
    memory/      ← 도메인 (PostCard, AIBlock, CitationLink, CommentItem)
    layout/      ← SNB, Shell, PageHeader
    agent/       ← ApprovalCard, AgentStepList
    capsule/     ← CapsuleCard, CapsuleDetail
  styles/
    globals.css  ← :root 변수 + grain + motion + reveal
```

---

## 9. Do / Don't

| Do | Don't |
|----|-------|
| `paper #F1F0EC` 캔버스에서 시작 | `surface #FFF` 를 캔버스로 쓰지 말 것 (카드 구분 안 됨) |
| AI 구분은 `magic-stars` 아이콘 + `border-ink/15` + `bg-soft` | AI에 teal·purple·파란색 배경 추가 |
| 버튼 Primary는 `bg-ink` pill 단독 | 그라디언트·그림자 강한 버튼 |
| 아이콘은 Iconify Solar만 | Heroicons, Feather, Lucide 혼용 |
| 카드 테두리 `border-hairline`, hover엔 `lift` | `drop-shadow` heavy 카드 |
| `word-break: keep-all` 전역 적용 | CJK 텍스트 강제 `break-all` |
| 포커스 링 `ring-ink ring-offset-2` | 기본 outline 제거 후 대체 없음 |
| `prefers-reduced-motion` 분기 | 항상 애니메이션 강제 |
| SNB 212px ↔ 64px CSS grid transition | SNB width px 직접 조작 또는 display:none 토글 |
| Pretendard 단일 서체 | Pretendard + 세리프 혼용 |
| `min-h-[100dvh]` | `h-screen` (iOS 주소창 오버랩 문제) |
| Eyebrow는 uppercase + letter-spacing 0.14em | uppercase 텍스트에 tracking 없음 |
