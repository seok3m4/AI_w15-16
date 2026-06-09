import Link from "next/link";

import { AuthStatus } from "@/components/auth/auth-status";

export function SiteHeader() {
  return (
    <header className="border-b border-[#d9e2ec] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/">
          <p className="text-sm font-semibold uppercase text-[#0f766e]">
            야구 AI 게시판
          </p>
          <h1 className="text-2xl font-bold">AI 야구 브리핑 보드</h1>
        </Link>
        <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-[#5e6a7d]">
          <Link className="rounded-md px-3 py-2 hover:bg-[#eef4f7]" href="/">
            게시글
          </Link>
          <Link className="rounded-md px-3 py-2 hover:bg-[#eef4f7]" href="/">
            태그
          </Link>
          <Link
            className="rounded-md px-3 py-2 hover:bg-[#eef4f7]"
            href="/posts/new"
          >
            글쓰기
          </Link>
          <AuthStatus />
        </nav>
      </div>
    </header>
  );
}
