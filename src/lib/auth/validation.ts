type ValidationResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      message: string;
    };

type SignupInput = {
  email: string;
  password: string;
  nickname: string;
};

type LoginInput = {
  email: string;
  password: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getPassword(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function validateSignupInput(
  body: unknown,
): ValidationResult<SignupInput> {
  if (!isRecord(body)) {
    return { ok: false, message: "요청 본문이 올바르지 않습니다." };
  }

  const email = getString(body.email).toLowerCase();
  const password = getPassword(body.password);
  const nickname = getString(body.nickname);

  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, message: "올바른 이메일을 입력해주세요." };
  }

  if (password.length < 8 || password.length > 72) {
    return { ok: false, message: "비밀번호는 8자 이상 72자 이하입니다." };
  }

  if (nickname.length < 2 || nickname.length > 20) {
    return { ok: false, message: "닉네임은 2자 이상 20자 이하입니다." };
  }

  return {
    ok: true,
    data: {
      email,
      password,
      nickname,
    },
  };
}

export function validateLoginInput(body: unknown): ValidationResult<LoginInput> {
  if (!isRecord(body)) {
    return { ok: false, message: "요청 본문이 올바르지 않습니다." };
  }

  const email = getString(body.email).toLowerCase();
  const password = getPassword(body.password);

  if (!EMAIL_PATTERN.test(email) || password.length === 0) {
    return {
      ok: false,
      message: "이메일 또는 비밀번호가 올바르지 않습니다.",
    };
  }

  return {
    ok: true,
    data: {
      email,
      password,
    },
  };
}
