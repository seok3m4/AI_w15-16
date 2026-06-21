import Link from "next/link";

const sourceLinks = [
  {
    label: "KBO 공식 웹",
    href: "https://www.koreabaseball.com/",
    description:
      "일정/결과, 게임센터, 스코어보드, 기록/순위, 선수, 미디어/뉴스, 티켓 안내 등 전체 메뉴 구조 확인",
  },
  {
    label: "KBO 공식 모바일",
    href: "https://m.koreabaseball.com/",
    description:
      "모바일 홈의 경기일정/결과, 팀순위, 개인순위, 선수검색, NOTICE, KBO 소식 배치 확인",
  },
  {
    label: "Google Play KBO 앱",
    href: "https://play.google.com/store/apps/details?id=com.sports2i.kbo",
    description:
      "공식 앱 설명, 100K+ 다운로드, 푸시 알림 권한, 커뮤니티 파일 권한, 업데이트 정보 확인",
  },
];

const verifiedFacts = [
  {
    source: "KBO 공식 모바일",
    checkedAt: "2026-06-21",
    observed:
      "모바일 홈에서 경기일정/결과, KBO 리그 팀순위, 개인순위, 선수검색, NOTICE, KBO 소식이 핵심 정보로 배치되어 있습니다.",
    usedFor:
      "내 앱 홈을 오늘 경기, 응원팀, 순위/기록, 뉴스, 글쓰기 흐름으로 재구성했습니다.",
  },
  {
    source: "KBO 공식 웹",
    checkedAt: "2026-06-21",
    observed:
      "공식 웹은 일정/결과, 게임센터, 스코어보드, 야구장 날씨, 기록/순위, 선수, 미디어/뉴스를 큰 메뉴로 제공합니다.",
    usedFor:
      "분리된 메뉴를 경기방 하나로 모아 선발, 라인업, 문자중계, 박스스코어, 관련 글을 한 화면에 배치했습니다.",
  },
  {
    source: "Google Play KBO 앱",
    checkedAt: "2026-06-21",
    observed:
      "KBO 앱은 한국프로야구 공식 앱으로 등록되어 있고, 앱 상태 확인, 네트워크 연결 확인, 푸시 알림, 커뮤니티 파일 권한을 안내합니다.",
    usedFor:
      "Android WebView 셸, 앱 실행 상태 패널, 공유/새로고침/외부 브라우저 bridge, 이미지 첨부 글쓰기 흐름을 설계했습니다.",
  },
];

const implementationTrace = [
  {
    reference: "경기일정/결과 + 게임센터 + 스코어보드",
    implemented: "앱 경기방",
    proof: "/mobile-app/games/[gameId]",
    description:
      "경기 하나를 선택하면 스코어, 선발투수, 라인업, 문자중계, 박스스코어, 관련 글 요약을 이어서 확인합니다.",
  },
  {
    reference: "팀순위 + 개인순위 + 기록실",
    implemented: "순위/기록 탭",
    proof: "/mobile-app, /records",
    description:
      "모바일 첫 화면에서는 팀 순위를 가볍게 보고, 자세한 선수 기록은 기록실 화면으로 이동하도록 나눴습니다.",
  },
  {
    reference: "KBO 소식 + 뉴스",
    implemented: "뉴스 브리핑과 글쓰기 연결",
    proof: "/mobile-app 뉴스 탭",
    description:
      "뉴스를 단순히 읽고 끝내지 않고 URL 브리핑을 만든 뒤 게시글 작성으로 이어지게 했습니다.",
  },
  {
    reference: "공식 앱 권한/앱 상태",
    implemented: "Android bridge와 알림 설정",
    proof: "MY > 앱 연동 상태, MY > 알림 설정",
    description:
      "앱 버전, 시작 URL, 딥링크, 공유, Toast, 새로고침, 외부 브라우저 열기와 알림 권한 확인 흐름을 확인할 수 있습니다.",
  },
  {
    reference: "커뮤니티 글 작성 파일 권한",
    implemented: "이미지 첨부 글쓰기",
    proof: "/posts/new, /mobile-app/write",
    description:
      "디시인사이드식 이미지 첨부 흐름처럼 글쓰기 중 사진을 추가하고 게시글 본문에 함께 등록할 수 있게 했습니다.",
  },
];

const observations = [
  {
    area: "메뉴 구조",
    finding:
      "공식 웹은 일정/결과, 게임센터, 스코어보드, 기록/순위, 선수, 미디어/뉴스, KBO 리그 정보를 넓게 제공합니다.",
    implication:
      "정보량은 충분하지만 모바일 첫 화면에서는 사용자가 오늘 필요한 정보만 빠르게 고르기 어렵습니다.",
  },
  {
    area: "모바일 홈",
    finding:
      "모바일 홈은 경기일정/결과, 팀순위, 개인순위, 선수검색, NOTICE, KBO 소식이 중심입니다.",
    implication:
      "경기, 순위, 기록이 한 화면에 있지만 응원팀 기준의 우선순위나 개인화 동선은 약하게 느껴집니다.",
  },
  {
    area: "경기 정보",
    finding:
      "공식 모바일에는 경기일정/결과, 하이라이트, 야구장 날씨, 기록실로 이동하는 메뉴가 분리되어 있습니다.",
    implication:
      "경기 하나를 기준으로 일정, 날씨, 중계, 기록, 하이라이트를 묶는 경기방 구조가 개선 포인트가 됩니다.",
  },
  {
    area: "앱 권한/알림",
    finding:
      "Google Play 설명 기준 공식 앱은 푸시 알림과 커뮤니티 파일 읽기/저장 권한을 사용합니다.",
    implication:
      "스코어 알림, 메시지 알림, 커뮤니티 참여를 사용자가 직접 제어하는 설정 화면이 중요합니다.",
  },
];

const journeySteps = [
  {
    phase: "경기 전",
    userNeed: "오늘 경기 일정, 선발투수, 야구장 날씨, 예매 정보를 빠르게 확인",
    improvement:
      "공식 모바일에 분리된 일정/날씨/티켓 정보를 응원팀 경기방에서 한 번에 확인",
  },
  {
    phase: "경기 중",
    userNeed: "스코어, 문자중계, 기록 변화, 팬 반응을 보며 경기 흐름 파악",
    improvement: "실시간 경기방에서 스코어보드, 중계, 주요 기록을 탭 구조로 제공",
  },
  {
    phase: "경기 후",
    userNeed: "결과, 하이라이트, 박스스코어, 승부처를 다시 확인",
    improvement:
      "공식 웹의 게임센터/스코어보드/하이라이트 흐름을 경기방 복기 화면으로 연결",
  },
  {
    phase: "시즌 중",
    userNeed: "순위, 선수 기록, 팀 이슈, 뉴스 흐름을 꾸준히 추적",
    improvement:
      "팀순위, 개인순위, 기록실, KBO 소식을 응원팀 기준 개인화 홈으로 재배치",
  },
];

const improvementCards = [
  {
    title: "응원팀 기반 개인화 홈",
    problem:
      "공식 모바일 홈은 경기일정/팀순위/개인순위를 함께 보여주지만, 사용자가 응원팀 정보를 먼저 보도록 정렬되지는 않습니다.",
    solution:
      "응원팀을 설정하면 오늘 경기, 팀 순위, 최근 뉴스, 관련 글을 홈 상단에 묶어 보여줍니다.",
    outcome: "첫 진입 후 주요 콘텐츠 도달 시간을 줄이고 재방문 동기를 만듭니다.",
  },
  {
    title: "경기방 중심 정보 통합",
    problem:
      "공식 메뉴는 경기일정/결과, 게임센터, 스코어보드, 하이라이트, 야구장 날씨가 각각 존재해 경기 맥락이 분리됩니다.",
    solution:
      "경기 전/중/후 상태에 따라 선발, 라인업, 문자중계, 박스스코어, 관련 글을 순서대로 배치합니다.",
    outcome: "팬이 경기 하나를 중심으로 앱을 사용하는 흐름이 자연스러워집니다.",
  },
  {
    title: "기록실 탐색 개선",
    problem:
      "모바일 기록실은 팀기록/개인기록/TOP5와 타자/투수 지표가 많아 작은 화면에서 비교 부담이 큽니다.",
    solution:
      "타자/투수 탭, 주요 지표 정렬, 선수 카드형 요약을 제공해 작은 화면에서도 비교가 가능하게 합니다.",
    outcome: "기록 확인 목적의 사용자가 더 오래 머물고 다시 방문할 수 있습니다.",
  },
  {
    title: "뉴스와 커뮤니티 연결",
    problem:
      "KBO 소식, 뉴스, 하이라이트는 제공되지만 읽은 뒤 경기방이나 팬 의견으로 이어지는 참여 동선은 약합니다.",
    solution:
      "뉴스 상세에서 경기방, 관련 게시글, URL 브리핑으로 연결해 읽기 이후 행동을 만듭니다.",
    outcome: "콘텐츠 소비가 게시글 작성과 댓글 참여로 이어질 수 있습니다.",
  },
];

const implementationCards = [
  {
    title: "모바일 앱 홈",
    description:
      "웹 게시판의 경기, 기록, 뉴스, 인기글, 응원팀 설정을 모바일 앱 흐름으로 재구성했습니다.",
    evidence: "/mobile-app",
  },
  {
    title: "PWA 설치 흐름",
    description:
      "manifest, 앱 아이콘, service worker, 홈 화면 추가 안내를 붙여 모바일 브라우저에서도 앱처럼 실행할 수 있게 했습니다.",
    evidence: "/manifest.webmanifest",
  },
  {
    title: "Android WebView 셸",
    description:
      "Android Studio에서 열 수 있는 앱 프로젝트를 추가하고, WebView가 Next.js의 /mobile-app을 로드하며 이미지 첨부 파일 선택과 로컬 알림까지 처리하도록 연결했습니다.",
    evidence: "android/",
  },
  {
    title: "웹-앱 Bridge",
    description:
      "Android Toast, 공유 시트, 새로고침, 외부 브라우저 열기 기능을 window.KboFanHubAndroid bridge로 연결했습니다.",
    evidence: "window.KboFanHubAndroid",
  },
  {
    title: "딥링크",
    description:
      "kbofanhub://posts, kbofanhub://games, kbofanhub://write 링크로 웹 화면에서 앱 화면으로 이동할 수 있게 설계했습니다.",
    evidence: "kbofanhub://",
  },
  {
    title: "앱 연동 상태 패널",
    description:
      "MY 탭에서 현재 실행 환경, 앱 시작 URL, 딥링크, bridge 기능 상태를 확인할 수 있게 했습니다.",
    evidence: "MY > 앱 연동 상태",
  },
  {
    title: "응원팀 알림 설정",
    description:
      "공식 앱의 푸시 알림 권한 흐름을 참고해 경기 시작, 라인업, 팀 뉴스, 댓글 반응 알림을 사용자가 직접 켜고 끌 수 있게 했습니다.",
    evidence: "MY > 알림 설정",
  },
];

const dataIdeas = [
  "응원팀, 자주 보는 팀, 기록실 조회 지표를 기반으로 홈 콘텐츠 우선순위 조정",
  "경기일정/결과, 야구장 날씨, 기록실, 하이라이트 이동 로그를 이벤트로 수집",
  "경기 종료 후 사용자가 많이 본 기록과 댓글 흐름을 묶어 경기 회고 콘텐츠 추천",
  "푸시 알림은 경기 시작, 점수 변화, 하이라이트, 관심 선수 기록 단위로 세분화",
  "개인화 추천은 출처와 기준을 함께 보여주고, 사용자가 설정을 끌 수 있게 설계",
];

const roadmap = [
  {
    step: "1단계",
    title: "탐색 구조 정리",
    items: ["응원팀 설정", "개인화 홈", "경기방 중심 일정/기록 연결"],
  },
  {
    step: "2단계",
    title: "콘텐츠 연결 강화",
    items: ["뉴스와 경기방 연결", "경기 리뷰 작성 동선", "선수 기록 상세 진입"],
  },
  {
    step: "3단계",
    title: "데이터 기반 개선",
    items: ["이벤트 로그 설계", "사용 지표 대시보드", "개인화 추천 실험"],
  },
];

const metrics = [
  "홈에서 응원팀 경기방까지의 클릭 수",
  "경기방 진입률과 평균 체류 시간",
  "뉴스에서 경기방 또는 게시글로 이어지는 전환율",
  "기록실 정렬/검색 사용률",
  "게시글 작성, 댓글, 추천 같은 커뮤니티 참여율",
  "재방문율과 응원팀 설정 유지율",
];

const runbookSteps = [
  {
    title: "웹앱 실행",
    command: "npm.cmd run mobile:dev",
    description:
      "Next.js 서버를 외부 접속 가능한 개발 모드로 실행합니다. Android WebView는 이 서버의 /mobile-app 화면을 로드합니다.",
  },
  {
    title: "정적 검증",
    command: "npm.cmd run mobile:check",
    description:
      "모바일 앱 화면, PWA 설정, Android bridge, 실행 스크립트, Android 프로젝트 파일이 빠지지 않았는지 확인합니다.",
  },
  {
    title: "Android 환경 점검",
    command: "npm.cmd run android:doctor",
    description:
      "Android Studio, SDK, local.properties, 연결된 디바이스 또는 에뮬레이터 준비 상태를 한 번에 확인합니다.",
  },
  {
    title: "Android Studio 실행",
    command: "npm.cmd run android:open",
    description:
      "android/ 프로젝트를 Android Studio로 열고, 에뮬레이터나 실제 기기에서 WebView 앱을 실행합니다.",
  },
];

export function KboAppImprovementPage() {
  return (
    <section className="page-shell">
      <div className="community-panel">
        <div className="border-b border-[#d8deea] bg-white px-4 py-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              <p className="text-xs font-black text-[#d71920]">
                Portfolio Case Study
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[#071a3d]">
                KBO 앱 개선 제안서
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#4b5563]">
                KBO 공식 웹, 공식 모바일 페이지, Google Play 공식 앱 정보를
                기준으로 메뉴 구조와 모바일 사용 흐름을 살펴보고, 야구 팬이
                경기 전/중/후에 필요한 정보를 더 짧은 동선으로 확인하도록
                개선 방향을 정리한 포트폴리오 문서입니다.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["서비스 기획", "모바일 UX", "데이터 분석", "개인화 홈"].map(
                  (label) => (
                    <span className="community-chip" key={label}>
                      {label}
                    </span>
                  ),
                )}
              </div>
            </div>

            <aside className="community-subpanel bg-[#fbfcff] p-4">
              <h2 className="text-sm font-black text-[#071a3d]">
                문서 목적
              </h2>
              <dl className="mt-3 grid gap-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="font-bold text-[#667085]">목표 직무</dt>
                  <dd className="text-right font-black text-[#202632]">
                    앱 서비스 기획 / 데이터 분석 지원
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="font-bold text-[#667085]">핵심 관점</dt>
                  <dd className="text-right font-black text-[#202632]">
                    팬 여정, 정보 구조, 재방문
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="font-bold text-[#667085]">분석 기준</dt>
                  <dd className="text-right font-black text-[#202632]">
                    공식 공개 화면 / 앱스토어 정보
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="font-bold text-[#667085]">구현 연결</dt>
                  <dd className="text-right font-black text-[#202632]">
                    현재 게시판 MVP 기능과 연계
                  </dd>
                </div>
              </dl>
              <p className="mt-4 border-t border-[#d8deea] pt-3 text-xs leading-5 text-[#667085]">
                내부 운영 데이터나 비공개 기획 문서는 사용하지 않았고, 공개된
                공식 서비스 화면과 앱스토어 설명을 기준으로 작성했습니다.
              </p>
            </aside>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="border-b border-[#d8deea] bg-[#fbfcff] p-4 lg:border-b-0 lg:border-r">
            <nav className="grid gap-2 text-sm font-black">
              {[
                ["분석 기준", "#sources"],
                ["확인 요소", "#verified-facts"],
                ["구현 결과", "#implementation"],
                ["구현 매핑", "#implementation-trace"],
                ["문제 정의", "#problem"],
                ["관찰 근거", "#observations"],
                ["팬 여정", "#journey"],
                ["개선안", "#improvements"],
                ["데이터 활용", "#data"],
                ["로드맵", "#roadmap"],
                ["실행/검증", "#runbook"],
                ["성과 지표", "#metrics"],
              ].map(([label, href]) => (
                <a
                  className="rounded-sm border border-[#d8deea] bg-white px-3 py-2 text-[#1f3470] hover:border-[#2f4f9f] hover:bg-[#eef3ff]"
                  href={href}
                  key={href}
                >
                  {label}
                </a>
              ))}
            </nav>
            <Link
              className="community-button-primary mt-4 w-full"
              href="/mobile-app"
            >
              구현 앱 보기
            </Link>
          </aside>

          <div className="space-y-5 p-4">
            <section
              className="community-subpanel scroll-mt-24 bg-white p-4"
              id="sources"
            >
              <h2 className="text-xl font-black text-[#071a3d]">분석 기준</h2>
              <p className="mt-3 text-sm leading-7 text-[#344054]">
                KBO가 공개한 공식 웹/모바일 화면과 Google Play 공식 앱 정보를
                기준으로 메뉴 구조, 정보 배치, 앱 권한, 커뮤니티 작성 흐름을
                확인했습니다. 아래 근거를 현재 구현한 모바일 앱 화면과 직접
                연결해 개선안을 정리했습니다.
              </p>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {sourceLinks.map((source) => (
                  <a
                    className="rounded-sm border border-[#d8deea] bg-[#fbfcff] p-3 hover:border-[#2f4f9f] hover:bg-white"
                    href={source.href}
                    key={source.href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <p className="text-sm font-black text-[#1f3470]">
                      {source.label}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[#667085]">
                      {source.description}
                    </p>
                    <p className="mt-3 text-xs font-black text-[#d71920]">
                      원문 보기
                    </p>
                  </a>
                ))}
              </div>
            </section>

            <section
              className="community-subpanel scroll-mt-24 bg-white p-4"
              id="verified-facts"
            >
              <h2 className="text-xl font-black text-[#071a3d]">
                확인한 공식 화면 요소
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#344054]">
                공식 서비스에서 확인한 요소를 그대로 나열하는 데서 끝내지 않고,
                내 앱에서는 어떤 사용자 흐름으로 바꿨는지 함께 정리했습니다.
              </p>
              <div className="mt-4 grid gap-3">
                {verifiedFacts.map((fact) => (
                  <article
                    className="rounded-sm border border-[#d8deea] bg-[#fbfcff] p-4"
                    key={`${fact.source}-${fact.observed}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-black text-[#d71920]">
                        {fact.source}
                      </p>
                      <span className="rounded-sm bg-white px-2 py-1 text-xs font-black text-[#667085]">
                        확인일 {fact.checkedAt}
                      </span>
                    </div>
                    <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                      <div>
                        <dt className="font-black text-[#1f3470]">
                          확인한 내용
                        </dt>
                        <dd className="mt-1 leading-6 text-[#344054]">
                          {fact.observed}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-black text-[#1f3470]">
                          내 앱에 반영한 방식
                        </dt>
                        <dd className="mt-1 leading-6 text-[#344054]">
                          {fact.usedFor}
                        </dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </section>

            <section
              className="community-subpanel scroll-mt-24 bg-white p-4"
              id="implementation"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-[#071a3d]">
                    구현 결과
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-[#344054]">
                    개선안은 문서로만 남기지 않고, 현재 웹 게시판과 연결되는
                    모바일 앱 화면, PWA 설치 흐름, Android WebView 셸,
                    bridge, 딥링크까지 MVP로 구현했습니다.
                  </p>
                </div>
                <Link
                  className="community-button-primary community-button-compact"
                  href="/mobile-app"
                >
                  앱 화면 열기
                </Link>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {implementationCards.map((card) => (
                  <article
                    className="rounded-sm border border-[#d8deea] bg-[#fbfcff] p-4"
                    key={card.title}
                  >
                    <p className="text-sm font-black text-[#1f3470]">
                      {card.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#344054]">
                      {card.description}
                    </p>
                    <p className="mt-3 rounded-sm bg-white px-2 py-1 text-xs font-black text-[#d71920]">
                      {card.evidence}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section
              className="community-subpanel scroll-mt-24 bg-white p-4"
              id="implementation-trace"
            >
              <h2 className="text-xl font-black text-[#071a3d]">
                공식 앱 요소와 구현 매핑
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#344054]">
                KBO 공식 서비스에서 확인한 요소를 그대로 복제하기보다, 팬이
                경기와 게시글을 오가며 쓰기 쉬운 흐름으로 다시 묶었습니다.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[820px] border-collapse text-sm">
                  <thead>
                    <tr className="border-y border-[#d8deea] bg-[#f6f8fc] text-left text-[#667085]">
                      <th className="px-3 py-2 font-black">공식 서비스 요소</th>
                      <th className="px-3 py-2 font-black">내 앱 구현</th>
                      <th className="px-3 py-2 font-black">확인 위치</th>
                      <th className="px-3 py-2 font-black">개선 의도</th>
                    </tr>
                  </thead>
                  <tbody>
                    {implementationTrace.map((item) => (
                      <tr
                        className="border-b border-[#edf1f7]"
                        key={`${item.reference}-${item.implemented}`}
                      >
                        <td className="px-3 py-3 font-black text-[#1f3470]">
                          {item.reference}
                        </td>
                        <td className="px-3 py-3 font-bold text-[#202632]">
                          {item.implemented}
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded-sm bg-[#eef3ff] px-2 py-1 text-xs font-black text-[#2f4f9f]">
                            {item.proof}
                          </span>
                        </td>
                        <td className="px-3 py-3 leading-6 text-[#344054]">
                          {item.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="community-subpanel scroll-mt-24 bg-white p-4" id="problem">
              <h2 className="text-xl font-black text-[#071a3d]">문제 정의</h2>
              <p className="mt-3 text-sm leading-7 text-[#344054]">
                KBO 공식 서비스는 일정, 결과, 기록, 순위, 선수, 뉴스, 날씨,
                하이라이트처럼 팬에게 필요한 정보를 폭넓게 제공합니다. 다만
                모바일 사용자는 메뉴 전체를 탐색하기보다 지금 보는 경기와
                응원팀을 기준으로 필요한 정보에 빠르게 도달하고 싶어 합니다.
                따라서 메뉴 중심 구조를 유지하되, 경기와 팀 중심의 사용 흐름을
                강화하는 것이 핵심 개선 방향입니다.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {[
                  ["탐색 문제", "경기 정보와 기록, 뉴스가 분리되면 맥락이 끊김"],
                  ["모바일 문제", "작은 화면에서 표와 메뉴 이동이 부담스러움"],
                  ["재방문 문제", "내 팀 기준의 이유가 약하면 매일 열 동기가 낮음"],
                ].map(([title, body]) => (
                  <div className="rounded-sm border border-[#d8deea] bg-[#fbfcff] p-3" key={title}>
                    <p className="text-sm font-black text-[#d71920]">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-[#4b5563]">
                      {body}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section
              className="community-subpanel scroll-mt-24 bg-white p-4"
              id="observations"
            >
              <h2 className="text-xl font-black text-[#071a3d]">관찰 근거</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {observations.map((item) => (
                  <article
                    className="rounded-sm border border-[#d8deea] bg-[#fbfcff] p-4"
                    key={item.area}
                  >
                    <p className="text-sm font-black text-[#d71920]">
                      {item.area}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#344054]">
                      {item.finding}
                    </p>
                    <p className="mt-3 border-t border-[#d8deea] pt-3 text-sm leading-6 text-[#1f3470]">
                      {item.implication}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="community-subpanel scroll-mt-24 bg-white p-4" id="journey">
              <h2 className="text-xl font-black text-[#071a3d]">
                팬 사용 여정
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-[760px] w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-y border-[#d8deea] bg-[#f6f8fc] text-left text-[#667085]">
                      <th className="px-3 py-2 font-black">상황</th>
                      <th className="px-3 py-2 font-black">사용자 니즈</th>
                      <th className="px-3 py-2 font-black">개선 방향</th>
                    </tr>
                  </thead>
                  <tbody>
                    {journeySteps.map((step) => (
                      <tr className="border-b border-[#edf1f7]" key={step.phase}>
                        <td className="px-3 py-3 font-black text-[#1f3470]">
                          {step.phase}
                        </td>
                        <td className="px-3 py-3 leading-6 text-[#344054]">
                          {step.userNeed}
                        </td>
                        <td className="px-3 py-3 leading-6 text-[#344054]">
                          {step.improvement}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="scroll-mt-24" id="improvements">
              <div className="community-panel">
                <div className="community-panel-header">
                  <div>
                    <h2 className="text-xl font-black text-[#071a3d]">
                      핵심 개선안
                    </h2>
                    <p className="mt-1 text-xs text-[#667085]">
                      현재 프로젝트에서 구현한 기능과 연결 가능한 제안
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 p-3 md:grid-cols-2">
                  {improvementCards.map((card) => (
                    <article className="community-subpanel bg-[#fbfcff] p-4" key={card.title}>
                      <h3 className="text-base font-black text-[#1f3470]">
                        {card.title}
                      </h3>
                      <dl className="mt-3 grid gap-3 text-sm">
                        <div>
                          <dt className="font-black text-[#d71920]">현재 문제</dt>
                          <dd className="mt-1 leading-6 text-[#344054]">
                            {card.problem}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-black text-[#1f3470]">개선 방향</dt>
                          <dd className="mt-1 leading-6 text-[#344054]">
                            {card.solution}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-black text-[#667085]">기대 효과</dt>
                          <dd className="mt-1 leading-6 text-[#344054]">
                            {card.outcome}
                          </dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section className="community-subpanel scroll-mt-24 bg-white p-4" id="data">
              <h2 className="text-xl font-black text-[#071a3d]">
                데이터와 개인화 활용
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#344054]">
                앱 개선은 화면 변경에서 끝나지 않고, 어떤 행동 데이터를 보고
                다음 개선을 판단할지까지 이어져야 합니다. 개인화는 추천 정확도
                자체보다 사용자가 납득할 수 있는 기준과 제어권이 중요합니다.
              </p>
              <ul className="mt-4 grid gap-2">
                {dataIdeas.map((idea) => (
                  <li
                    className="rounded-sm border border-[#d8deea] bg-[#fbfcff] px-3 py-2 text-sm leading-6 text-[#344054]"
                    key={idea}
                  >
                    {idea}
                  </li>
                ))}
              </ul>
            </section>

            <section className="community-subpanel scroll-mt-24 bg-white p-4" id="roadmap">
              <h2 className="text-xl font-black text-[#071a3d]">MVP 로드맵</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {roadmap.map((item) => (
                  <article className="rounded-sm border border-[#d8deea] bg-[#fbfcff] p-3" key={item.step}>
                    <p className="text-xs font-black text-[#d71920]">
                      {item.step}
                    </p>
                    <h3 className="mt-1 text-base font-black text-[#1f3470]">
                      {item.title}
                    </h3>
                    <ul className="mt-3 grid gap-1.5 text-sm leading-6 text-[#344054]">
                      {item.items.map((detail) => (
                        <li key={detail}>- {detail}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>

            <section className="community-subpanel scroll-mt-24 bg-white p-4" id="runbook">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-[#071a3d]">
                    실행/검증 흐름
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-[#344054]">
                    구현한 KBO 앱은 웹앱, PWA, Android WebView 셸을 같은
                    코드 흐름으로 확인할 수 있게 구성했습니다. 아래 순서대로
                    실행하면 브라우저 시연과 Android Studio 실행 준비 상태를
                    함께 점검할 수 있습니다.
                  </p>
                </div>
                <Link
                  className="community-button-primary community-button-compact"
                  href="/mobile-app"
                >
                  모바일 앱 열기
                </Link>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {runbookSteps.map((step) => (
                  <article
                    className="rounded-sm border border-[#d8deea] bg-[#fbfcff] p-4"
                    key={step.command}
                  >
                    <p className="text-sm font-black text-[#d71920]">
                      {step.title}
                    </p>
                    <code className="mt-2 block rounded-sm bg-white px-3 py-2 text-xs font-black text-[#1f3470]">
                      {step.command}
                    </code>
                    <p className="mt-3 text-sm leading-6 text-[#344054]">
                      {step.description}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="community-subpanel scroll-mt-24 bg-white p-4" id="metrics">
              <h2 className="text-xl font-black text-[#071a3d]">성과 지표</h2>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {metrics.map((metric) => (
                  <div
                    className="flex items-center gap-2 rounded-sm border border-[#d8deea] bg-[#fbfcff] px-3 py-2 text-sm font-bold text-[#344054]"
                    key={metric}
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#d71920]" />
                    {metric}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
