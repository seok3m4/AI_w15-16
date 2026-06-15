import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
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
  confirmAdminTotp,
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
type SignupStep = "details" | "email-code" | "complete";
type MessageKind = "notice" | "error";
type NicknameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "error";

interface PasswordRule {
  id: string;
  label: string;
  passed: boolean;
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

export default function AuthPage() {
  const history = useHistory();
  const location = useLocation();
  const verified = useMemo(
    () => new URLSearchParams(location.search).get("verified") === "1",
    [location.search],
  );

  const [mode, setMode] = useState<AuthMode>("login");
  const [step, setStep] = useState<AuthStep>("form");
  const [signupStep, setSignupStep] = useState<SignupStep>("details");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [nicknameStatus, setNicknameStatus] = useState<NicknameStatus>("idle");
  const [nicknameMessage, setNicknameMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [setupSecret, setSetupSecret] = useState("");
  const [setupUri, setSetupUri] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isMfaBusy, setIsMfaBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(
    verified ? "이메일 인증이 완료되었습니다. 이제 로그인할 수 있습니다." : null,
  );
  const [messageKind, setMessageKind] = useState<MessageKind>("notice");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetRef = useRef<string | null>(null);

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedNickname = nickname.trim();
  const emailValid = emailPattern.test(normalizedEmail);
  const captchaBlocksSubmit = captchaRequired && turnstileSiteKey && !captchaToken;

  const passwordRules = useMemo<PasswordRule[]>(() => {
    const normalizedPassword = password.toLowerCase();
    return [
      {
        id: "length",
        label: "15~64자",
        passed: password.length >= 15 && password.length <= 64,
      },
      {
        id: "email",
        label: "이메일 포함 금지",
        passed: !containsContext(normalizedPassword, normalizedEmail),
      },
      {
        id: "nickname",
        label: "닉네임 포함 금지",
        passed: !containsContext(normalizedPassword, normalizedNickname),
      },
      {
        id: "common",
        label: "흔한 단어/서비스명 금지",
        passed: !blockedPasswordTerms.some((term) => normalizedPassword.includes(term)),
      },
      {
        id: "match",
        label: "비밀번호 확인 일치",
        passed: confirmPassword.length > 0 && password === confirmPassword,
      },
    ];
  }, [confirmPassword, normalizedEmail, normalizedNickname, password]);

  const passwordValid = passwordRules.every((rule) => rule.passed);
  const signupDetailsValid =
    emailValid &&
    nicknameStatus === "available" &&
    passwordValid &&
    termsAccepted &&
    privacyAccepted &&
    !captchaBlocksSubmit;

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
        callback: setCaptchaToken,
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
    if (mode !== "signup" || signupStep !== "details") {
      return;
    }
    if (!normalizedNickname) {
      setNicknameStatus("idle");
      setNicknameMessage("");
      return;
    }
    if (!nicknamePattern.test(normalizedNickname)) {
      setNicknameStatus("invalid");
      setNicknameMessage("닉네임은 2~20자, 한글/영문/숫자/_/-만 사용할 수 있습니다.");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setNicknameStatus("checking");
      setNicknameMessage("닉네임 확인 중입니다.");
      void checkNicknameAvailability(normalizedNickname, controller.signal)
        .then((result) => {
          if (!result.valid) {
            setNicknameStatus("invalid");
            setNicknameMessage("닉네임 형식을 확인해주세요.");
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
  }, [mode, normalizedNickname, signupStep]);

  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "signup") {
      await handleSignupDetailsSubmit();
      return;
    }
    await handleLoginSubmit();
  }

  async function handleSignupDetailsSubmit() {
    if (!signupDetailsValid) {
      showError("입력값과 필수 동의를 확인해주세요.");
      return;
    }
    try {
      setIsSubmitting(true);
      setMessage(null);
      setNeedsVerification(false);
      const result = await signupWithEmail({
        email: normalizedEmail,
        password,
        nickname: normalizedNickname,
        captchaToken: captchaToken || undefined,
        termsAccepted,
        privacyAccepted,
        marketingOptIn,
      });
      resetCaptcha();
      setEmail(result.email);
      setVerificationCode("");
      setNeedsVerification(true);
      setSignupStep("email-code");
      setResendSeconds(30);
      showNotice("인증 메일을 보냈습니다. 메일에 있는 6자리 코드를 입력해주세요.");
    } catch (error) {
      handleAuthError(error, "회원가입 요청에 실패했습니다.");
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
      if (user.adminMfaRequired && !user.adminMfaVerified) {
        setStep(user.adminMfaEnrolled ? "mfa-verify" : "mfa-setup");
        showNotice(user.adminMfaEnrolled
          ? "관리자 계정은 TOTP 인증이 필요합니다."
          : "관리자 계정 보호를 위해 TOTP 등록이 필요합니다.");
        return;
      }
      history.replace("/home");
    } catch (error) {
      handleAuthError(error, "로그인 요청에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyEmailCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (verificationCode.length !== 6) {
      showError("6자리 인증 코드를 입력해주세요.");
      return;
    }
    try {
      setIsSubmitting(true);
      const user = await verifyEmailCode({ email: normalizedEmail, code: verificationCode });
      resetCaptcha();
      setCurrentUser(user);
      setNeedsVerification(false);
      setSignupStep("complete");
      showNotice("이메일 인증과 가입이 완료되었습니다.");
    } catch (error) {
      handleAuthError(error, "이메일 코드 인증에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (!normalizedEmail) {
      showError("인증 메일을 받을 이메일을 입력해주세요.");
      return;
    }
    try {
      setIsResending(true);
      await resendVerificationEmail({
        email: normalizedEmail,
        captchaToken: captchaToken || undefined,
      });
      resetCaptcha();
      setNeedsVerification(true);
      setResendSeconds(30);
      showNotice("새 인증 코드를 보냈습니다. 가장 최근 메일을 확인해주세요.");
    } catch (error) {
      handleAuthError(error, "인증 메일 재발송에 실패했습니다.");
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
      showNotice("TOTP 앱에 아래 값을 등록한 뒤 6자리 코드를 입력해주세요.");
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
      history.replace("/admin");
    } catch (error) {
      showError(error instanceof Error ? error.message : "관리자 MFA 인증에 실패했습니다.");
    } finally {
      setIsMfaBusy(false);
    }
  }

  function handleAuthError(error: unknown, fallback: string) {
    if (error instanceof ApiRequestError && error.errorCode === "captcha_required") {
      setCaptchaRequired(true);
      setCaptchaToken("");
      showError(turnstileSiteKey
        ? "보호 확인이 필요합니다. CAPTCHA를 완료한 뒤 다시 시도해주세요."
        : "CAPTCHA가 필요하지만 VITE_TURNSTILE_SITE_KEY가 설정되지 않았습니다.");
      return;
    }
    if (error instanceof ApiRequestError && error.errorCode === "auth_rate_limited") {
      showError("요청이 너무 많습니다. 잠시 뒤 다시 시도해주세요.");
      return;
    }
    if (error instanceof ApiRequestError && error.errorCode === "email_not_verified") {
      setMode("signup");
      setSignupStep("email-code");
      setNeedsVerification(true);
      showError("이메일 인증이 아직 완료되지 않았습니다. 인증 코드를 입력하거나 새 코드를 받아주세요.");
      return;
    }
    if (error instanceof ApiRequestError && error.errorCode === "account_suspended") {
      showError("정지된 계정입니다. 관리자에게 문의해주세요.");
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
    if (error instanceof ApiRequestError && error.status === 409) {
      showError("이미 사용 중인 이메일 또는 닉네임입니다.");
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

  function resetCaptcha() {
    setCaptchaRequired(false);
    setCaptchaToken("");
    if (turnstileWidgetRef.current && window.turnstile) {
      window.turnstile.reset(turnstileWidgetRef.current);
    }
    turnstileWidgetRef.current = null;
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setStep("form");
    setNeedsVerification(false);
    setMessage(null);
    if (nextMode === "signup") {
      setSignupStep("details");
    }
  }

  function changeEmail() {
    setSignupStep("details");
    setVerificationCode("");
    setNeedsVerification(false);
    setMessage(null);
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

  function renderPasswordField(
    label: string,
    value: string,
    onChange: (nextValue: string) => void,
    visible: boolean,
    onToggle: () => void,
    autoComplete: string,
  ) {
    return (
      <label>
        <span>{label}</span>
        <div className="auth-password-control">
          <input
            autoComplete={autoComplete}
            maxLength={64}
            minLength={mode === "signup" ? 15 : 1}
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
                  <p>이메일 인증이 완료된 계정만 커뮤니티, Agent, 관리자 기능을 사용할 수 있습니다.</p>
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

                {mode === "signup" && (
                  <ol className="auth-stepper" aria-label="회원가입 단계">
                    <li className={signupStep === "details" ? "is-current" : "is-done"}>
                      <span>1</span>
                      계정 정보
                    </li>
                    <li className={signupStep === "email-code" ? "is-current" : signupStep === "complete" ? "is-done" : ""}>
                      <span>2</span>
                      이메일 인증
                    </li>
                    <li className={signupStep === "complete" ? "is-current" : ""}>
                      <span>3</span>
                      완료
                    </li>
                  </ol>
                )}

                {mode === "signup" && signupStep === "email-code" ? (
                  <section className="auth-code-section">
                    <div className="auth-code-heading">
                      <IonIcon icon={mailOutline} />
                      <div>
                        <h2>이메일 코드 인증</h2>
                        <p>{normalizedEmail}로 보낸 6자리 코드를 입력해주세요.</p>
                      </div>
                    </div>
                    <form className="auth-form" onSubmit={(event) => void handleVerifyEmailCode(event)}>
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
                      </label>

                      {renderCaptcha()}
                      {renderMessage()}

                      <button
                        className="auth-submit"
                        disabled={isSubmitting || verificationCode.length !== 6}
                        type="submit"
                      >
                        <IonIcon icon={shieldCheckmarkOutline} />
                        <span>{isSubmitting ? "확인 중..." : "인증하고 가입 완료"}</span>
                      </button>
                      <div className="auth-action-row">
                        <button
                          className="auth-secondary"
                          disabled={isResending || resendSeconds > 0 || captchaBlocksSubmit}
                          type="button"
                          onClick={() => void handleResend()}
                        >
                          <IonIcon icon={refreshOutline} />
                          <span>
                            {isResending
                              ? "재발송 중..."
                              : resendSeconds > 0
                                ? `${resendSeconds}초 후 재발송`
                                : "코드 재발송"}
                          </span>
                        </button>
                        <button className="auth-secondary" type="button" onClick={changeEmail}>
                          이메일 변경
                        </button>
                      </div>
                    </form>
                  </section>
                ) : mode === "signup" && signupStep === "complete" ? (
                  <section className="auth-complete">
                    <IonIcon icon={checkmarkCircleOutline} />
                    <h2>가입 완료</h2>
                    <p>{currentUser?.displayNickname ?? normalizedNickname}님, 이메일 인증이 완료되었습니다.</p>
                    {renderMessage()}
                    <Link className="auth-submit" to="/home">
                      홈으로 이동
                    </Link>
                  </section>
                ) : (
                  <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
                    <label>
                      <span>이메일</span>
                      <input
                        autoComplete="email"
                        inputMode="email"
                        required
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </label>

                    {mode === "signup" && (
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
                        {nicknameMessage && (
                          <small className={`auth-field-state is-${nicknameStatus}`}>
                            {nicknameMessage}
                          </small>
                        )}
                      </label>
                    )}

                    {renderPasswordField(
                      "비밀번호",
                      password,
                      setPassword,
                      showPassword,
                      () => setShowPassword((current) => !current),
                      mode === "signup" ? "new-password" : "current-password",
                    )}

                    {mode === "signup" && renderPasswordField(
                      "비밀번호 확인",
                      confirmPassword,
                      setConfirmPassword,
                      showConfirmPassword,
                      () => setShowConfirmPassword((current) => !current),
                      "new-password",
                    )}

                    {capsLockOn && <p className="auth-help is-warning">Caps Lock이 켜져 있습니다.</p>}

                    {mode === "signup" && (
                      <>
                        <ul className="auth-checklist" aria-label="비밀번호 조건">
                          {passwordRules.map((rule) => (
                            <li className={rule.passed ? "is-passed" : ""} key={rule.id}>
                              <IonIcon icon={rule.passed ? checkmarkCircleOutline : closeCircleOutline} />
                              <span>{rule.label}</span>
                            </li>
                          ))}
                        </ul>

                        <details className="auth-terms-summary">
                          <summary>약관/개인정보 요약</summary>
                          <p>서비스 운영, 계정 보안, 커뮤니티 관리에 필요한 최소 정보만 사용합니다.</p>
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
                        <span>{isResending ? "재발송 중..." : "인증 메일 다시 보내기"}</span>
                      </button>
                    )}

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
                      <span>{isSubmitting ? "처리 중..." : mode === "signup" ? "인증 메일 보내기" : "이메일 로그인"}</span>
                    </button>
                  </form>
                )}

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
                        <div className="auth-secret">
                          <span>Secret</span>
                          <code>{setupSecret}</code>
                        </div>
                        <div className="auth-secret">
                          <span>URI</span>
                          <code>{setupUri}</code>
                        </div>
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
                    <button className="auth-submit" type="button" onClick={() => history.replace("/admin")}>
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
