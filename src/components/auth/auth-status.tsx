"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type CurrentUser = {
  id: string;
  email: string;
  nickname: string;
};

type AuthMeResponse = {
  user?: CurrentUser;
};

export function AuthStatus() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (!response.ok) {
          if (isMounted) {
            setUser(null);
          }
          return;
        }

        const data = (await response.json()) as AuthMeResponse;

        if (isMounted) {
          setUser(data.user ?? null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
    router.refresh();
  }

  if (isLoading) {
    return (
      <span className="community-header-pill">
        확인 중
      </span>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Link
          className="community-header-link"
          href="/login"
        >
          로그인
        </Link>
        <Link
          className="community-button-danger community-button-compact"
          href="/signup"
        >
          회원가입
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="community-header-pill max-w-28 font-bold text-white sm:max-w-40">
        <span className="truncate">{user.nickname}</span>
      </span>
      <Link
        className="community-header-link hidden border border-white/20 bg-white/10 sm:inline-flex"
        href="/me"
      >
        마이페이지
      </Link>
      <button
        className="community-header-link border border-white/20 bg-white/10"
        onClick={handleLogout}
        type="button"
      >
        로그아웃
      </button>
    </div>
  );
}
