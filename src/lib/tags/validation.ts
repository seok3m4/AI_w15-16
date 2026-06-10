type ValidationResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      message: string;
    };

const MAX_TAGS_PER_POST = 10;
const TAG_MIN_LENGTH = 1;
const TAG_MAX_LENGTH = 30;

export function normalizeTagName(value: string): string {
  return value.trim().replace(/^#+/, "").replace(/\s+/g, " ");
}

export function getTagComparisonKey(value: string): string {
  return normalizeTagName(value).toLowerCase();
}

export function validateTagNames(value: unknown): ValidationResult<string[]> {
  if (value === undefined) {
    return { ok: true, data: [] };
  }

  if (!Array.isArray(value)) {
    return { ok: false, message: "Tags must be an array of strings." };
  }

  if (value.length > MAX_TAGS_PER_POST) {
    return {
      ok: false,
      message: `A post can have up to ${MAX_TAGS_PER_POST} tags.`,
    };
  }

  const tagNames: string[] = [];
  const tagKeys = new Set<string>();

  for (const item of value) {
    if (typeof item !== "string") {
      return { ok: false, message: "Tags must be an array of strings." };
    }

    const tagName = normalizeTagName(item);

    if (
      tagName.length < TAG_MIN_LENGTH ||
      tagName.length > TAG_MAX_LENGTH
    ) {
      return {
        ok: false,
        message: `Tag names must be between ${TAG_MIN_LENGTH} and ${TAG_MAX_LENGTH} characters.`,
      };
    }

    const tagKey = getTagComparisonKey(tagName);

    if (!tagKeys.has(tagKey)) {
      tagKeys.add(tagKey);
      tagNames.push(tagName);
    }
  }

  return {
    ok: true,
    data: tagNames,
  };
}

export function validateOptionalTagNames(
  value: unknown,
): ValidationResult<string[] | undefined> {
  if (value === undefined) {
    return { ok: true, data: undefined };
  }

  return validateTagNames(value);
}
