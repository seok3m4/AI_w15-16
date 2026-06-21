"use client";

import { openNativeBrowser } from "@/lib/mobile/native-bridge";

type OpenWebButtonProps = {
  children: React.ReactNode;
  className?: string;
  href: string;
};

export function OpenWebButton({
  children,
  className = "",
  href,
}: OpenWebButtonProps) {
  function handleOpenWeb() {
    if (openNativeBrowser(href)) {
      return;
    }

    window.location.href = href;
  }

  return (
    <button
      className={className || "community-button-secondary"}
      onClick={handleOpenWeb}
      type="button"
    >
      {children}
    </button>
  );
}
