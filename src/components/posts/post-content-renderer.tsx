import { parsePostContentParts } from "@/lib/posts/content";

type PostContentRendererProps = {
  className?: string;
  content: string;
};

export function PostContentRenderer({
  className = "",
  content,
}: PostContentRendererProps) {
  const parts = parsePostContentParts(content);

  return (
    <div className={className}>
      {parts.map((part, index) => {
        if (part.type === "image") {
          return (
            <figure
              className="my-5 overflow-hidden rounded-sm border border-[#d8deea] bg-[#f8fafc]"
              key={`${part.type}-${index}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={part.alt}
                className="max-h-[720px] w-full bg-white object-contain"
                loading="lazy"
                src={part.src}
              />
              {part.alt ? (
                <figcaption className="border-t border-[#edf1f7] px-3 py-2 text-xs font-bold text-[#667085]">
                  {part.alt}
                </figcaption>
              ) : null}
            </figure>
          );
        }

        if (!part.text) {
          return null;
        }

        return (
          <span className="whitespace-pre-wrap" key={`${part.type}-${index}`}>
            {part.text}
          </span>
        );
      })}
    </div>
  );
}
