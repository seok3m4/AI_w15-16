"use client";

import { useMemo, useState } from "react";

import {
  createAndroidDeepLink,
  getNativeBridgeCapabilities,
  getNativeLaunchUrl,
  getNativeShellVersion,
  openAndroidApp,
  openNativeBrowser,
  reloadNativeApp,
  requestNativeNotificationPermission,
  showNativeNotification,
  showNativeToast,
} from "@/lib/mobile/native-bridge";

type BridgeState = {
  currentUrl: string;
  deepLink: string;
  launchUrl: string | null;
  version: string | null;
  capabilities: ReturnType<typeof getNativeBridgeCapabilities>;
};

function getBridgeState(): BridgeState {
  if (typeof window === "undefined") {
    return {
      currentUrl: "",
      deepLink: "kbofanhub://app",
      launchUrl: null,
      version: null,
      capabilities: getNativeBridgeCapabilities(),
    };
  }

  return {
    currentUrl: window.location.href,
    deepLink: createAndroidDeepLink(window.location.href),
    launchUrl: getNativeLaunchUrl(),
    version: getNativeShellVersion(),
    capabilities: getNativeBridgeCapabilities(),
  };
}

export function MobileAppStatusPanel() {
  const [state, setState] = useState<BridgeState>(() => getBridgeState());
  const [message, setMessage] = useState("");

  const statusLabel = state.version
    ? `Android 앱 v${state.version}`
    : "모바일 웹/PWA";
  const capabilityText = useMemo(() => {
    const entries = [
      state.capabilities.canToast ? "Toast" : "",
      state.capabilities.canShare ? "Share" : "",
      state.capabilities.canReload ? "Reload" : "",
      state.capabilities.canOpenBrowser ? "Browser" : "",
      state.capabilities.canNotify ? "Notify" : "",
    ].filter(Boolean);

    return entries.length > 0 ? entries.join(" / ") : "브라우저 기본 기능";
  }, [state.capabilities]);

  async function handleCopyDeepLink() {
    try {
      await window.navigator.clipboard.writeText(state.deepLink);
      setMessage("딥링크를 복사했습니다.");
    } catch {
      setMessage("딥링크를 복사하지 못했습니다.");
    }
  }

  function handleOpenApp() {
    openAndroidApp();
    setMessage("설치된 Android 앱이 있으면 현재 화면으로 이동합니다.");
  }

  function handleNotificationTest() {
    const permission = requestNativeNotificationPermission();
    const didShowNotification = showNativeNotification(
      "KBO Fan Hub",
      "Android 앱 알림 bridge가 연결되었습니다.",
    );

    if (didShowNotification) {
      setMessage("Android 로컬 알림을 보냈습니다.");
      return;
    }

    if (permission) {
      setMessage("Android 알림 권한을 요청했습니다. 허용한 뒤 다시 눌러주세요.");
      return;
    }

    setMessage("Android 앱 안에서 실행하면 로컬 알림을 테스트할 수 있습니다.");
  }

  return (
    <section className="rounded-[18px] border border-white/70 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black text-[#d71920]">앱 연동 상태</p>
          <h2 className="mt-1 text-lg font-black text-[#071a3d]">
            {statusLabel}
          </h2>
          <p className="mt-1 text-xs leading-5 text-[#667085]">
            사용 가능 기능: {capabilityText}
          </p>
        </div>
        <button
          className="shrink-0 rounded-full bg-[#eef3ff] px-3 py-2 text-xs font-black text-[#2f4f9f]"
          onClick={() => setState(getBridgeState())}
          type="button"
        >
          확인
        </button>
      </div>

      <dl className="mt-4 grid gap-2 text-xs">
        <div className="rounded-2xl bg-[#fbfcff] p-3">
          <dt className="font-black text-[#667085]">현재 URL</dt>
          <dd className="mt-1 break-all font-bold text-[#202632]">
            {state.currentUrl || "-"}
          </dd>
        </div>
        <div className="rounded-2xl bg-[#fbfcff] p-3">
          <dt className="font-black text-[#667085]">Android 딥링크</dt>
          <dd className="mt-1 break-all font-bold text-[#202632]">
            {state.deepLink}
          </dd>
        </div>
        {state.launchUrl ? (
          <div className="rounded-2xl bg-[#fbfcff] p-3">
            <dt className="font-black text-[#667085]">앱 시작 URL</dt>
            <dd className="mt-1 break-all font-bold text-[#202632]">
              {state.launchUrl}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          className="rounded-2xl bg-[#071a3d] px-3 py-2 text-xs font-black text-white"
          onClick={handleOpenApp}
          type="button"
        >
          앱으로 열기
        </button>
        <button
          className="rounded-2xl border border-[#d8deea] bg-[#fbfcff] px-3 py-2 text-xs font-black text-[#2f4f9f]"
          onClick={() => void handleCopyDeepLink()}
          type="button"
        >
          딥링크 복사
        </button>
        <button
          className="rounded-2xl border border-[#d8deea] bg-[#fbfcff] px-3 py-2 text-xs font-black text-[#2f4f9f]"
          onClick={() => {
            if (!showNativeToast("Android bridge 연결 확인")) {
              setMessage("Android 앱 안에서 실행하면 Toast가 표시됩니다.");
            }
          }}
          type="button"
        >
          Toast 테스트
        </button>
        <button
          className="rounded-2xl border border-[#d8deea] bg-[#fbfcff] px-3 py-2 text-xs font-black text-[#2f4f9f]"
          onClick={() => {
            if (!reloadNativeApp()) {
              setMessage("Android 앱 안에서 실행하면 WebView가 새로고침됩니다.");
            }
          }}
          type="button"
        >
          앱 새로고침
        </button>
        <button
          className="rounded-2xl border border-[#d8deea] bg-[#fbfcff] px-3 py-2 text-xs font-black text-[#2f4f9f]"
          onClick={handleNotificationTest}
          type="button"
        >
          알림 테스트
        </button>
      </div>

      <button
        className="mt-2 w-full rounded-2xl border border-[#d8deea] bg-[#fbfcff] px-3 py-2 text-xs font-black text-[#2f4f9f]"
        onClick={() => {
          if (!openNativeBrowser()) {
            setMessage("Android 앱 안에서 실행하면 외부 브라우저로 열립니다.");
          }
        }}
        type="button"
      >
        브라우저에서 열기
      </button>

      <div className="mt-3 rounded-2xl border border-[#d8deea] bg-[#fbfcff] p-3">
        <p className="text-xs font-black text-[#071a3d]">로컬 실행 순서</p>
        <ol className="mt-2 grid gap-2 text-xs leading-5 text-[#667085]">
          <li>
            <code className="rounded-md bg-white px-1.5 py-0.5 font-black text-[#1f3470]">
              npm.cmd run mobile:dev
            </code>
            <span className="ml-1 font-bold">
              로 웹앱 서버를 먼저 실행합니다.
            </span>
          </li>
          <li>
            <code className="rounded-md bg-white px-1.5 py-0.5 font-black text-[#1f3470]">
              npm.cmd run android:doctor
            </code>
            <span className="ml-1 font-bold">
              로 Android 실행 환경을 점검합니다.
            </span>
          </li>
          <li>
            <code className="rounded-md bg-white px-1.5 py-0.5 font-black text-[#1f3470]">
              npm.cmd run android:open
            </code>
            <span className="ml-1 font-bold">
              으로 Android Studio에서 앱을 엽니다.
            </span>
          </li>
        </ol>
      </div>

      <div className="mt-3 rounded-2xl border border-[#d8deea] bg-[#fbfcff] p-3">
        <p className="text-xs font-black text-[#071a3d]">시연 전 점검</p>
        <ol className="mt-2 grid gap-2 text-xs leading-5 text-[#667085]">
          <li>
            <code className="rounded-md bg-white px-1.5 py-0.5 font-black text-[#1f3470]">
              npm.cmd run mobile:release-check
            </code>
            <span className="ml-1 font-bold">
              로 웹/PWA, 린트, 빌드, 앱 딥링크 smoke test를 확인합니다.
            </span>
          </li>
          <li>
            <code className="rounded-md bg-white px-1.5 py-0.5 font-black text-[#1f3470]">
              npm.cmd run android:smoke -- --run
            </code>
            <span className="ml-1 font-bold">
              앱 설치 후 실제 기기에 딥링크와 공유 명령을 보냅니다.
            </span>
          </li>
        </ol>
      </div>

      {message ? (
        <p className="mt-3 rounded-2xl bg-[#f8fafc] px-3 py-2 text-xs font-bold text-[#667085]">
          {message}
        </p>
      ) : null}
    </section>
  );
}
