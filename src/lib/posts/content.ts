export const POST_CONTENT_MAX_LENGTH = 800_000;
export const POST_IMAGE_DATA_URL_MAX_LENGTH = 320_000;

export type PostContentPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image";
      alt: string;
      src: string;
    };

export type PostImageAttachment = {
  id: string;
  alt: string;
  src: string;
};

const IMAGE_MARKDOWN_SOURCE =
  "!\\[([^\\]\\n]{0,120})\\]\\((data:image\\/(?:png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+|https?:\\/\\/[^\\s)]+)\\)";

function getImageMarkdownPattern(): RegExp {
  return new RegExp(IMAGE_MARKDOWN_SOURCE, "gi");
}

export function parsePostContentParts(content: string): PostContentPart[] {
  const parts: PostContentPart[] = [];
  const pattern = getImageMarkdownPattern();
  let lastIndex = 0;

  for (const match of content.matchAll(pattern)) {
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push({
        type: "text",
        text: content.slice(lastIndex, index),
      });
    }

    parts.push({
      type: "image",
      alt: match[1]?.trim() || "게시글 이미지",
      src: match[2] ?? "",
    });

    lastIndex = index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: "text",
      text: content.slice(lastIndex),
    });
  }

  return parts.length > 0 ? parts : [{ type: "text", text: content }];
}

export function stripPostImageMarkdown(content: string): string {
  return content
    .replace(getImageMarkdownPattern(), (_, alt: string) =>
      alt?.trim() ? `\n[이미지: ${alt.trim()}]\n` : "\n[이미지]\n",
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function getPostPreviewText(content: string, limit = 120): string {
  return stripPostImageMarkdown(content).replace(/\s+/g, " ").trim().slice(0, limit);
}

export function createPostImageMarkdown(
  attachment: Pick<PostImageAttachment, "alt" | "src">,
): string {
  const safeAlt = attachment.alt.replace(/[\[\]()\n\r]/g, " ").trim();

  return `![${safeAlt || "게시글 이미지"}](${attachment.src})`;
}

export function serializePostContent(
  text: string,
  attachments: PostImageAttachment[],
): string {
  const imageMarkdown = attachments.map(createPostImageMarkdown).join("\n\n");

  return [text.trim(), imageMarkdown].filter(Boolean).join("\n\n");
}

export function extractPostImageAttachments(content: string): {
  text: string;
  attachments: PostImageAttachment[];
} {
  const parts = parsePostContentParts(content);
  const attachments: PostImageAttachment[] = [];
  const text = parts
    .map((part, index) => {
      if (part.type === "text") {
        return part.text;
      }

      attachments.push({
        id: `post-image-${index}`,
        alt: part.alt,
        src: part.src,
      });

      return "";
    })
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { text, attachments };
}
