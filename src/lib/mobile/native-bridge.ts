export type KboFanHubAndroidBridge = {
  getAppVersion?: () => string;
  getLaunchUrl?: () => string;
  getNotificationPermissionState?: () => NativeNotificationPermissionState;
  openInBrowser?: (url: string) => void;
  reloadApp?: () => void;
  requestNotificationPermission?: () => NativeNotificationPermissionState;
  showToast?: (message: string) => void;
  showLocalNotification?: (title: string, message: string) => boolean;
  showLocalNotificationForUrl?: (
    title: string,
    message: string,
    targetUrl: string,
  ) => boolean;
  shareText?: (text: string) => void;
};

export type NativeNotificationPermissionState =
  | "granted"
  | "denied"
  | "not_required";

type SharePayload = {
  title: string;
  text?: string;
  url?: string;
};

type NavigatorWithShare = Navigator & {
  share?: (data: ShareData) => Promise<void>;
};

declare global {
  interface Window {
    KboFanHubAndroid?: KboFanHubAndroidBridge;
  }
}

export function getNativeShellVersion(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const bridgeVersion = window.KboFanHubAndroid?.getAppVersion?.();

    if (bridgeVersion) {
      return bridgeVersion;
    }
  } catch {
    return "Android";
  }

  return window.navigator.userAgent.includes("KboFanHubAndroid")
    ? "Android"
    : null;
}

export function getNativeLaunchUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.KboFanHubAndroid?.getLaunchUrl?.() ?? null;
  } catch {
    return null;
  }
}

export function getNativeBridgeCapabilities() {
  if (typeof window === "undefined") {
    return {
      canOpenBrowser: false,
      canNotify: false,
      canReload: false,
      canShare: false,
      canToast: false,
    };
  }

  return {
    canOpenBrowser: Boolean(window.KboFanHubAndroid?.openInBrowser),
    canNotify: Boolean(
      window.KboFanHubAndroid?.showLocalNotificationForUrl ||
        window.KboFanHubAndroid?.showLocalNotification,
    ),
    canReload: Boolean(window.KboFanHubAndroid?.reloadApp),
    canShare: Boolean(window.KboFanHubAndroid?.shareText),
    canToast: Boolean(window.KboFanHubAndroid?.showToast),
  };
}

export function getNativeNotificationPermissionState():
  | NativeNotificationPermissionState
  | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.KboFanHubAndroid?.getNotificationPermissionState?.() ?? null;
  } catch {
    return null;
  }
}

export function requestNativeNotificationPermission():
  | NativeNotificationPermissionState
  | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.KboFanHubAndroid?.requestNotificationPermission?.() ?? null;
  } catch {
    return null;
  }
}

export function showNativeNotification(
  title: string,
  message: string,
  pathOrUrl?: string,
): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    if (window.KboFanHubAndroid?.showLocalNotificationForUrl) {
      return Boolean(
        window.KboFanHubAndroid.showLocalNotificationForUrl(
          title,
          message,
          createAndroidDeepLink(pathOrUrl ?? window.location.href),
        ),
      );
    }

    return Boolean(window.KboFanHubAndroid?.showLocalNotification?.(title, message));
  } catch {
    return false;
  }
}

export function getAbsoluteAppUrl(pathOrUrl?: string): string {
  if (typeof window === "undefined") {
    return pathOrUrl ?? "";
  }

  return new URL(pathOrUrl ?? window.location.href, window.location.origin).href;
}

export function showNativeToast(message: string): boolean {
  try {
    window.KboFanHubAndroid?.showToast?.(message);

    return Boolean(window.KboFanHubAndroid?.showToast);
  } catch {
    return false;
  }
}

export function reloadNativeApp(): boolean {
  try {
    window.KboFanHubAndroid?.reloadApp?.();

    return Boolean(window.KboFanHubAndroid?.reloadApp);
  } catch {
    return false;
  }
}

export function openNativeBrowser(pathOrUrl?: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.KboFanHubAndroid?.openInBrowser?.(getAbsoluteAppUrl(pathOrUrl));

    return Boolean(window.KboFanHubAndroid?.openInBrowser);
  } catch {
    return false;
  }
}

export function createAndroidDeepLink(pathOrUrl?: string): string {
  const absoluteUrl = getAbsoluteAppUrl(pathOrUrl);

  if (!absoluteUrl) {
    return "kbofanhub://app";
  }

  const url = new URL(absoluteUrl);
  const path = url.pathname;
  const search = url.search;

  if (path.startsWith("/mobile-app/posts/")) {
    const postId = path.replace("/mobile-app/posts/", "");

    return `kbofanhub://posts/${postId}${search}`;
  }

  if (path.startsWith("/mobile-app/games/")) {
    const gameId = path.replace("/mobile-app/games/", "");

    return `kbofanhub://games/${gameId}${search}`;
  }

  if (path.startsWith("/mobile-app/write")) {
    return `kbofanhub://write${search}`;
  }

  return `kbofanhub://app${search}`;
}

export function openAndroidApp(pathOrUrl?: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  window.location.href = createAndroidDeepLink(pathOrUrl);

  return true;
}

export async function shareFromMobileApp({
  title,
  text = "",
  url,
}: SharePayload): Promise<"native" | "web-share" | "clipboard" | "failed"> {
  if (typeof window === "undefined") {
    return "failed";
  }

  const shareUrl = getAbsoluteAppUrl(url);
  const shareText = [title, text, shareUrl].filter(Boolean).join("\n");

  try {
    if (window.KboFanHubAndroid?.shareText) {
      window.KboFanHubAndroid.shareText(shareText);

      return "native";
    }
  } catch {
    return "failed";
  }

  const navigatorWithShare = window.navigator as NavigatorWithShare;

  if (navigatorWithShare.share) {
    try {
      await navigatorWithShare.share({
        title,
        text,
        url: shareUrl,
      });

      return "web-share";
    } catch {
      return "failed";
    }
  }

  try {
    await window.navigator.clipboard.writeText(shareText);

    return "clipboard";
  } catch {
    return "failed";
  }
}
