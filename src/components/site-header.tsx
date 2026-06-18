"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AuthStatus } from "@/components/auth/auth-status";

const navLinks = [
  { href: "/", label: "홈", match: "/" },
  { href: "/records", label: "순위/기록실", match: "/records" },
  { href: "/news", label: "뉴스", match: "/news" },
  { href: "/posts/new", label: "글쓰기", match: "/posts/new" },
];

const mobileTabs = [
  { href: "/", label: "홈", match: "/" },
  { href: "/#games", label: "경기", match: "/games" },
  { href: "/news", label: "뉴스", match: "/news" },
  { href: "/records", label: "기록", match: "/records" },
  { href: "/me", label: "MY", match: "/me" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#172554] bg-[#071a3d] text-white shadow-sm">
        <div className="community-header-shell">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center justify-between gap-3">
              <Link className="flex min-w-0 items-center gap-2" href="/">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-[#d71920] text-xs font-black text-white">
                  KBO
                </span>
                <div className="min-w-0">
                  <span className="block truncate text-lg font-black tracking-tight">
                    KBO Talk
                  </span>
                  <span className="hidden text-[11px] font-bold text-white/65 sm:block">
                    경기 이야기와 커뮤니티 글을 함께 보는 야구 게시판
                  </span>
                </div>
              </Link>

              <Link
                className="community-button-danger community-button-compact md:hidden"
                href="/posts/new"
              >
                글쓰기
              </Link>
            </div>

            <div className="md:shrink-0">
              <AuthStatus />
            </div>
          </div>

          <nav className="hidden flex-wrap items-center gap-1 border-t border-white/10 pt-2 text-sm font-bold md:flex">
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

      <nav className="mobile-bottom-nav md:hidden">
        {mobileTabs.map((tab) => {
          const isActive =
            tab.match === "/" ? pathname === "/" : pathname.startsWith(tab.match);

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className="mobile-bottom-nav-item"
              data-active={isActive}
              href={tab.href}
              key={`${tab.href}-${tab.label}`}
            >
              <span className="mobile-bottom-nav-dot" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
