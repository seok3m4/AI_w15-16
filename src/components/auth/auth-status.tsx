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
    return <span className="px-3 py-2 text-sm text-white/70">확인 중</span>;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          className="rounded-md px-3 py-2 text-sm font-bold text-white/80 hover:bg-white/10 hover:text-white"
          href="/login"
        >
          로그인
        </Link>
        <Link
          className="rounded-md bg-[#d71920] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#a91118]"
          href="/signup"
        >
          회원가입
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="max-w-36 truncate text-sm font-bold text-white">
        {user.nickname}
      </span>
      <button
        className="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold text-white/80 hover:bg-white/20 hover:text-white"
        onClick={handleLogout}
        type="button"
      >
        로그아웃
      </button>
    </div>
  );
}
