import Link from "next/link";

import { AuthStatus } from "@/components/auth/auth-status";

export function SiteHeader() {
  return (
    <header className="border-b border-[#d9e2ec] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/">
          <p className="text-sm font-semibold uppercase text-[#0f766e]">
            Baseball AI Board
          </p>
          <h1 className="text-2xl font-bold">AI Baseball Briefing Board</h1>
        </Link>
        <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-[#5e6a7d]">
          <Link className="rounded-md px-3 py-2 hover:bg-[#eef4f7]" href="/">
            Posts
          </Link>
          <Link className="rounded-md px-3 py-2 hover:bg-[#eef4f7]" href="/">
            Tags
          </Link>
          <AuthStatus />
        </nav>
      </div>
    </header>
  );
}
