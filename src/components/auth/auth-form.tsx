"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

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
    description: "야구 게시판에 다시 들어갑니다.",
    submit: "로그인",
    endpoint: "/api/auth/login",
    alternateText: "아직 계정이 없다면",
    alternateHref: "/signup",
    alternateLabel: "회원가입",
  },
  signup: {
    title: "회원가입",
    description: "게시글과 댓글을 작성할 계정을 만듭니다.",
    submit: "회원가입",
    endpoint: "/api/auth/signup",
    alternateText: "이미 계정이 있다면",
    alternateHref: "/login",
    alternateLabel: "로그인",
  },
} satisfies Record<AuthMode, Record<string, string>>;

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const config = copy[mode];
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      router.push("/");
      router.refresh();
    } catch {
      setMessage("네트워크 연결을 확인해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-md px-6 py-10">
      <div className="rounded-md border border-[#d9e2ec] bg-white p-6">
        <div className="border-b border-[#d9e2ec] pb-5">
          <h2 className="text-2xl font-bold text-[#172033]">{config.title}</h2>
          <p className="mt-2 text-sm leading-6 text-[#5e6a7d]">
            {config.description}
          </p>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-semibold text-[#172033]">
            이메일
            <input
              autoComplete="email"
              className="h-11 rounded-md border border-[#c8d3df] bg-white px-3 text-sm font-normal outline-none focus:border-[#0f766e]"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          {mode === "signup" ? (
            <label className="grid gap-2 text-sm font-semibold text-[#172033]">
              닉네임
              <input
                autoComplete="nickname"
                className="h-11 rounded-md border border-[#c8d3df] bg-white px-3 text-sm font-normal outline-none focus:border-[#0f766e]"
                maxLength={20}
                minLength={2}
                onChange={(event) => setNickname(event.target.value)}
                required
                type="text"
                value={nickname}
              />
            </label>
          ) : null}

          <label className="grid gap-2 text-sm font-semibold text-[#172033]">
            비밀번호
            <input
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              className="h-11 rounded-md border border-[#c8d3df] bg-white px-3 text-sm font-normal outline-none focus:border-[#0f766e]"
              maxLength={72}
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {mode === "signup" ? (
            <label className="grid gap-2 text-sm font-semibold text-[#172033]">
              비밀번호 확인
              <input
                autoComplete="new-password"
                className="h-11 rounded-md border border-[#c8d3df] bg-white px-3 text-sm font-normal outline-none focus:border-[#0f766e]"
                maxLength={72}
                minLength={8}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                required
                type="password"
                value={passwordConfirm}
              />
            </label>
          ) : null}

          {message ? (
            <p className="rounded-md border border-[#fecaca] bg-[#fff1f2] px-3 py-2 text-sm text-[#b91c1c]">
              {message}
            </p>
          ) : null}

          <button
            className="h-11 rounded-md bg-[#0f766e] px-4 text-sm font-semibold text-white hover:bg-[#115e59] disabled:cursor-not-allowed disabled:bg-[#94a3b8]"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "처리 중" : config.submit}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[#5e6a7d]">
          {config.alternateText}{" "}
          <Link
            className="font-semibold text-[#0f766e] hover:text-[#115e59]"
            href={config.alternateHref}
          >
            {config.alternateLabel}
          </Link>
        </p>
      </div>
    </section>
  );
}
