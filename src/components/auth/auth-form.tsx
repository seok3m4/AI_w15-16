"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type AuthMode = "login" | "signup";

type AuthFormProps = {
  mode: AuthMode;
};

type AuthResponse = {
  message?: string;
};

const copy = {
  login: {
    title: "로그인",
    description: "저장한 글과 경기 이야기로 다시 들어갑니다.",
    submit: "로그인",
    endpoint: "/api/auth/login",
    alternateText: "아직 계정이 없다면",
    alternateHref: "/signup",
    alternateLabel: "회원가입",
  },
  signup: {
    title: "회원가입",
    description: "게시글, 댓글, 추천 기능을 사용할 계정을 만듭니다.",
    submit: "회원가입",
    endpoint: "/api/auth/signup",
    alternateText: "이미 계정이 있다면",
    alternateHref: "/login",
    alternateLabel: "로그인",
  },
} satisfies Record<AuthMode, Record<string, string>>;

export function AuthForm({ mode }: AuthFormProps) {
  const config = copy[mode];
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordMatchState = useMemo(() => {
    if (mode !== "signup" || passwordConfirm.length === 0) {
      return null;
    }

    return password === passwordConfirm;
  }, [mode, password, passwordConfirm]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (mode === "signup" && password !== passwordConfirm) {
      setMessage("비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsSubmitting(true);

    const body =
      mode === "signup"
        ? {
            email,
            nickname,
            password,
          }
        : {
            email,
            password,
          };

    try {
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as AuthResponse;

      if (!response.ok) {
        setMessage(data.message ?? "요청을 처리하지 못했습니다.");
        return;
      }

      window.location.assign("/");
    } catch {
      setMessage("네트워크 연결을 확인해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="page-shell">
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="community-panel overflow-hidden">
          <div className="community-title-bar px-4 py-4">
            <h2 className="text-xl font-black tracking-tight">KBO Talk</h2>
            <p className="mt-1 text-sm text-white/70">
              경기 리뷰, 팀 이야기, 댓글 참여를 이어갈 수 있습니다.
            </p>
          </div>
          <div className="space-y-3 px-4 py-4">
            <div className="community-subpanel p-3">
              <p className="text-xs font-black text-[#667085]">게시판 참여</p>
              <p className="mt-1 text-sm font-bold text-[#202632]">
                글쓰기, 댓글, 추천 기능을 바로 사용할 수 있습니다.
              </p>
            </div>
            <div className="community-subpanel p-3">
              <p className="text-xs font-black text-[#667085]">계정 안내</p>
              <p className="mt-1 text-sm leading-6 text-[#667085]">
                닉네임은 게시글과 댓글 작성자 이름으로 표시됩니다. 비밀번호는
                8자 이상으로 입력해주세요.
              </p>
            </div>
          </div>
        </aside>

        <div className="community-panel">
          <div className="community-panel-header">
            <div>
              <h2 className="text-base font-black text-[#071a3d]">
                {config.title}
              </h2>
              <p className="mt-0.5 text-[11px] text-[#667085]">
                {config.description}
              </p>
            </div>
            <Link className="community-button-secondary community-button-compact" href="/">
              홈으로
            </Link>
          </div>

          <form className="grid gap-4 p-5 sm:p-6" onSubmit={handleSubmit}>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#172033]">이메일</span>
              <input
                autoComplete="email"
                className="community-input community-input-large text-sm"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>

            {mode === "signup" ? (
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-[#172033]">
                  닉네임
                </span>
                <input
                  autoComplete="nickname"
                  className="community-input community-input-large text-sm"
                  maxLength={20}
                  minLength={2}
                  onChange={(event) => setNickname(event.target.value)}
                  required
                  type="text"
                  value={nickname}
                />
                <span className="text-[11px] text-[#667085]">
                  게시글과 댓글에 표시될 이름입니다.
                </span>
              </label>
            ) : null}

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#172033]">
                비밀번호
              </span>
              <input
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                className="community-input community-input-large text-sm"
                maxLength={72}
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
              {mode === "signup" ? (
                <span className="text-[11px] text-[#667085]">
                  8자 이상 입력해주세요.
                </span>
              ) : null}
            </label>

            {mode === "signup" ? (
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-[#172033]">
                  비밀번호 확인
                </span>
                <input
                  autoComplete="new-password"
                  className="community-input community-input-large text-sm"
                  maxLength={72}
                  minLength={8}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                  required
                  type="password"
                  value={passwordConfirm}
                />
                {passwordMatchState !== null ? (
                  <span
                    className={
                      passwordMatchState
                        ? "text-[11px] font-bold text-[#166534]"
                        : "text-[11px] font-bold text-[#b91c1c]"
                    }
                  >
                    {passwordMatchState
                      ? "비밀번호가 일치합니다."
                      : "비밀번호가 일치하지 않습니다."}
                  </span>
                ) : null}
              </label>
            ) : null}

            {message ? (
              <p className="rounded-sm border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm text-[#b91c1c]">
                {message}
              </p>
            ) : null}

            <div className="flex flex-col gap-2 border-t border-[#d8deea] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#667085]">
                {config.alternateText}{" "}
                <Link
                  className="font-bold text-[#2f4f9f] hover:text-[#1f3470]"
                  href={config.alternateHref}
                >
                  {config.alternateLabel}
                </Link>
              </p>
              <button
                className="community-button-primary community-button-large disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "처리 중" : config.submit}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
