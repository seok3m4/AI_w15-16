import {
  jsonHeaders,
  requestError,
  type CurrentUser,
} from "../../../api/backend";

export { ApiRequestError } from "../../../api/backend";
export type { CurrentUser } from "../../../api/backend";

export interface SignupResponse {
  email: string;
  status: "verification_required";
  expiresAt: string;
}

export interface EmailVerificationResponse {
  email: string;
  status: "email_verified";
}

export interface NicknameAvailabilityResponse {
  nickname: string;
  valid: boolean;
  available: boolean;
  message: "nickname_format_invalid" | "nickname_taken" | "nickname_available";
}

export interface TotpSetupResponse {
  secret: string;
  otpauthUri: string;
}

export interface TotpVerifyResponse {
  adminMfaRequired: boolean;
  adminMfaVerified: boolean;
  adminMfaEnrolled: boolean;
  recoveryCodes: string[];
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";
const backendOrigin =
  import.meta.env.VITE_BACKEND_ORIGIN ?? "http://localhost:8080";

export function getBackendLoginUrl() {
  return `${backendOrigin}/login`;
}

export function getGoogleLoginUrl() {
  return `${backendOrigin}/oauth2/authorization/google`;
}

export async function signupWithEmail(request: {
  email: string;
  captchaToken?: string;
}): Promise<SignupResponse> {
  const response = await fetch(`${apiBaseUrl}/api/auth/signup`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw await requestError(response, `Signup request failed: ${response.status}`);
  }

  return response.json() as Promise<SignupResponse>;
}

export async function completeSignupWithEmail(request: {
  email: string;
  password: string;
  nickname: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingOptIn: boolean;
}): Promise<CurrentUser> {
  const response = await fetch(`${apiBaseUrl}/api/auth/signup/complete`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw await requestError(response, `Signup request failed: ${response.status}`);
  }

  return response.json() as Promise<CurrentUser>;
}

export async function checkNicknameAvailability(
  nickname: string,
  signal?: AbortSignal,
): Promise<NicknameAvailabilityResponse> {
  const params = new URLSearchParams({ nickname });
  const response = await fetch(`${apiBaseUrl}/api/auth/nickname-availability?${params}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw await requestError(response, `Nickname availability request failed: ${response.status}`);
  }

  return response.json() as Promise<NicknameAvailabilityResponse>;
}

export async function loginWithEmail(request: {
  email: string;
  password: string;
  captchaToken?: string;
}): Promise<CurrentUser> {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw await requestError(response, `Login request failed: ${response.status}`);
  }

  return response.json() as Promise<CurrentUser>;
}

export async function fetchAdminMfaSession(): Promise<CurrentUser> {
  const response = await fetch(`${apiBaseUrl}/api/auth/mfa/session`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw await requestError(response, `Admin MFA session request failed: ${response.status}`);
  }

  return response.json() as Promise<CurrentUser>;
}

export async function resendVerificationEmail(request: {
  email: string;
  captchaToken?: string;
}): Promise<SignupResponse> {
  const response = await fetch(`${apiBaseUrl}/api/auth/resend-verification`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw await requestError(response, `Verification resend failed: ${response.status}`);
  }

  return response.json() as Promise<SignupResponse>;
}

export async function verifyEmailCode(request: {
  email: string;
  code: string;
}): Promise<EmailVerificationResponse> {
  const response = await fetch(`${apiBaseUrl}/api/auth/verify-email-code`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw await requestError(response, `Email code verification failed: ${response.status}`);
  }

  return response.json() as Promise<EmailVerificationResponse>;
}

export async function setupAdminTotp(): Promise<TotpSetupResponse> {
  const response = await fetch(`${apiBaseUrl}/api/auth/mfa/totp/setup`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
  });

  if (!response.ok) {
    throw await requestError(response, `TOTP setup failed: ${response.status}`);
  }

  return response.json() as Promise<TotpSetupResponse>;
}

export async function confirmAdminTotp(request: {
  code: string;
}): Promise<TotpVerifyResponse> {
  const response = await fetch(`${apiBaseUrl}/api/auth/mfa/totp/confirm`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw await requestError(response, `TOTP confirmation failed: ${response.status}`);
  }

  return response.json() as Promise<TotpVerifyResponse>;
}

export async function verifyAdminTotp(request: {
  code?: string;
  recoveryCode?: string;
}): Promise<TotpVerifyResponse> {
  const response = await fetch(`${apiBaseUrl}/api/auth/mfa/totp/verify`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw await requestError(response, `TOTP verification failed: ${response.status}`);
  }

  return response.json() as Promise<TotpVerifyResponse>;
}
