"use client";

import Link from "next/link";
import { useState } from "react";

import { openAndroidApp } from "@/lib/mobile/native-bridge";

type OpenInAppActionsProps = {
  mobileHref: string;
  className?: string;
};

export function OpenInAppActions({
  mobileHref,
  className = "",
}: OpenInAppActionsProps) {
  const [message, setMessage] = useState("");

  function handleOpenApp() {
    const didOpen = openAndroidApp(mobileHref);

    setMessage(
      didOpen
        ? "앱이 설치되어 있으면 해당 화면으로 이동합니다."
        : "모바일 화면 링크로 확인해주세요.",
    );
  }

  return (
    <div className={["flex flex-wrap items-center gap-2", className].join(" ")}>
      <button
        className="community-button-primary community-button-compact"
        onClick={handleOpenApp}
        type="button"
      >
        앱으로 열기
      </button>
      <Link
        className="community-button-secondary community-button-compact"
        href={mobileHref}
      >
        모바일 화면
      </Link>
      {message ? (
        <span className="basis-full text-[11px] font-bold text-[#667085] sm:basis-auto">
          {message}
        </span>
      ) : null}
    </div>
  );
}
