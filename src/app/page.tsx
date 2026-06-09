import { SiteHeader } from "@/components/site-header";

const samplePosts = [
  {
    title: "Bullpen usage after a close extra-inning game",
    tag: "Game Review",
    meta: "KBO | Strategy | 12 comments",
  },
  {
    title: "What changed in the leadoff hitter's approach this week?",
    tag: "Player Analysis",
    meta: "Hitting | Metrics | 8 comments",
  },
  {
    title: "Trade deadline needs for a contending team",
    tag: "Team Issue",
    meta: "Roster | News Brief | 15 comments",
  },
];

const aiActions = ["Similar posts", "News briefing", "Draft assist"];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f9fb] text-[#172033]">
      <SiteHeader />

      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 border-b border-[#d9e2ec] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Latest baseball posts</h2>
              <p className="text-sm text-[#5e6a7d]">
                Game reviews, player analysis, and team issue discussions.
              </p>
            </div>
            <input
              className="h-10 w-full rounded-md border border-[#c8d3df] bg-white px-3 text-sm outline-none focus:border-[#0f766e] sm:w-64"
              placeholder="Search posts"
              type="search"
            />
          </div>

          <div className="grid gap-3">
            {samplePosts.map((post) => (
              <article
                className="rounded-md border border-[#d9e2ec] bg-white p-5"
                key={post.title}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="rounded-md bg-[#e6f4f1] px-2.5 py-1 text-xs font-semibold text-[#0f766e]">
                    {post.tag}
                  </span>
                  <span className="text-xs text-[#5e6a7d]">{post.meta}</span>
                </div>
                <h3 className="text-lg font-semibold">{post.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#5e6a7d]">
                  AI features will connect this board to similar discussions,
                  baseball news briefings, and assisted review drafts.
                </p>
              </article>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-md border border-[#d9e2ec] bg-white p-5">
            <h2 className="text-base font-semibold">AI writing tools</h2>
            <div className="mt-4 grid gap-2">
              {aiActions.map((action) => (
                <button
                  className="rounded-md border border-[#c8d3df] px-3 py-2 text-left text-sm font-medium hover:border-[#0f766e] hover:bg-[#f0fdfa]"
                  key={action}
                  type="button"
                >
                  {action}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-[#d9e2ec] bg-white p-5">
            <h2 className="text-base font-semibold">MVP scope</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#5e6a7d]">
              <li>Auth, post CRUD, comments, tags, search, pagination</li>
              <li>RAG-based similar baseball post recommendations</li>
              <li>MCP-based news and URL briefing</li>
              <li>Agent-assisted game review draft generation</li>
            </ul>
          </section>
        </aside>
      </section>
    </main>
  );
}
