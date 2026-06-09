import {
  validateOptionalTagNames,
  validateTagNames,
} from "@/lib/tags/validation";

type ValidationResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      message: string;
    };

type CreatePostInput = {
  title: string;
  content: string;
  tags: string[];
};

type UpdatePostInput = {
  title?: string;
  content?: string;
  tags?: string[];
};

const TITLE_MIN_LENGTH = 2;
const TITLE_MAX_LENGTH = 120;
const CONTENT_MIN_LENGTH = 1;
const CONTENT_MAX_LENGTH = 20_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validateTitle(title: string): string | null {
  if (title.length < TITLE_MIN_LENGTH || title.length > TITLE_MAX_LENGTH) {
    return `Title must be between ${TITLE_MIN_LENGTH} and ${TITLE_MAX_LENGTH} characters.`;
  }

  return null;
}

function validateContent(content: string): string | null {
  if (
    content.length < CONTENT_MIN_LENGTH ||
    content.length > CONTENT_MAX_LENGTH
  ) {
    return `Content must be between ${CONTENT_MIN_LENGTH} and ${CONTENT_MAX_LENGTH} characters.`;
  }

  return null;
}

export function validateCreatePostInput(
  body: unknown,
): ValidationResult<CreatePostInput> {
  if (!isRecord(body)) {
    return { ok: false, message: "Request body is invalid." };
  }

  const title = getTrimmedString(body.title);
  const content = getTrimmedString(body.content);
  const tags = validateTagNames(body.tags);
  const titleError = validateTitle(title);

  if (!tags.ok) {
    return { ok: false, message: tags.message };
  }

  if (titleError) {
    return { ok: false, message: titleError };
  }

  const contentError = validateContent(content);

  if (contentError) {
    return { ok: false, message: contentError };
  }

  return {
    ok: true,
    data: {
      title,
      content,
      tags: tags.data,
    },
  };
}

export function validateUpdatePostInput(
  body: unknown,
): ValidationResult<UpdatePostInput> {
  if (!isRecord(body)) {
    return { ok: false, message: "Request body is invalid." };
  }

  const data: UpdatePostInput = {};
  const tags = validateOptionalTagNames(body.tags);

  if (!tags.ok) {
    return { ok: false, message: tags.message };
  }

  if ("title" in body) {
    const title = getTrimmedString(body.title);
    const titleError = validateTitle(title);

    if (titleError) {
      return { ok: false, message: titleError };
    }

    data.title = title;
  }

  if ("content" in body) {
    const content = getTrimmedString(body.content);
    const contentError = validateContent(content);

    if (contentError) {
      return { ok: false, message: contentError };
    }

    data.content = content;
  }

  if (tags.data !== undefined) {
    data.tags = tags.data;
  }

  if (!data.title && !data.content && data.tags === undefined) {
    return { ok: false, message: "Title, content, or tags are required." };
  }

  return {
    ok: true,
    data,
  };
}
