type ValidationResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      message: string;
    };

type CommentInput = {
  content: string;
};

const CONTENT_MIN_LENGTH = 1;
const CONTENT_MAX_LENGTH = 5_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validateContent(content: string): string | null {
  if (
    content.length < CONTENT_MIN_LENGTH ||
    content.length > CONTENT_MAX_LENGTH
  ) {
    return `Comment must be between ${CONTENT_MIN_LENGTH} and ${CONTENT_MAX_LENGTH} characters.`;
  }

  return null;
}

export function validateCommentInput(
  body: unknown,
): ValidationResult<CommentInput> {
  if (!isRecord(body)) {
    return { ok: false, message: "Request body is invalid." };
  }

  const content = getTrimmedString(body.content);
  const contentError = validateContent(content);

  if (contentError) {
    return { ok: false, message: contentError };
  }

  return {
    ok: true,
    data: {
      content,
    },
  };
}
