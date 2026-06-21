"use client";

import { useState } from "react";

import { shareFromMobileApp } from "@/lib/mobile/native-bridge";

type MobileShareButtonProps = {
  children?: React.ReactNode;
  className?: string;
  title: string;
  text?: string;
  url?: string;
};

export function MobileShareButton({
  children = "공유",
  className = "",
  title,
  text,
  url,
}: MobileShareButtonProps) {
  const [message, setMessage] = useState("");

  async function handleShare() {
    setMessage("");

    const result = await shareFromMobileApp({
      title,
      text,
      url,
    });

    if (result === "clipboard") {
      setMessage("링크를 복사했습니다.");
      return;
    }

    if (result === "failed") {
      setMessage("공유하지 못했습니다.");
    }
  }

  return (
    <div className="min-w-0">
      <button
        className={className || "community-button-secondary"}
        onClick={() => void handleShare()}
        type="button"
      >
        {children}
      </button>
      {message ? (
        <p className="mt-1 text-right text-[11px] font-bold text-[#667085]">
          {message}
        </p>
      ) : null}
    </div>
  );
}
