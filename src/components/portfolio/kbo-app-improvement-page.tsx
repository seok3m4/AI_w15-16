import Link from "next/link";

const projectLinks = [
  {
    label: "게시판 URL",
    href: "https://jungle-ai-board.vercel.app",
    description: "KBO Talk 웹 게시판 메인",
  },
  {
    label: "앱 URL",
    href: "https://jungle-ai-board.vercel.app/mobile-app",
    description: "모바일 앱형 화면",
  },
  {
    label: "GitHub",
    href: "https://github.com/kominsuk1064/jungle-ai-board",
    description: "개인 레포지토리",
  },
];

const coreFeatures = [
  {
    title: "경기방",
    description:
      "오늘의 경기에서 바로 들어가 선발투수, 라인업, 문자중계, 박스스코어, 타자/투수 기록, 관련 글을 한 화면에서 확인합니다.",
  },
  {
    title: "야구 게시판",
    description:
      "경기 리뷰, 선수 분석, 팀 이슈를 작성하고 댓글, 태그, 검색, 페이지네이션, 추천/비추천, 인기글로 커뮤니티 흐름을 만듭니다.",
  },
  {
    title: "기록실과 뉴스",
    description:
      "KBO 순위, 타자/투수 기록, 야구 뉴스를 별도 페이지로 제공하고 뉴스 URL은 브리핑과 글쓰기 흐름으로 연결합니다.",
  },
  {
    title: "모바일 앱형 UX",
    description:
      "홈, 경기, 기록, 뉴스, MY 탭으로 나누어 실제 앱처럼 사용할 수 있게 구성했고 Android WebView APK로도 확장했습니다.",
  },
];

const improvementPoints = [
  {
    title: "흩어진 경기 정보를 경기방으로 묶기",
    before: "일정, 라인업, 중계, 기록, 관련 글을 각각 찾아야 하는 흐름",
    after:
      "경기 하나를 기준으로 경기 전, 경기 중, 경기 후 정보를 한 화면에 배치",
  },
  {
    title: "정보 확인에서 팬 참여로 이어지게 만들기",
    before: "뉴스나 기록을 확인한 뒤 사용자의 행동이 끊기는 흐름",
    after:
      "뉴스 브리핑, 관련 글, 경기 리뷰 작성으로 자연스럽게 이어지는 흐름",
  },
  {
    title: "모바일에서 자주 쓰는 메뉴를 앞에 두기",
    before: "많은 메뉴 중 사용자가 필요한 기능을 직접 찾아야 하는 구조",
    after:
      "홈, 경기, 기록, 뉴스, MY 중심으로 팬이 자주 쓰는 동선을 단순화",
  },
];

const aiFeatures = [
  "비슷한 게시글 추천과 중복 글 방지",
  "뉴스/URL 브리핑과 경기 기록 정리",
  "경기 리뷰 초안 작성 도우미",
  "게시글/댓글 작성 시 운영 모더레이터",
];

export function KboAppImprovementPage() {
  return (
    <section className="page-shell">
      <div className="community-panel bg-white">
        <div className="border-b border-[#d8deea] px-4 py-6 sm:px-6">
          <p className="text-xs font-black uppercase tracking-wide text-[#d71920]">
            KBO Fan Service Project
          </p>
          <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-[#071a3d] sm:text-4xl">
                KBO Talk
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-[#344054]">
                KBO 팬이 경기 정보, 기록, 뉴스, 커뮤니티를 한 흐름 안에서
                볼 수 있도록 만든 야구 게시판 겸 모바일 앱형 서비스입니다.
                단순히 게시글을 쓰는 공간이 아니라, 경기 전 정보 확인부터
                경기 후 리뷰 작성까지 이어지는 팬 경험을 목표로 만들었습니다.
              </p>
            </div>

            <div className="rounded-sm border border-[#d8deea] bg-[#fbfcff] p-4">
              <h2 className="text-sm font-black text-[#071a3d]">
                바로가기
              </h2>
              <div className="mt-3 grid gap-2">
                {projectLinks.map((link) => (
                  <a
                    className="rounded-sm border border-[#d8deea] bg-white px-3 py-2 hover:border-[#2f4f9f] hover:bg-[#eef3ff]"
                    href={link.href}
                    key={link.href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span className="block text-sm font-black text-[#1f3470]">
                      {link.label}
                    </span>
                    <span className="mt-1 block text-xs text-[#667085]">
                      {link.description}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-4 sm:p-6">
          <section>
            <h2 className="text-xl font-black text-[#071a3d]">
              이 앱은 무엇인가요?
            </h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-[#344054]">
              야구 팬은 경기 전에는 선발투수와 라인업을 보고, 경기 중에는
              스코어와 문자중계를 확인하고, 경기 후에는 박스스코어, 기사,
              팬 반응을 다시 찾아봅니다. KBO Talk는 이 흐름을 게시판과
              연결했습니다. 팬이 정보를 확인하는 데서 끝나지 않고, 바로
              리뷰를 남기고 다른 팬의 의견을 볼 수 있게 만든 서비스입니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-[#071a3d]">핵심 기능</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {coreFeatures.map((feature) => (
                <article
                  className="rounded-sm border border-[#d8deea] bg-[#fbfcff] p-4"
                  key={feature.title}
                >
                  <h3 className="text-base font-black text-[#1f3470]">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#344054]">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-black text-[#071a3d]">
              KBO 앱 개선점을 어떻게 담았나요?
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="border-y border-[#d8deea] bg-[#f6f8fc] text-left text-[#667085]">
                    <th className="px-3 py-2 font-black">개선 방향</th>
                    <th className="px-3 py-2 font-black">불편하다고 본 점</th>
                    <th className="px-3 py-2 font-black">프로젝트 반영</th>
                  </tr>
                </thead>
                <tbody>
                  {improvementPoints.map((point) => (
                    <tr className="border-b border-[#edf1f7]" key={point.title}>
                      <td className="px-3 py-3 font-black text-[#1f3470]">
                        {point.title}
                      </td>
                      <td className="px-3 py-3 leading-6 text-[#344054]">
                        {point.before}
                      </td>
                      <td className="px-3 py-3 leading-6 text-[#344054]">
                        {point.after}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-sm border border-[#d8deea] bg-[#fbfcff] p-4">
              <h2 className="text-xl font-black text-[#071a3d]">
                AI 기능은 사용자 경험 안에 숨겼습니다
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#344054]">
                화면에는 RAG, MCP, Agent 같은 기술명을 크게 드러내기보다,
                사용자가 글을 쓰거나 정보를 찾는 순간에 필요한 도움으로
                배치했습니다. 과제용 기능처럼 보이지 않고 실제 커뮤니티
                기능처럼 느껴지는 것을 목표로 했습니다.
              </p>
              <ul className="mt-3 grid gap-2 text-sm font-bold text-[#344054]">
                {aiFeatures.map((feature) => (
                  <li className="rounded-sm bg-white px-3 py-2" key={feature}>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <aside className="rounded-sm border border-[#d8deea] bg-[#071a3d] p-4 text-white">
              <h2 className="text-lg font-black">기술 스택</h2>
              <p className="mt-3 text-sm leading-7 text-[#dbe6ff]">
                Next.js, React, TypeScript, PostgreSQL, Prisma, pgvector,
                OpenAI API, LangChain.js, Vercel, Supabase, Android WebView를
                사용했습니다.
              </p>
            </aside>
          </section>

          <section className="rounded-sm border border-[#d8deea] bg-[#fbfcff] p-4">
            <h2 className="text-xl font-black text-[#071a3d]">
              한 줄로 정리하면
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#344054]">
              KBO Talk는 야구 팬이 “오늘 경기 확인 → 경기방 입장 → 기록과
              뉴스 확인 → 리뷰 작성 → 다른 팬 의견 확인”까지 한 번에 이어갈
              수 있도록 만든 KBO 팬 커뮤니티 서비스입니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link className="community-button-primary" href="/">
                게시판 보기
              </Link>
              <Link className="community-button-secondary" href="/mobile-app">
                앱 화면 보기
              </Link>
              <a
                className="community-button-secondary"
                href="https://github.com/kominsuk1064/jungle-ai-board"
                rel="noreferrer"
                target="_blank"
              >
                GitHub 보기
              </a>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
