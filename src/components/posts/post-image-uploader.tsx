"use client";

import { ChangeEvent, useRef, useState } from "react";

import {
  createPostImageMarkdown,
  POST_CONTENT_MAX_LENGTH,
  POST_IMAGE_DATA_URL_MAX_LENGTH,
  type PostImageAttachment,
} from "@/lib/posts/content";

type PostImageUploaderProps = {
  attachments: PostImageAttachment[];
  contentLength: number;
  disabled?: boolean;
  onChange: (attachments: PostImageAttachment[]) => void;
};

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_ORIGINAL_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_ATTACHMENT_COUNT = 10;
const COMPRESSION_STEPS = [
  { maxSize: 1280, quality: 0.82 },
  { maxSize: 1024, quality: 0.76 },
  { maxSize: 800, quality: 0.7 },
  { maxSize: 640, quality: 0.66 },
];

function sanitizeAltText(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  const sanitized = withoutExtension.replace(/[\[\]()\n\r]/g, " ").trim();

  return sanitized || "게시글 이미지";
}

function createAttachmentId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `image-${Date.now()}`;
}

function getAttachmentContentLength(attachments: PostImageAttachment[]): number {
  return attachments
    .map(createPostImageMarkdown)
    .join("\n\n")
    .length;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("이미지를 읽지 못했습니다."));
    };
    image.src = objectUrl;
  });
}

function getScaledSize(
  image: HTMLImageElement,
  maxSize: number,
): { width: number; height: number } {
  const ratio = Math.min(maxSize / image.width, maxSize / image.height, 1);

  return {
    width: Math.max(1, Math.round(image.width * ratio)),
    height: Math.max(1, Math.round(image.height * ratio)),
  };
}

async function createCompressedDataUrl(file: File): Promise<string> {
  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("이미지를 처리하지 못했습니다.");
  }

  for (const step of COMPRESSION_STEPS) {
    const { width, height } = getScaledSize(image, step.maxSize);
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", step.quality);

    if (dataUrl.length <= POST_IMAGE_DATA_URL_MAX_LENGTH) {
      return dataUrl;
    }
  }

  throw new Error("이미지 용량이 큽니다. 더 작은 사진을 선택해주세요.");
}

export function PostImageUploader({
  attachments,
  contentLength,
  disabled = false,
  onChange,
}: PostImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    setMessage("");

    if (attachments.length + files.length > MAX_ATTACHMENT_COUNT) {
      setMessage(`사진은 최대 ${MAX_ATTACHMENT_COUNT}개까지 첨부할 수 있습니다.`);
      return;
    }

    setIsProcessing(true);

    try {
      const nextAttachments = [...attachments];

      for (const file of files) {
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          setMessage("JPG, PNG, WebP 이미지만 첨부할 수 있습니다.");
          return;
        }

        if (file.size > MAX_ORIGINAL_IMAGE_BYTES) {
          setMessage("원본 이미지는 8MB 이하만 선택해주세요.");
          return;
        }

        const dataUrl = await createCompressedDataUrl(file);
        const attachment = {
          id: createAttachmentId(),
          alt: sanitizeAltText(file.name),
          src: dataUrl,
        };
        const nextLength =
          contentLength +
          getAttachmentContentLength([...nextAttachments, attachment]);

        if (nextLength > POST_CONTENT_MAX_LENGTH) {
          setMessage("본문 길이가 너무 깁니다. 글 내용을 줄인 뒤 다시 첨부해주세요.");
          return;
        }

        nextAttachments.push(attachment);
      }

      onChange(nextAttachments);
      setMessage(`${files.length}개 사진을 첨부했습니다.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "이미지를 처리하지 못했습니다.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  function handleRemove(id: string) {
    onChange(attachments.filter((attachment) => attachment.id !== id));
  }

  return (
    <section className="grid gap-3 rounded-sm border border-[#d8deea] bg-white p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black text-[#071a3d]">첨부 이미지</p>
          <p className="mt-1 text-[11px] font-medium text-[#667085]">
            선택한 사진은 글 저장 시 본문 아래에 표시됩니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            className="hidden"
            disabled={disabled || isProcessing}
            multiple
            onChange={(event) => void handleChange(event)}
            ref={inputRef}
            type="file"
          />
          <span className="community-chip px-2">
            {attachments.length}/{MAX_ATTACHMENT_COUNT}
          </span>
          <button
            className="community-button-secondary community-button-compact"
            disabled={
              disabled ||
              isProcessing ||
              attachments.length >= MAX_ATTACHMENT_COUNT
            }
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            {isProcessing ? "첨부 중" : "사진 첨부"}
          </button>
        </div>
      </div>

      {attachments.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {attachments.map((attachment, index) => (
            <div
              className="flex gap-3 rounded-sm border border-[#edf1f7] bg-[#f8fafc] p-2"
              key={attachment.id}
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-sm border border-[#d8deea] bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={attachment.alt}
                  className="h-full w-full object-cover"
                  src={attachment.src}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-[#071a3d]">
                  {index + 1}. {attachment.alt}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-[#667085]">
                  글 저장 시 상세 화면에서 이미지로 표시됩니다.
                </p>
                <button
                  className="community-button-secondary community-button-compact mt-2"
                  disabled={disabled || isProcessing}
                  onClick={() => handleRemove(attachment.id)}
                  type="button"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-sm border border-dashed border-[#cfd8e6] bg-[#fbfcfd] px-3 py-4 text-center text-xs font-bold text-[#667085]">
          첨부된 사진이 없습니다.
        </p>
      )}

      {message ? (
        <p className="rounded-sm bg-[#f8fafc] px-3 py-2 text-[11px] font-bold text-[#667085]">
          {message}
        </p>
      ) : null}
    </section>
  );
}
