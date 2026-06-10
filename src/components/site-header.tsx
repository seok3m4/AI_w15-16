import Link from "next/link";

import { AuthStatus } from "@/components/auth/auth-status";

const navLinks = [
  { href: "/", label: "게시글" },
  { href: "/news", label: "뉴스" },
  { href: "/posts/new", label: "글쓰기" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-[#172554] bg-[#071a3d] text-white shadow-[0_10px_30px_rgba(7,26,61,0.18)]">
      <div className="border-b border-white/10 bg-[#031129]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white/70">
          <span>Baseball AI Board</span>
          <span>KBO News · RAG · MCP · Agent</span>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <Link className="group flex items-center gap-3" href="/">
          <span className="flex h-12 w-12 items-center justify-center rounded-md bg-white text-lg font-black text-[#071a3d] shadow-sm">
            B
          </span>
          <span>
            <span className="block text-sm font-bold uppercase tracking-[0.18em] text-[#ffb4b7]">
              AI Baseball
            </span>
            <span className="block text-2xl font-black tracking-tight text-white group-hover:text-[#ffdadc]">
              브리핑 보드
            </span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-2 text-sm font-bold">
          {navLinks.map((link) => (
            <Link
              className="rounded-md px-3 py-2 text-white/80 hover:bg-white/10 hover:text-white"
              href={link.href}
              key={`${link.href}-${link.label}`}
            >
              {link.label}
            </Link>
          ))}
          <AuthStatus />
        </nav>
      </div>
    </header>
  );
}
