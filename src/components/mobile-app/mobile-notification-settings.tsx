"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getNativeNotificationPermissionState,
  requestNativeNotificationPermission,
  showNativeNotification,
  showNativeToast,
  type NativeNotificationPermissionState,
} from "@/lib/mobile/native-bridge";

type NotificationSettingKey =
  | "gameStart"
  | "lineup"
  | "teamNews"
  | "comments";

type NotificationSettings = Record<NotificationSettingKey, boolean>;

type PermissionState = NotificationPermission | "not_required" | "unsupported";

type MobileNotificationSettingsProps = {
  favoriteTeam: string;
};

const storageKey = "kbo-fan-hub-notification-settings";

const defaultSettings: NotificationSettings = {
  gameStart: true,
  lineup: true,
  teamNews: true,
  comments: false,
};

const settingItems: Array<{
  key: NotificationSettingKey;
  title: string;
  description: string;
}> = [
  {
    key: "gameStart",
    title: "경기 시작 알림",
    description: "응원팀 경기 시작 전 앱에서 확인할 항목으로 저장합니다.",
  },
  {
    key: "lineup",
    title: "라인업 공개 알림",
    description: "선발 라인업이 확인되면 경기방 진입을 유도하는 흐름입니다.",
  },
  {
    key: "teamNews",
    title: "응원팀 뉴스 알림",
    description: "내 팀 관련 뉴스가 있을 때 브리핑과 글쓰기로 연결합니다.",
  },
  {
    key: "comments",
    title: "댓글 반응 알림",
    description: "내가 쓴 글의 댓글 반응을 다시 확인하는 용도입니다.",
  },
];

function readSavedSettings(): NotificationSettings {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  try {
    const savedValue = window.localStorage.getItem(storageKey);

    if (!savedValue) {
      return defaultSettings;
    }

    return {
      ...defaultSettings,
      ...(JSON.parse(savedValue) as Partial<NotificationSettings>),
    };
  } catch {
    return defaultSettings;
  }
}

function getInitialPermission(): PermissionState {
  const nativePermission = getNativeNotificationPermissionState();

  if (nativePermission) {
    return nativePermission;
  }

  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

function getPermissionLabel(permission: PermissionState): string {
  if (permission === "granted") {
    return "알림 허용됨";
  }

  if (permission === "not_required") {
    return "앱 알림 사용 가능";
  }

  if (permission === "denied") {
    return "알림 차단됨";
  }

  if (permission === "unsupported") {
    return "권한 요청 미지원";
  }

  return "권한 요청 전";
}

function mapNativePermission(
  permission: NativeNotificationPermissionState,
): PermissionState {
  return permission === "not_required" ? "not_required" : permission;
}

export function MobileNotificationSettings({
  favoriteTeam,
}: MobileNotificationSettingsProps) {
  const [settings, setSettings] =
    useState<NotificationSettings>(() => readSavedSettings());
  const [permission, setPermission] =
    useState<PermissionState>(() => getInitialPermission());
  const [message, setMessage] = useState("");

  const enabledCount = useMemo(
    () => Object.values(settings).filter(Boolean).length,
    [settings],
  );

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
  }, [settings]);

  function toggleSetting(key: NotificationSettingKey) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [key]: !currentSettings[key],
    }));
    setMessage("알림 설정을 앱에 저장했습니다.");
  }

  async function handleRequestPermission() {
    const nativePermission = requestNativeNotificationPermission();
    const teamName = favoriteTeam || "응원팀";

    if (nativePermission) {
      const nextPermission = mapNativePermission(nativePermission);

      setPermission(nextPermission);

      if (nextPermission === "granted" || nextPermission === "not_required") {
        const didShowNotification = showNativeNotification(
          "KBO Fan Hub",
          `${teamName} 경기와 뉴스 알림을 받을 준비가 됐습니다.`,
        );

        setMessage(
          didShowNotification
            ? "Android 앱 알림을 보냈습니다. 설정한 항목을 기준으로 받을 수 있습니다."
            : "Android 알림 권한을 요청했습니다. 권한을 허용한 뒤 다시 확인해주세요.",
        );
        return;
      }

      setMessage("Android 앱 알림 권한이 아직 허용되지 않았습니다.");
      return;
    }

    if (typeof window === "undefined" || !("Notification" in window)) {
      showNativeToast("알림 설정을 앱에 저장했습니다.");
      setPermission("unsupported");
      setMessage(
        "현재 환경은 브라우저 알림 권한 요청을 지원하지 않습니다. 설정은 앱 안에 저장됩니다.",
      );
      return;
    }

    const nextPermission = await Notification.requestPermission();
    setPermission(nextPermission);

    if (nextPermission === "granted") {
      new Notification("KBO Fan Hub", {
        body: `${teamName} 경기와 뉴스 알림을 받을 준비가 됐습니다.`,
        icon: "/icon.svg",
      });
      showNativeToast(`${teamName} 알림 설정을 저장했습니다.`);
      setMessage("알림 권한을 허용했습니다. 설정한 항목을 기준으로 받을 수 있습니다.");
      return;
    }

    if (nextPermission === "denied") {
      setMessage("브라우저에서 알림이 차단되어 있습니다. 브라우저 설정을 확인해주세요.");
      return;
    }

    setMessage("아직 알림 권한이 허용되지 않았습니다.");
  }

  return (
    <section className="rounded-[18px] border border-white/70 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-[#d71920]">알림 설정</p>
          <h3 className="mt-1 text-base font-black text-[#071a3d]">
            {favoriteTeam ? `${favoriteTeam} 소식 먼저 받기` : "내 팀 알림 준비"}
          </h3>
          <p className="mt-2 text-xs leading-5 text-[#667085]">
            공식 앱의 푸시 알림 흐름을 참고해 경기, 라인업, 뉴스, 댓글 반응을
            사용자가 직접 고를 수 있게 구성했습니다.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#eef3ff] px-3 py-1.5 text-xs font-black text-[#2f4f9f]">
          {enabledCount}개 ON
        </span>
      </div>

      <div className="mt-4 grid gap-2">
        {settingItems.map((item) => (
          <button
            className="flex items-center justify-between gap-3 rounded-2xl border border-[#d8deea] bg-[#fbfcff] px-3 py-3 text-left active:scale-[0.99]"
            key={item.key}
            onClick={() => toggleSetting(item.key)}
            type="button"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-[#202632]">
                {item.title}
              </span>
              <span className="mt-1 block text-xs leading-5 text-[#667085]">
                {item.description}
              </span>
            </span>
            <span
              className={[
                "relative h-7 w-12 shrink-0 rounded-full transition-colors",
                settings[item.key] ? "bg-[#d71920]" : "bg-[#c7cedb]",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                  settings[item.key] ? "translate-x-6" : "translate-x-1",
                ].join(" ")}
              />
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#fbfcff] px-3 py-3">
        <span className="text-xs font-black text-[#667085]">
          {getPermissionLabel(permission)}
        </span>
        <button
          className="rounded-full bg-[#071a3d] px-3 py-2 text-xs font-black text-white"
          onClick={() => void handleRequestPermission()}
          type="button"
        >
          알림 권한 확인
        </button>
      </div>

      {message ? (
        <p className="mt-3 rounded-2xl bg-[#eef3ff] px-3 py-2 text-xs font-bold leading-5 text-[#1f3470]">
          {message}
        </p>
      ) : null}
    </section>
  );
}
