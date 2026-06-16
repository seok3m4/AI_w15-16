"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AuthStatus } from "@/components/auth/auth-status";

const navLinks = [
  { href: "/", label: "홈", match: "/" },
  { href: "/records", label: "기록실", match: "/records" },
  { href: "/news", label: "뉴스", match: "/news" },
  { href: "/posts/new", label: "글쓰기", match: "/posts/new" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[#172554] bg-[#071a3d] text-white shadow-sm">
      <div className="community-header-shell">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Link className="flex w-fit items-center gap-2" href="/">
            <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#d71920] text-xs font-black text-white">
              KBO
            </span>
            <div>
              <span className="block text-lg font-black tracking-tight">
                KBO Talk
              </span>
              <span className="block text-[11px] font-bold text-white/65">
                경기 이야기와 커뮤니티 글을 함께 보는 야구 게시판
              </span>
            </div>
          </Link>

          <div className="lg:shrink-0">
            <AuthStatus />
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-1 border-t border-white/10 pt-2 text-sm font-bold">
          {navLinks.map((link) => {
            const isActive =
              link.match === "/"
                ? pathname === "/"
                : pathname.startsWith(link.match);

            return (
              <Link
                className={
                  isActive
                    ? "rounded-sm bg-white px-3 py-1.5 text-[#071a3d]"
                    : "rounded-sm px-3 py-1.5 text-white/82 hover:bg-white/10 hover:text-white"
                }
                href={link.href}
                key={`${link.href}-${link.label}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
