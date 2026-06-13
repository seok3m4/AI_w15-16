export type ModerationTargetType = "post" | "comment";
export type ModerationVerdict = "allow" | "warn" | "block";
export type ModerationCategory =
  | "abuse"
  | "targeted_attack"
  | "spam"
  | "privacy"
  | "heated_tone";

export type ModerationResult = {
  verdict: ModerationVerdict;
  severity: "safe" | "caution" | "unsafe";
  message: string;
  categories: ModerationCategory[];
  reasons: string[];
  suggestions: string[];
  modelUsed: boolean;
  toolTrace: string[];
};

export type ModerationInput = {
  targetType: ModerationTargetType;
  title?: string;
  content: string;
};

type ToolCheckResult = {
  categories: ModerationCategory[];
  reasons: string[];
  suggestions: string[];
  score: number;
  trace: string;
};

const ABUSE_PATTERNS = [
  /시발|씨발|ㅅㅂ|병신|ㅂㅅ|개새끼|새끼|좆|꺼져|죽어|버러지/i,
  /폐급|노답|쓰레기|역겹|한심/i,
];
const TARGET_PATTERNS = [
  /(선수|감독|팬|팀|구단|심판).{0,24}(꺼져|죽어|은퇴|버러지|폐급|쓰레기|노답)/i,
  /(저 사람|쟤|걔|너).{0,24}(꺼져|죽어|버러지|폐급|쓰레기)/i,
];
const PRIVACY_PATTERNS = [
  /\b010[-.\s]?\d{4}[-.\s]?\d{4}\b/,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /(주소|전화번호|계좌|주민번호|민번).{0,20}(공개|박제|털자|알려)/i,
];
const URL_PATTERN = /https?:\/\/\S+/gi;

function uniqueCategories(categories: ModerationCategory[]): ModerationCategory[] {
  return [...new Set(categories)];
}

function getText(input: ModerationInput): string {
  return [input.title, input.content].filter(Boolean).join("\n").trim();
}

function runAbuseTool(text: string): ToolCheckResult {
  const hits = ABUSE_PATTERNS.filter((pattern) => pattern.test(text)).length;

  if (hits === 0) {
    return {
      categories: [],
      reasons: [],
      suggestions: [],
      score: 0,
      trace: "check_abuse: clean",
    };
  }

  return {
    categories: hits >= 2 ? ["abuse", "heated_tone"] : ["abuse"],
    reasons: ["욕설 또는 과격한 표현이 포함되어 있습니다."],
    suggestions: ["선수, 팀, 팬을 비난하기보다 경기 내용 중심으로 표현해보세요."],
    score: hits >= 2 ? 4 : 2,
    trace: `check_abuse: ${hits} hit(s)`,
  };
}

function runTargetedAttackTool(text: string): ToolCheckResult {
  const hasTargetedAttack = TARGET_PATTERNS.some((pattern) => pattern.test(text));

  if (!hasTargetedAttack) {
    return {
      categories: [],
      reasons: [],
      suggestions: [],
      score: 0,
      trace: "check_targeted_attack: clean",
    };
  }

  return {
    categories: ["targeted_attack", "heated_tone"],
    reasons: ["특정 대상에 대한 인신공격 또는 퇴장 요구성 표현이 감지되었습니다."],
    suggestions: ["사람을 공격하는 문장 대신 플레이, 전술, 기록에 대한 의견으로 바꿔보세요."],
    score: 5,
    trace: "check_targeted_attack: hit",
  };
}

function runSpamTool(text: string): ToolCheckResult {
  const urls = text.match(URL_PATTERN) ?? [];
  const repeatedCharacters = /(.)\1{8,}/.test(text);

  if (urls.length < 3 && !repeatedCharacters) {
    return {
      categories: [],
      reasons: [],
      suggestions: [],
      score: 0,
      trace: "check_spam: clean",
    };
  }

  return {
    categories: ["spam"],
    reasons: ["반복 문자 또는 과도한 링크가 포함되어 스팸처럼 보일 수 있습니다."],
    suggestions: ["링크 수를 줄이고 본문 설명을 함께 작성해주세요."],
    score: urls.length >= 5 ? 5 : 3,
    trace: `check_spam: urls=${urls.length}, repeated=${repeatedCharacters}`,
  };
}

function runPrivacyTool(text: string): ToolCheckResult {
  const hasPrivacyRisk = PRIVACY_PATTERNS.some((pattern) => pattern.test(text));

  if (!hasPrivacyRisk) {
    return {
      categories: [],
      reasons: [],
      suggestions: [],
      score: 0,
      trace: "check_privacy: clean",
    };
  }

  return {
    categories: ["privacy"],
    reasons: ["전화번호, 이메일, 주소 등 개인정보로 보이는 내용이 포함되어 있습니다."],
    suggestions: ["개인정보는 삭제하거나 식별되지 않게 가린 뒤 작성해주세요."],
    score: 6,
    trace: "check_privacy: hit",
  };
}

export function runRuleBasedModeration(
  input: ModerationInput,
): ModerationResult {
  const text = getText(input);
  const checks = [
    runAbuseTool(text),
    runTargetedAttackTool(text),
    runSpamTool(text),
    runPrivacyTool(text),
  ];
  const score = checks.reduce((total, check) => total + check.score, 0);
  const categories = uniqueCategories(
    checks.flatMap((check) => check.categories),
  );
  const reasons = [...new Set(checks.flatMap((check) => check.reasons))];
  const suggestions = [...new Set(checks.flatMap((check) => check.suggestions))];
  const hasBlockCategory =
    categories.includes("privacy") ||
    categories.includes("targeted_attack") ||
    score >= 6;
  const verdict: ModerationVerdict =
    hasBlockCategory ? "block" : score >= 2 ? "warn" : "allow";
  const severity =
    verdict === "block" ? "unsafe" : verdict === "warn" ? "caution" : "safe";

  if (verdict === "allow") {
    return {
      verdict,
      severity,
      message: "커뮤니티 운영 정책상 특별한 위험 표현이 감지되지 않았습니다.",
      categories,
      reasons,
      suggestions,
      modelUsed: false,
      toolTrace: checks.map((check) => check.trace),
    };
  }

  return {
    verdict,
    severity,
    message:
      verdict === "block"
        ? "운영 정책상 그대로 등록하기 어려운 표현이 감지되었습니다."
        : "표현이 다소 공격적으로 보일 수 있습니다. 등록 전에 한 번 더 다듬어보세요.",
    categories,
    reasons,
    suggestions,
    modelUsed: false,
    toolTrace: checks.map((check) => check.trace),
  };
}
