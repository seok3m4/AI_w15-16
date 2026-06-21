"use client";

import { useEffect, useState } from "react";

import {
  getNativeShellVersion,
  openAndroidApp,
  openNativeBrowser,
  reloadNativeApp,
  showNativeToast,
} from "@/lib/mobile/native-bridge";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

function isBeforeInstallPromptEvent(
  event: Event,
): event is BeforeInstallPromptEvent {
  return "prompt" in event && "userChoice" in event;
}

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const navigatorWithStandalone = window.navigator as NavigatorWithStandalone;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

export function MobileInstallPrompt() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [nativeShellVersion] = useState(() => getNativeShellVersion());
  const [isStandalone, setIsStandalone] = useState(() => isStandaloneMode());
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (nativeShellVersion) {
      return;
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        setMessage("앱 설치 준비를 완료하지 못했습니다.");
      });
    }

    function handleBeforeInstallPrompt(event: Event) {
      if (!isBeforeInstallPromptEvent(event)) {
        return;
      }

      event.preventDefault();
      setInstallPrompt(event);
    }

    function handleAppInstalled() {
      setIsStandalone(true);
      setInstallPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [nativeShellVersion]);

  async function handleInstall() {
    if (!installPrompt) {
      setMessage(
        "브라우저 메뉴에서 '홈 화면에 추가'를 선택하면 앱처럼 실행할 수 있습니다.",
      );
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
      setMessage("설치가 시작됐습니다.");
    } else {
      setMessage("설치를 취소했습니다. 언제든 다시 추가할 수 있습니다.");
    }
  }

  if (nativeShellVersion) {
    return (
      <section className="rounded-[18px] border border-[#bbf7d0] bg-[#f0fdf4] p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black text-[#166534]">
              Android 앱에서 실행 중
            </p>
            <h2 className="mt-1 text-base font-black text-[#071a3d]">
              웹 게시판과 같은 데이터를 사용합니다.
            </h2>
            <p className="mt-1 text-xs leading-5 text-[#475467]">
              앱 버전 {nativeShellVersion} · 경기방, 글쓰기, 기록실이 기존
              Next.js API와 바로 연결됩니다.
            </p>
          </div>
          <div className="grid shrink-0 gap-2">
            <button
              className="rounded-full bg-[#166534] px-3 py-2 text-xs font-black text-white"
              onClick={() => showNativeToast("KBO Fan Hub 앱과 연결됐습니다.")}
              type="button"
            >
              확인
            </button>
            <button
              className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#166534]"
              onClick={() => reloadNativeApp()}
              type="button"
            >
              새로고침
            </button>
          </div>
        </div>
        <button
          className="mt-3 w-full rounded-2xl border border-[#bbf7d0] bg-white px-3 py-2 text-xs font-black text-[#166534]"
          onClick={() => openNativeBrowser()}
          type="button"
        >
          현재 화면을 브라우저에서 열기
        </button>
      </section>
    );
  }

  if (isStandalone) {
    return null;
  }

  return (
    <section className="rounded-[18px] border border-[#c7d7fe] bg-[#eef3ff] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black text-[#2f4f9f]">앱으로 사용하기</p>
          <h2 className="mt-1 text-base font-black text-[#071a3d]">
            홈 화면에 추가해서 바로 열기
          </h2>
          <p className="mt-1 text-xs leading-5 text-[#475467]">
            경기방, 기록, 뉴스, 글쓰기를 모바일 앱처럼 이어서 볼 수 있습니다.
          </p>
        </div>
        <button
          className="shrink-0 rounded-full bg-[#071a3d] px-3 py-2 text-xs font-black text-white"
          onClick={() => void handleInstall()}
          type="button"
        >
          추가
        </button>
      </div>
      {message ? (
        <p className="mt-3 rounded-2xl bg-white/70 px-3 py-2 text-xs font-bold text-[#344054]">
          {message}
        </p>
      ) : null}
      <button
        className="mt-3 w-full rounded-2xl border border-[#c7d7fe] bg-white px-3 py-2 text-xs font-black text-[#2f4f9f]"
        onClick={() => {
          openAndroidApp();
          setMessage("설치된 Android 앱이 있으면 앱으로 열립니다.");
        }}
        type="button"
      >
        Android 앱으로 열기
      </button>
    </section>
  );
}
