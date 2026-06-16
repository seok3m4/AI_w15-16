import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import { IonContent, IonIcon, IonPage } from "@ionic/react";
import {
  arrowBackOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  eyeOffOutline,
  eyeOutline,
  keyOutline,
  logoGoogle,
  logInOutline,
  mailOutline,
  personAddOutline,
  refreshOutline,
  shieldCheckmarkOutline,
} from "ionicons/icons";

import {
  ApiRequestError,
  checkNicknameAvailability,
  completeSignupWithEmail,
  confirmAdminTotp,
  fetchAdminMfaSession,
  getGoogleLoginUrl,
  loginWithEmail,
  resendVerificationEmail,
  setupAdminTotp,
  signupWithEmail,
  verifyAdminTotp,
  verifyEmailCode,
  type CurrentUser,
} from "../api/authApi";

import "./AuthPage.css";

type AuthMode = "login" | "signup";
type AuthStep = "form" | "mfa-setup" | "mfa-verify" | "mfa-recovery";
type MessageKind = "notice" | "error";
type NicknameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "error";
type ValidationState = "passed" | "failed" | "pending" | "neutral";
type PendingCaptchaAction = "send-signup-code" | "resend-verification";

interface ValidationItem {
  id: string;
  label: string;
  state: ValidationState;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nicknamePattern = /^[\uAC00-\uD7A3A-Za-z0-9_-]{2,20}$/;
const passwordPolicy = {
  minLength: 12,
  maxLength: 64,
  maxUtf8Bytes: 72,
} as const;
const uppercasePasswordPattern = /\p{Lu}/u;
const specialPasswordPattern = /[^\p{L}\p{N}\s]/u;
const passwordPolicySummary =
  "비밀번호는 12~64자이며 대문자와 특수문자를 각각 1개 이상 포함해야 합니다.";
const blockedPasswordTerms = [
  "password",
  "passwordpassword",
  "passwordpasswordpassword",
  "qwerty",
  "letmein",
  "admin",
  "administrator",
  "useconai",
  "junglecamp",
  "us econ ai",
  "usecon",
];

function oauthErrorMessage(errorCode: string | null) {
  if (errorCode === "local_email_exists") {
    return "이미 일반 이메일 계정으로 가입된 이메일입니다. 계정 연결 기능은 이후 별도 화면에서 제공됩니다.";
  }
  if (errorCode === "access_denied") {
    return "Google 로그인이 취소되었습니다.";
  }
  if (errorCode) {
    return "Google 로그인 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  }
  return null;
}

export default function AuthPage() {
  const history = useHistory();
  const location = useLocation();
  const verified = useMemo(
    () => new URLSearchParams(location.search).get("verified") === "1",
    [location.search],
  );
  const oauthError = useMemo(
    () => new URLSearchParams(location.search).get("oauthError"),
    [location.search],
  );
  const mfaRequested = useMemo(
    () => new URLSearchParams(location.search).get("mfa") === "1",
    [location.search],
  );
  const oauthMessage = useMemo(() => oauthErrorMessage(oauthError), [oauthError]);
  const verifiedMessage =
    "이메일 인증이 완료되었습니다. 가입 화면에서 같은 이메일로 계정 설정을 마무리하세요.";

  const [mode, setMode] = useState<AuthMode>("login");
  const [step, setStep] = useState<AuthStep>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [signupCodeSent, setSignupCodeSent] = useState(false);
  const [signupEmailVerified, setSignupEmailVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [verificationExpiresAt, setVerificationExpiresAt] = useState<string | null>(null);
  const [verificationClock, setVerificationClock] = useState(() => Date.now());
  const [nicknameStatus, setNicknameStatus] = useState<NicknameStatus>("idle");
  const [nicknameMessage, setNicknameMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [setupSecret, setSetupSecret] = useState("");
  const [setupUri, setSetupUri] = useState("");
  const [setupQrDataUrl, setSetupQrDataUrl] = useState("");
  const [setupQrError, setSetupQrError] = useState("");
  const [showManualTotpSetup, setShowManualTotpSetup] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isMfaBusy, setIsMfaBusy] = useState(false);
  const [mfaReturnPath, setMfaReturnPath] = useState<"/home" | "/admin">("/home");
  const [message, setMessage] = useState<string | null>(
    verified
      ? "이메일 인증이 완료되었습니다. 가입 화면에서 같은 이메일로 계정 설정을 마무리하세요."
      : null,
  );
  const [messageKind, setMessageKind] = useState<MessageKind>("notice");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [pendingCaptchaAction, setPendingCaptchaAction] = useState<PendingCaptchaAction | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    if (location.pathname !== "/auth") {
      return;
    }
    if (mfaRequested) {
      let ignore = false;
      resetAuthEntryState();
      setIsMfaBusy(true);
      void (async () => {
        try {
          const user = await fetchAdminMfaSession();
          if (ignore) {
            return;
          }
          setCurrentUser(user);
          if (!user) {
            setMessage("로그인이 필요합니다. 먼저 로그인해 주세요.");
            setMessageKind("error");
            return;
          }
          if (!user.roles.includes("ROLE_ADMIN") || !user.adminMfaRequired) {
            history.replace("/home");
            return;
          }
          if (user.adminMfaVerified) {
            history.replace("/admin");
            return;
          }
          await enterAdminMfaFlow(user, "/admin");
        } catch (error) {
          if (!ignore) {
            setMessage(error instanceof Error ? error.message : "관리자 MFA 상태를 확인하지 못했습니다.");
            setMessageKind("error");
          }
        } finally {
          if (!ignore) {
            setIsMfaBusy(false);
          }
        }
      })();
      return () => {
        ignore = true;
      };
    }
    if (oauthMessage) {
      resetAuthEntryState();
      setMessage(oauthMessage);
      setMessageKind("error");
      return;
    }
    if (verified) {
      setMessage(verifiedMessage);
      setMessageKind("notice");
      return;
    }
    resetAuthEntryState();
  }, [history, location.pathname, location.search, mfaRequested, oauthMessage, verified, verifiedMessage]);

  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetRef = useRef<string | null>(null);

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedNickname = nickname.trim();
  const emailValid = emailPattern.test(normalizedEmail);
  const codeValid = /^\d{6}$/.test(verificationCode);
  const captchaBlocksSubmit = Boolean(captchaRequired && turnstileSiteKey && !captchaToken);
  const signupEmailLocked = mode === "signup" && (signupCodeSent || signupEmailVerified);
  const verificationRemainingSeconds = useMemo(() => {
    if (!verificationExpiresAt || signupEmailVerified) {
      return 0;
    }
    const expiresAtMs = Date.parse(verificationExpiresAt);
    if (Number.isNaN(expiresAtMs)) {
      return 0;
    }
    return Math.max(0, Math.ceil((expiresAtMs - verificationClock) / 1000));
  }, [signupEmailVerified, verificationClock, verificationExpiresAt]);
  const verificationExpired = Boolean(
    signupCodeSent &&
      !signupEmailVerified &&
      verificationExpiresAt &&
      verificationRemainingSeconds <= 0,
  );

  const passwordValidationMessage = useMemo(() => {
    if (!password) {
      return passwordPolicySummary;
    }
    if (password.length < passwordPolicy.minLength || password.length > passwordPolicy.maxLength) {
      return "비밀번호는 12~64자로 입력하세요.";
    }
    if (new TextEncoder().encode(password).length > passwordPolicy.maxUtf8Bytes) {
      return "비밀번호가 너무 깁니다. 한글이나 이모지는 더 짧게 입력하세요.";
    }
    if (!uppercasePasswordPattern.test(password)) {
      return "비밀번호에 대문자를 1개 이상 포함하세요.";
    }
    if (!specialPasswordPattern.test(password)) {
      return "비밀번호에 특수문자를 1개 이상 포함하세요.";
    }
    const normalizedPassword = password.toLowerCase();
    if (containsContext(normalizedPassword, normalizedEmail)) {
      return "이메일과 비슷한 비밀번호는 사용할 수 없습니다.";
    }
    if (containsContext(normalizedPassword, normalizedNickname)) {
      return "닉네임과 비슷한 비밀번호는 사용할 수 없습니다.";
    }
    if (blockedPasswordTerms.some((term) => normalizedPassword.includes(term))) {
      return "흔한 단어 또는 서비스명이 포함된 비밀번호는 사용할 수 없습니다.";
    }
    return "";
  }, [normalizedEmail, normalizedNickname, password]);

  const passwordPolicyValid = password.length > 0 && passwordValidationMessage === "";
  const passwordFeedbackState: ValidationState = !password ? "neutral" : passwordPolicyValid ? "passed" : "failed";
  const passwordFeedbackMessage = passwordPolicyValid ? "사용 가능한 비밀번호입니다." : passwordValidationMessage;
  const passwordConfirmationValid = confirmPassword.length > 0 && password === confirmPassword;
  const confirmPasswordFeedbackState: ValidationState = !confirmPassword
    ? "neutral"
    : passwordConfirmationValid
      ? "passed"
      : "failed";
  const confirmPasswordFeedbackMessage = passwordConfirmationValid
    ? "비밀번호가 일치합니다."
    : confirmPassword
      ? "비밀번호가 일치하지 않습니다."
      : "비밀번호 확인을 입력하세요.";
  const signupDetailsValid =
    signupEmailVerified &&
    nicknameStatus === "available" &&
    passwordPolicyValid &&
    passwordConfirmationValid &&
    termsAccepted &&
    privacyAccepted &&
    !captchaBlocksSubmit;

  const emailValidationItems: ValidationItem[] = [
    {
      id: "format",
      label: "이메일 형식",
      state: emailValid ? "passed" : normalizedEmail ? "failed" : "neutral",
    },
    {
      id: "sent",
      label: signupCodeSent ? "인증번호 전송됨" : "인증번호 전송 대기",
      state: signupCodeSent ? "passed" : "neutral",
    },
    {
      id: "verified",
      label: "이메일 인증 완료",
      state: signupEmailVerified ? "passed" : signupCodeSent ? "pending" : "neutral",
    },
  ];

  const codeValidationItems: ValidationItem[] = [
    {
      id: "six-digits",
      label: "6자리 숫자 입력",
      state: codeValid ? "passed" : verificationCode ? "failed" : "neutral",
    },
  ];

  const nicknameValidationItems: ValidationItem[] = [
    {
      id: "format",
      label: "2~20자, 한글/영문/숫자/_/- 사용",
      state: !normalizedNickname
        ? "neutral"
        : nicknamePattern.test(normalizedNickname)
          ? "passed"
          : "failed",
    },
    {
      id: "availability",
      label: nicknameMessage || "닉네임 중복 확인",
      state: nicknameAvailabilityState(nicknameStatus, normalizedNickname),
    },
  ];

  useEffect(() => {
    if (!captchaRequired || !turnstileSiteKey || !turnstileRef.current) {
      return;
    }
    let cancelled = false;
    function renderTurnstile() {
      if (cancelled || !window.turnstile || !turnstileRef.current || turnstileWidgetRef.current) {
        return;
      }
      turnstileWidgetRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: turnstileSiteKey,
        theme: "dark",
        callback: handleCaptchaToken,
        "expired-callback": () => setCaptchaToken(""),
        "error-callback": () => setCaptchaToken(""),
      });
    }
    if (window.turnstile) {
      renderTurnstile();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = renderTurnstile;
    document.head.appendChild(script);
    return () => {
      cancelled = true;
    };
  }, [captchaRequired]);

  useEffect(() => {
    if (!captchaToken || !pendingCaptchaAction || isSubmitting || isResending) {
      return;
    }
    const action = pendingCaptchaAction;
    setPendingCaptchaAction(null);
    if (action === "send-signup-code") {
      void handleSendSignupCode();
      return;
    }
    void handleResend();
  }, [captchaToken, pendingCaptchaAction, isSubmitting, isResending]);

  useEffect(() => {
    if (mode !== "signup" || !signupEmailVerified) {
      setNicknameStatus("idle");
      setNicknameMessage("");
      return;
    }
    if (!normalizedNickname) {
      setNicknameStatus("idle");
      setNicknameMessage("");
      return;
    }
    if (!nicknamePattern.test(normalizedNickname)) {
      setNicknameStatus("invalid");
      setNicknameMessage("닉네임 형식을 확인하세요.");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setNicknameStatus("checking");
      setNicknameMessage("닉네임을 확인 중입니다.");
      void checkNicknameAvailability(normalizedNickname, controller.signal)
        .then((result) => {
          if (!result.valid) {
            setNicknameStatus("invalid");
            setNicknameMessage("닉네임 형식을 확인하세요.");
            return;
          }
          setNicknameStatus(result.available ? "available" : "taken");
          setNicknameMessage(result.available ? "사용 가능한 닉네임입니다." : "이미 사용 중인 닉네임입니다.");
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          setNicknameStatus("error");
          setNicknameMessage("닉네임 확인에 실패했습니다.");
        });
    }, 500);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [mode, normalizedNickname, signupEmailVerified]);

  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  useEffect(() => {
    if (!verificationExpiresAt || signupEmailVerified) {
      return;
    }
    setVerificationClock(Date.now());
    const timer = window.setInterval(() => {
      setVerificationClock(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [signupEmailVerified, verificationExpiresAt]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "signup") {
      await handleCompleteSignup();
      return;
    }
    await handleLoginSubmit();
  }

  async function handleSendSignupCode() {
    if (!emailValid) {
      showError("이메일 형식을 확인하세요.");
      return;
    }
    if (captchaBlocksSubmit) {
      showError("보호 확인을 완료한 뒤 다시 시도하세요.");
      return;
    }
    try {
      setIsSubmitting(true);
      setMessage(null);
      setNeedsVerification(false);
      const result = await signupWithEmail({
        email: normalizedEmail,
        captchaToken: captchaToken || undefined,
      });
      resetCaptcha();
      setEmail(result.email);
      setSignupCodeSent(true);
      setSignupEmailVerified(false);
      setVerificationCode("");
      setVerificationExpiresAt(result.expiresAt);
      setVerificationClock(Date.now());
      setResendSeconds(30);
      showNotice("인증번호를 보냈습니다. 이메일에 있는 6자리 코드를 입력하세요.");
    } catch (error) {
      handleAuthError(error, "인증번호 전송에 실패했습니다.", "send-signup-code");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCompleteSignup() {
    if (!signupEmailVerified) {
      showError("먼저 이메일 인증을 완료하세요.");
      return;
    }
    if (nicknameStatus !== "available") {
      showError(nicknameMessage || "닉네임 중복 확인을 완료하세요.");
      return;
    }
    if (!passwordPolicyValid) {
      showError(passwordValidationMessage || passwordPolicySummary);
      return;
    }
    if (!passwordConfirmationValid) {
      showError(confirmPasswordFeedbackMessage);
      return;
    }
    if (!termsAccepted || !privacyAccepted) {
      showError("서비스 이용 약관과 개인정보 처리 안내에 동의하세요.");
      return;
    }
    if (captchaBlocksSubmit) {
      showError("보호 확인을 완료한 뒤 다시 시도하세요.");
      return;
    }
    try {
      setIsSubmitting(true);
      setMessage(null);
      const user = await completeSignupWithEmail({
        email: normalizedEmail,
        password,
        nickname: normalizedNickname,
        termsAccepted,
        privacyAccepted,
        marketingOptIn,
      });
      resetCaptcha();
      setCurrentUser(user);
      if (requiresAdminMfa(user)) {
        await enterAdminMfaFlow(user, "/home");
        return;
      }
      history.replace("/home");
    } catch (error) {
      handleAuthError(error, "가입 완료 요청에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLoginSubmit() {
    try {
      setIsSubmitting(true);
      setMessage(null);
      setNeedsVerification(false);
      const user = await loginWithEmail({
        email: normalizedEmail,
        password,
        captchaToken: captchaToken || undefined,
      });
      resetCaptcha();
      setCurrentUser(user);
      if (requiresAdminMfa(user)) {
        await enterAdminMfaFlow(user, "/home");
        return;
      }
      history.replace("/home");
    } catch (error) {
      handleAuthError(error, "로그인 요청에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function requiresAdminMfa(user: CurrentUser) {
    return user.roles.includes("ROLE_ADMIN") && user.adminMfaRequired && !user.adminMfaVerified;
  }

  async function enterAdminMfaFlow(user: CurrentUser, returnPath: "/home" | "/admin") {
    setCurrentUser(user);
    setMode("login");
    setMfaReturnPath(returnPath);
    setStep(user.adminMfaEnrolled ? "mfa-verify" : "mfa-setup");
    setTotpCode("");
    setRecoveryCode("");
    setSetupSecret("");
    setSetupUri("");
    setSetupQrDataUrl("");
    setSetupQrError("");
    setShowManualTotpSetup(false);
    setRecoveryCodes([]);
    setNeedsVerification(false);
    resetCaptcha();
    if (user.adminMfaEnrolled) {
      showNotice("관리자 계정은 로그인 직후 MFA 인증이 필요합니다.");
      return;
    }
    showNotice("관리자 계정 보호를 위해 MFA 등록이 필요합니다.");
    await startTotpSetup();
  }

  async function handleVerifyEmailCode() {
    if (verificationExpired) {
      showError("인증번호가 만료되었습니다. 새 코드를 다시 받아주세요.");
      return;
    }
    if (!codeValid) {
      showError("6자리 인증 코드를 입력하세요.");
      return;
    }
    try {
      setIsSubmitting(true);
      const result = await verifyEmailCode({ email: normalizedEmail, code: verificationCode });
      resetCaptcha();
      setEmail(result.email);
      setSignupCodeSent(true);
      setSignupEmailVerified(true);
      setNeedsVerification(false);
      setResendSeconds(0);
      setVerificationExpiresAt(null);
      showNotice("이메일 인증이 완료되었습니다. 이제 닉네임과 비밀번호를 설정하세요.");
    } catch (error) {
      handleAuthError(error, "이메일 코드 인증에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (!emailValid) {
      showError("인증번호를 받을 이메일을 입력하세요.");
      return;
    }
    if (captchaBlocksSubmit) {
      showError("보호 확인을 완료한 뒤 다시 시도하세요.");
      return;
    }
    try {
      setIsResending(true);
      const result = await resendVerificationEmail({
        email: normalizedEmail,
        captchaToken: captchaToken || undefined,
      });
      resetCaptcha();
      setSignupCodeSent(mode === "signup" ? true : signupCodeSent);
      setSignupEmailVerified(false);
      setNeedsVerification(true);
      setVerificationCode("");
      setVerificationExpiresAt(result.expiresAt);
      setVerificationClock(Date.now());
      setResendSeconds(30);
      showNotice("새 인증번호를 보냈습니다. 가장 최근 이메일을 확인하세요.");
    } catch (error) {
      handleAuthError(error, "인증번호 재전송에 실패했습니다.", "resend-verification");
    } finally {
      setIsResending(false);
    }
  }

  async function startTotpSetup() {
    try {
      setIsMfaBusy(true);
      setMessage(null);
      const setup = await setupAdminTotp();
      setSetupSecret(setup.secret);
      setSetupUri(setup.otpauthUri);
      setShowManualTotpSetup(false);
      try {
        const { default: QRCode } = await import("qrcode");
        const qrDataUrl = await QRCode.toDataURL(setup.otpauthUri, {
          errorCorrectionLevel: "M",
          margin: 2,
          scale: 8,
          color: {
            dark: "#05140f",
            light: "#f2fff9",
          },
        });
        setSetupQrDataUrl(qrDataUrl);
        setSetupQrError("");
        showNotice("인증 앱에서 QR 코드를 스캔한 뒤 6자리 코드를 입력하세요.");
      } catch {
        setSetupQrDataUrl("");
        setSetupQrError("QR 코드를 만들 수 없습니다. 수동 입력값으로 등록하세요.");
        setShowManualTotpSetup(true);
        showNotice("QR 코드를 만들 수 없습니다. 수동 입력값으로 등록하세요.");
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : "TOTP 설정을 시작하지 못했습니다.");
    } finally {
      setIsMfaBusy(false);
    }
  }

  async function confirmTotp() {
    try {
      setIsMfaBusy(true);
      const result = await confirmAdminTotp({ code: totpCode });
      setRecoveryCodes(result.recoveryCodes);
      showNotice("관리자 MFA 설정이 완료되었습니다. 복구 코드는 한 번만 보여집니다.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "TOTP 확인에 실패했습니다.");
    } finally {
      setIsMfaBusy(false);
    }
  }

  async function verifyTotp() {
    try {
      setIsMfaBusy(true);
      await verifyAdminTotp({
        code: step === "mfa-verify" ? totpCode : undefined,
        recoveryCode: step === "mfa-recovery" ? recoveryCode : undefined,
      });
      history.replace(mfaReturnPath);
    } catch (error) {
      showError(error instanceof Error ? error.message : "관리자 MFA 인증에 실패했습니다.");
    } finally {
      setIsMfaBusy(false);
    }
  }

  function handleAuthError(error: unknown, fallback: string, pendingAction?: PendingCaptchaAction) {
    if (error instanceof ApiRequestError && error.errorCode === "captcha_required") {
      const hadCaptchaToken = Boolean(captchaToken);
      setCaptchaRequired(true);
      setPendingCaptchaAction(hadCaptchaToken ? null : pendingAction ?? null);
      resetCaptchaWidget();
      showError(turnstileSiteKey
        ? hadCaptchaToken
          ? "보호 확인이 만료되었거나 서버 검증에 실패했습니다. CAPTCHA를 새로 완료한 뒤 다시 시도하세요."
          : "보호 확인이 필요합니다. CAPTCHA를 완료한 뒤 다시 시도하세요."
        : "CAPTCHA가 필요하지만 VITE_TURNSTILE_SITE_KEY가 설정되지 않았습니다.");
      return;
    }
    if (error instanceof ApiRequestError && error.errorCode === "auth_rate_limited") {
      showError("요청이 너무 많습니다. 잠시 후 다시 시도하세요.");
      return;
    }
    if (error instanceof ApiRequestError && error.errorCode === "email_not_verified") {
      setMode("signup");
      setSignupCodeSent(true);
      setSignupEmailVerified(false);
      setNeedsVerification(true);
      showError("이메일 인증이 아직 완료되지 않았습니다. 인증 코드를 입력하거나 새 코드를 받아주세요.");
      return;
    }
    if (error instanceof ApiRequestError && error.errorCode === "account_suspended") {
      showError("정지된 계정입니다. 관리자에게 문의하세요.");
      return;
    }
    if (error instanceof ApiRequestError && error.errorCode === "invalid_verification_code") {
      showError("인증 코드가 올바르지 않거나 만료되었습니다.");
      return;
    }
    if (error instanceof ApiRequestError && error.errorCode === "verification_code_attempts_exceeded") {
      setResendSeconds(0);
      showError("인증 코드를 5회 이상 틀렸습니다. 새 코드를 다시 받아주세요.");
      return;
    }
    if (error instanceof ApiRequestError && error.errorCode === "verification_email_send_failed") {
      showError("인증번호 메일을 보내지 못했습니다. SMTP 설정과 Gmail 발신자 주소를 확인하세요.");
      return;
    }
    if (error instanceof ApiRequestError && error.errorCode === "email_registered_with_google") {
      showError("이미 Google로 가입된 이메일입니다. Google로 계속해 주세요.");
      return;
    }
    if (error instanceof ApiRequestError && error.errorCode === "email_already_registered") {
      showError("이미 등록된 이메일입니다.");
      return;
    }
    if (error instanceof ApiRequestError && error.status === 409) {
      showError("이미 사용 중인 이메일 또는 닉네임입니다.");
      return;
    }
    if (error instanceof TypeError && error.message.toLowerCase().includes("fetch")) {
      showError("인증 서버에 연결하지 못했습니다. 백엔드 실행 상태와 VITE_API_BASE_URL 또는 프록시 설정을 확인하세요.");
      return;
    }
    showError(error instanceof Error ? error.message : fallback);
  }

  function showNotice(text: string) {
    setMessage(text);
    setMessageKind("notice");
  }

  function showError(text: string) {
    setMessage(text);
    setMessageKind("error");
  }

  function handleCaptchaToken(token: string) {
    setCaptchaToken(token);
    if (pendingCaptchaAction) {
      showNotice("보호 확인이 완료되었습니다. 인증번호 전송을 다시 시도합니다.");
    }
  }

  function resetCaptcha() {
    setCaptchaRequired(false);
    setPendingCaptchaAction(null);
    resetCaptchaWidget();
    turnstileWidgetRef.current = null;
  }

  function resetCaptchaWidget() {
    setCaptchaToken("");
    if (turnstileWidgetRef.current && window.turnstile) {
      window.turnstile.reset(turnstileWidgetRef.current);
    }
  }

  function resetAuthEntryState() {
    setMode("login");
    setStep("form");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setNickname("");
    setTermsAccepted(false);
    setPrivacyAccepted(false);
    setMarketingOptIn(false);
    setSignupCodeSent(false);
    setSignupEmailVerified(false);
    setVerificationCode("");
    setResendSeconds(0);
    setVerificationExpiresAt(null);
    setVerificationClock(Date.now());
    setNicknameStatus("idle");
    setNicknameMessage("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setCapsLockOn(false);
    setTotpCode("");
    setRecoveryCode("");
    setSetupSecret("");
    setSetupUri("");
    setSetupQrDataUrl("");
    setSetupQrError("");
    setShowManualTotpSetup(false);
    setRecoveryCodes([]);
    setIsSubmitting(false);
    setIsResending(false);
    setIsMfaBusy(false);
    setMfaReturnPath("/home");
    setNeedsVerification(false);
    setMessage(null);
    setMessageKind("notice");
    setCurrentUser(null);
    resetCaptcha();
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setStep("form");
    setNeedsVerification(false);
    setMessage(null);
    resetCaptcha();
    if (nextMode === "signup") {
      setPassword("");
      setConfirmPassword("");
      setSignupCodeSent(false);
      setSignupEmailVerified(false);
      setVerificationCode("");
      setVerificationExpiresAt(null);
      setResendSeconds(0);
      return;
    }
    setConfirmPassword("");
  }

  function changeEmail() {
    setSignupCodeSent(false);
    setSignupEmailVerified(false);
    setVerificationCode("");
    setVerificationExpiresAt(null);
    setResendSeconds(0);
    setNeedsVerification(false);
    setMessage(null);
    setNickname("");
    setPassword("");
    setConfirmPassword("");
    setTermsAccepted(false);
    setPrivacyAccepted(false);
    setMarketingOptIn(false);
    setNicknameStatus("idle");
    setNicknameMessage("");
    resetCaptcha();
  }

  function updateCapsLock(event: ReactKeyboardEvent<HTMLInputElement>) {
    setCapsLockOn(event.getModifierState("CapsLock"));
  }

  function renderCaptcha() {
    if (!captchaRequired) {
      return null;
    }
    return (
      <div className="auth-captcha">
        {turnstileSiteKey ? <div ref={turnstileRef} /> : <span>Turnstile site key가 필요합니다.</span>}
      </div>
    );
  }

  function renderMessage() {
    if (!message) {
      return null;
    }
    return <p className={messageKind === "error" ? "auth-error" : "auth-notice"}>{message}</p>;
  }

  function renderFieldMessage(text: string, state: ValidationState) {
    return <p className={`auth-field-message is-${state}`}>{text}</p>;
  }

  function renderValidationList(items: ValidationItem[], label: string) {
    return (
      <ul className="auth-validation-list" aria-label={label}>
        {items.map((item) => (
          <li className={`is-${item.state}`} key={item.id}>
            <IonIcon icon={validationIcon(item.state)} />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    );
  }

  function renderPasswordField(
    label: string,
    value: string,
            onChange: (nextValue: string) => void,
    visible: boolean,
    onToggle: () => void,
    autoComplete: string,
    children?: ReactNode,
  ) {
    return (
      <label>
        <span>{label}</span>
        <div className="auth-password-control">
          <input
            autoComplete={autoComplete}
            maxLength={passwordPolicy.maxLength}
            minLength={mode === "signup" ? passwordPolicy.minLength : 1}
            required
            type={visible ? "text" : "password"}
            value={value}
            onBlur={() => setCapsLockOn(false)}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={updateCapsLock}
            onKeyUp={updateCapsLock}
          />
          <button
            aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
            type="button"
            onClick={onToggle}
          >
            <IonIcon icon={visible ? eyeOffOutline : eyeOutline} />
          </button>
        </div>
        {children}
      </label>
    );
  }

  return (
    <IonPage>
      <IonContent fullscreen>
        <main className="auth-shell">
          <section className="auth-panel">
            <Link className="auth-back" to="/home">
              <IonIcon icon={arrowBackOutline} />
              <span>홈으로 돌아가기</span>
            </Link>

            {step === "form" ? (
              <>
                <div className="auth-heading">
                  <strong>US ECON AI</strong>
                  <h1>로그인 / 회원가입</h1>
                  <p>이메일 인증을 완료한 계정만 커뮤니티, Agent, 관리자 기능을 사용할 수 있습니다.</p>
                </div>

                <div className="auth-mode" role="tablist" aria-label="인증 방식">
                  <button
                    className={mode === "login" ? "is-active" : ""}
                    type="button"
                    onClick={() => switchMode("login")}
                  >
                    로그인
                  </button>
                  <button
                    className={mode === "signup" ? "is-active" : ""}
                    type="button"
                    onClick={() => switchMode("signup")}
                  >
                    회원가입
                  </button>
                </div>

                <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
                  <label>
                    <span>이메일</span>
                    <input
                      autoComplete="email"
                      className={signupEmailLocked ? "is-locked" : undefined}
                      disabled={signupEmailLocked}
                      inputMode="email"
                      required
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                    {mode === "signup" && renderValidationList(emailValidationItems, "이메일 검증")}
                  </label>

                  {mode === "signup" && !signupEmailVerified && (
                    <div className="auth-email-actions">
                      <button
                        className="auth-inline-action"
                        disabled={isSubmitting || !emailValid || signupCodeSent || captchaBlocksSubmit}
                        type="button"
                        onClick={() => void handleSendSignupCode()}
                      >
                        <IonIcon icon={mailOutline} />
                        <span>{isSubmitting ? "전송 중..." : signupCodeSent ? "인증번호 전송됨" : "인증번호 전송"}</span>
                      </button>
                    </div>
                  )}

                  {mode === "signup" && signupCodeSent && !signupEmailVerified && (
                    <div className="auth-inline-panel">
                      {verificationExpiresAt && (
                        <p className={verificationExpired ? "auth-help is-warning" : "auth-help"}>
                          {verificationExpired
                            ? "인증번호가 만료되었습니다. 새 코드를 다시 받아주세요."
                            : `인증번호 만료까지 ${verificationRemainingSeconds}초 남았습니다.`}
                        </p>
                      )}
                      <label>
                        <span>인증 코드</span>
                        <input
                          autoComplete="one-time-code"
                          className="auth-code-input"
                          inputMode="numeric"
                          maxLength={6}
                          pattern="[0-9]{6}"
                          required
                          value={verificationCode}
                          onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                        />
                        {renderValidationList(codeValidationItems, "인증 코드 검증")}
                      </label>
                      <div className="auth-action-row">
                        <button
                          className="auth-secondary"
                          disabled={isSubmitting || !codeValid || verificationExpired}
                          type="button"
                          onClick={() => void handleVerifyEmailCode()}
                        >
                          <IonIcon icon={shieldCheckmarkOutline} />
                          <span>{isSubmitting ? "확인 중..." : "코드 인증"}</span>
                        </button>
                        <button
                          className="auth-secondary"
                          disabled={isResending || resendSeconds > 0 || captchaBlocksSubmit}
                          type="button"
                          onClick={() => void handleResend()}
                        >
                          <IonIcon icon={refreshOutline} />
                          <span>
                            {isResending
                              ? "재전송 중..."
                              : resendSeconds > 0
                                ? `${resendSeconds}초 후 재전송`
                                : "코드 재전송"}
                          </span>
                        </button>
                        <button className="auth-secondary" type="button" onClick={changeEmail}>
                          이메일 변경
                        </button>
                      </div>
                    </div>
                  )}

                  {mode === "signup" && signupEmailVerified && (
                    <>
                      <label>
                        <span>닉네임</span>
                        <input
                          autoComplete="nickname"
                          maxLength={20}
                          minLength={2}
                          pattern="[\uAC00-\uD7A3A-Za-z0-9_-]{2,20}"
                          required
                          value={nickname}
                          onChange={(event) => setNickname(event.target.value)}
                        />
                        {renderValidationList(nicknameValidationItems, "닉네임 검증")}
                      </label>

                      {renderPasswordField(
                        "비밀번호",
                        password,
                        setPassword,
                        showPassword,
                        () => setShowPassword((current) => !current),
                        "new-password",
                        renderFieldMessage(passwordFeedbackMessage, passwordFeedbackState),
                      )}

                      {renderPasswordField(
                        "비밀번호 확인",
                        confirmPassword,
                        setConfirmPassword,
                        showConfirmPassword,
                        () => setShowConfirmPassword((current) => !current),
                        "new-password",
                        renderFieldMessage(confirmPasswordFeedbackMessage, confirmPasswordFeedbackState),
                      )}

                      <details className="auth-terms-summary">
                        <summary>약관/개인정보 요약</summary>
                        <p>서비스 운영, 계정 보안, 커뮤니티 관리를 위해 필요한 최소 정보만 사용합니다.</p>
                      </details>

                      <div className="auth-consents">
                        <label>
                          <input
                            checked={termsAccepted}
                            type="checkbox"
                            onChange={(event) => setTermsAccepted(event.target.checked)}
                          />
                          <span>
                            <strong>서비스 이용 약관 동의</strong>
                            <small>계정 생성과 커뮤니티 이용 규칙에 동의합니다.</small>
                          </span>
                        </label>
                        <label>
                          <input
                            checked={privacyAccepted}
                            type="checkbox"
                            onChange={(event) => setPrivacyAccepted(event.target.checked)}
                          />
                          <span>
                            <strong>개인정보 처리 안내 동의</strong>
                            <small>이메일 인증과 계정 관리를 위한 정보 처리에 동의합니다.</small>
                          </span>
                        </label>
                        <label>
                          <input
                            checked={marketingOptIn}
                            type="checkbox"
                            onChange={(event) => setMarketingOptIn(event.target.checked)}
                          />
                          <span>
                            <strong>업데이트/마케팅 수신</strong>
                            <small>새 기능과 운영 소식을 이메일로 받을 수 있습니다.</small>
                          </span>
                        </label>
                      </div>
                    </>
                  )}

                  {mode === "login" && renderPasswordField(
                    "비밀번호",
                    password,
                    setPassword,
                    showPassword,
                    () => setShowPassword((current) => !current),
                    "current-password",
                  )}

                  {capsLockOn && <p className="auth-help is-warning">Caps Lock이 켜져 있습니다.</p>}

                  {renderCaptcha()}
                  {renderMessage()}

                  {needsVerification && mode === "login" && (
                    <button
                      className="auth-secondary"
                      disabled={isResending || captchaBlocksSubmit}
                      type="button"
                      onClick={() => void handleResend()}
                    >
                      <IonIcon icon={mailOutline} />
                      <span>{isResending ? "재전송 중..." : "인증번호 다시 보내기"}</span>
                    </button>
                  )}

                  {(mode === "login" || signupEmailVerified) && (
                    <button
                      className="auth-submit"
                      disabled={
                        isSubmitting ||
                        captchaBlocksSubmit ||
                        (mode === "signup" && !signupDetailsValid)
                      }
                      type="submit"
                    >
                      <IonIcon icon={mode === "signup" ? personAddOutline : logInOutline} />
                      <span>{isSubmitting ? "처리 중..." : mode === "signup" ? "가입 완료" : "이메일 로그인"}</span>
                    </button>
                  )}
                </form>

                <div className="auth-divider" aria-hidden="true">
                  <span />
                  <small>또는</small>
                  <span />
                </div>

                <a className="auth-google" href={getGoogleLoginUrl()}>
                  <IonIcon icon={logoGoogle} />
                  <span>Google로 계속하기</span>
                </a>
              </>
            ) : (
              <section className="auth-mfa">
                <IonIcon icon={shieldCheckmarkOutline} />
                <div className="auth-heading">
                  <strong>{currentUser?.email ?? "관리자 계정"}</strong>
                  <h1>관리자 MFA</h1>
                  <p>관리자 콘솔에 접근하려면 인증 앱의 6자리 코드를 확인해야 합니다.</p>
                </div>

                {renderMessage()}

                {step === "mfa-setup" && (
                  <>
                    {!setupSecret ? (
                      <button className="auth-submit" disabled={isMfaBusy} type="button" onClick={() => void startTotpSetup()}>
                        <IonIcon icon={keyOutline} />
                        <span>{isMfaBusy ? "설정 준비 중..." : "TOTP 설정 시작"}</span>
                      </button>
                    ) : (
                      <>
                        {setupQrDataUrl ? (
                          <div className="auth-mfa-qr">
                            <img alt="TOTP QR code" src={setupQrDataUrl} />
                            <span>Google Authenticator, 1Password, Microsoft Authenticator 같은 인증 앱으로 스캔하세요.</span>
                          </div>
                        ) : (
                          <p className="auth-help is-warning">
                            {setupQrError || "QR 코드를 준비하는 중입니다."}
                          </p>
                        )}
                        <button
                          className="auth-secondary"
                          type="button"
                          onClick={() => setShowManualTotpSetup((current) => !current)}
                        >
                          {showManualTotpSetup ? "수동 입력값 숨기기" : "수동 입력값 보기"}
                        </button>
                        {showManualTotpSetup && (
                          <>
                            <div className="auth-secret">
                              <span>Secret</span>
                              <code>{setupSecret}</code>
                            </div>
                            <div className="auth-secret">
                              <span>URI</span>
                              <code>{setupUri}</code>
                            </div>
                          </>
                        )}
                        <label>
                          <span>6자리 코드</span>
                          <input
                            autoComplete="one-time-code"
                            inputMode="numeric"
                            maxLength={6}
                            value={totpCode}
                            onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                          />
                        </label>
                        <button className="auth-submit" disabled={isMfaBusy || totpCode.length < 6} type="button" onClick={() => void confirmTotp()}>
                          <IonIcon icon={shieldCheckmarkOutline} />
                          <span>{isMfaBusy ? "확인 중..." : "MFA 등록 완료"}</span>
                        </button>
                      </>
                    )}
                  </>
                )}

                {step === "mfa-verify" && (
                  <>
                    <label>
                      <span>6자리 코드</span>
                      <input
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        maxLength={6}
                        value={totpCode}
                        onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      />
                    </label>
                    <button className="auth-submit" disabled={isMfaBusy || totpCode.length < 6} type="button" onClick={() => void verifyTotp()}>
                      <IonIcon icon={shieldCheckmarkOutline} />
                      <span>{isMfaBusy ? "확인 중..." : "관리자 인증"}</span>
                    </button>
                    <button className="auth-secondary" type="button" onClick={() => setStep("mfa-recovery")}>
                      복구 코드 사용
                    </button>
                  </>
                )}

                {step === "mfa-recovery" && (
                  <>
                    <label>
                      <span>복구 코드</span>
                      <input
                        autoComplete="one-time-code"
                        value={recoveryCode}
                        onChange={(event) => setRecoveryCode(event.target.value)}
                      />
                    </label>
                    <button className="auth-submit" disabled={isMfaBusy || recoveryCode.trim().length < 8} type="button" onClick={() => void verifyTotp()}>
                      <IonIcon icon={shieldCheckmarkOutline} />
                      <span>{isMfaBusy ? "확인 중..." : "복구 코드로 인증"}</span>
                    </button>
                    <button className="auth-secondary" type="button" onClick={() => setStep("mfa-verify")}>
                      TOTP 코드 사용
                    </button>
                  </>
                )}

                {recoveryCodes.length > 0 && (
                  <div className="auth-recovery">
                    {recoveryCodes.map((code) => (
                      <code key={code}>{code}</code>
                    ))}
                    <button className="auth-submit" type="button" onClick={() => history.replace(mfaReturnPath)}>
                      관리자 콘솔로 이동
                    </button>
                  </div>
                )}
              </section>
            )}
          </section>
        </main>
      </IonContent>
    </IonPage>
  );
}

function containsContext(normalizedPassword: string, value: string) {
  const normalizedValue = value.trim().toLowerCase();
  if (!normalizedValue) {
    return false;
  }
  if (normalizedValue.length >= 4 && normalizedPassword.includes(normalizedValue)) {
    return true;
  }
  const localPart = normalizedValue.split("@")[0] ?? "";
  return localPart.length >= 4 && normalizedPassword.includes(localPart);
}

function nicknameAvailabilityState(status: NicknameStatus, nickname: string): ValidationState {
  if (!nickname) {
    return "neutral";
  }
  if (status === "checking") {
    return "pending";
  }
  if (status === "available") {
    return "passed";
  }
  if (status === "taken" || status === "invalid" || status === "error") {
    return "failed";
  }
  return "neutral";
}

function validationIcon(state: ValidationState) {
  if (state === "passed") {
    return checkmarkCircleOutline;
  }
  if (state === "pending") {
    return refreshOutline;
  }
  return closeCircleOutline;
}
