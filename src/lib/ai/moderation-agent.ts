import { ChatOpenAI } from "@langchain/openai";

import { getChatModel, getOpenAIApiKey } from "@/lib/ai/config";
import {
  type ModerationCategory,
  type ModerationInput,
  type ModerationResult,
  type ModerationTargetType,
  runRuleBasedModeration,
} from "@/lib/ai/moderation-rules";

export type {
  ModerationCategory,
  ModerationInput,
  ModerationResult,
  ModerationTargetType,
};

function getJsonObject(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);

  if (!match) {
    return null;
  }

  try {
    const parsed = JSON.parse(match[0]);

    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function getModerationCategories(value: unknown): ModerationCategory[] {
  const validCategories: ModerationCategory[] = [
    "abuse",
    "targeted_attack",
    "spam",
    "privacy",
    "heated_tone",
  ];

  return getStringArray(value).filter((category): category is ModerationCategory =>
    validCategories.includes(category as ModerationCategory),
  );
}

async function refineWithModel(
  input: ModerationInput,
  fallback: ModerationResult,
): Promise<ModerationResult | null> {
  const apiKey = getOpenAIApiKey();

  if (!apiKey) {
    return null;
  }

  const prompt = [
    "너는 야구 커뮤니티의 자율 운영 모더레이터다.",
    "아래 글/댓글이 커뮤니티에서 등록 가능한지 판단해라.",
    "비판 의견은 허용하되, 개인정보 노출, 특정 대상 인신공격, 과한 욕설, 스팸은 제한해라.",
    "JSON만 응답해라.",
    "",
    "가능한 verdict: allow, warn, block",
    "가능한 severity: safe, caution, unsafe",
    "가능한 categories: abuse, targeted_attack, spam, privacy, heated_tone",
    "",
    "[규칙 기반 점검 결과]",
    JSON.stringify(fallback, null, 2),
    "",
    "[검사 대상]",
    JSON.stringify(input, null, 2),
    "",
    `{"verdict":"allow","severity":"safe","message":"","categories":[],"reasons":[],"suggestions":[]}`,
  ].join("\n");

  try {
    const chat = new ChatOpenAI({
      apiKey,
      model: getChatModel(),
      temperature: 0,
    });
    const response = await chat.invoke(prompt);
    const content =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);
    const parsed = getJsonObject(content);

    if (!parsed) {
      return null;
    }

    const verdict =
      parsed.verdict === "block" || parsed.verdict === "warn"
        ? parsed.verdict
        : "allow";
    const severity =
      parsed.severity === "unsafe" || parsed.severity === "caution"
        ? parsed.severity
        : "safe";

    return {
      verdict,
      severity,
      message:
        typeof parsed.message === "string" && parsed.message.trim()
          ? parsed.message.trim()
          : fallback.message,
      categories: getModerationCategories(parsed.categories),
      reasons: getStringArray(parsed.reasons),
      suggestions: getStringArray(parsed.suggestions),
      modelUsed: true,
      toolTrace: fallback.toolTrace,
    };
  } catch (error) {
    console.error("Failed to run moderation agent model refinement.", error);

    return null;
  }
}

export async function runModerationAgent(
  input: ModerationInput,
): Promise<ModerationResult> {
  const fallback = runRuleBasedModeration(input);

  if (fallback.verdict === "allow") {
    return fallback;
  }

  const refined = await refineWithModel(input, fallback);

  if (!refined) {
    return fallback;
  }

  return {
    ...fallback,
    message: refined.message || fallback.message,
    categories:
      fallback.categories.length > 0 ? fallback.categories : refined.categories,
    reasons: fallback.reasons.length > 0 ? fallback.reasons : refined.reasons,
    suggestions:
      refined.suggestions.length > 0
        ? refined.suggestions
        : fallback.suggestions,
    modelUsed: true,
    toolTrace: fallback.toolTrace,
  };
}

export function getModerationBlockMessage(result: ModerationResult): string {
  const detail = result.reasons[0] ? ` ${result.reasons[0]}` : "";

  return `${result.message}${detail}`;
}
