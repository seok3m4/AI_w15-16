import Link from "next/link";

import { AuthStatus } from "@/components/auth/auth-status";

const navLinks = [
  { href: "/", label: "게시글" },
  { href: "/records", label: "기록실" },
  { href: "/news", label: "뉴스" },
  { href: "/posts/new", label: "글쓰기" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-[#1f3470] bg-[#2f4f9f] text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <Link className="flex items-center gap-2" href="/">
          <span className="rounded-sm bg-white px-2 py-1 text-sm font-black text-[#2f4f9f]">
            KBO
          </span>
          <span className="text-lg font-black tracking-tight">KBO Talk</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1 text-sm font-bold">
          {navLinks.map((link) => (
            <Link
              className="rounded-sm px-2.5 py-1.5 text-white/85 hover:bg-white/10 hover:text-white"
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
