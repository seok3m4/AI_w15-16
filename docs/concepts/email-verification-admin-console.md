# Email Verification And Admin Console

## Where It Appears

- `backend/src/main/java/com/junglecamp/backend/auth/`
- `backend/src/main/java/com/junglecamp/backend/admin/`
- `backend/src/main/java/com/junglecamp/backend/controller/AuthController.java`
- `backend/src/main/java/com/junglecamp/backend/controller/AdminController.java`
- `backend/src/main/java/com/junglecamp/backend/config/SecurityConfig.java`
- `backend/src/main/resources/db/migration/V15__add_email_verification_and_admin.sql`
- `backend/src/main/resources/db/migration/V16__add_auth_rate_limit_and_admin_mfa.sql`
- `backend/src/main/resources/db/migration/V17__add_signup_consent_and_email_codes.sql`
- `front/src/api/backend.ts`
- `front/src/api/admin.ts`
- `front/src/pages/AuthPage.tsx`
- `front/src/pages/AdminPage.tsx`
- `front/src/pages/HomePage.tsx`

## What Was Applied

- Local signup now creates a pending user, stores a hashed one-time email verification token, sends an SMTP verification email, and does not issue login cookies.
- Local signup also stores required terms/privacy consent timestamps and optional marketing consent.
- Signup emails include both the existing link token and a 6-digit verification code. The code is stored only as a hash and shares the verification token TTL.
- The signup UI now uses a staged flow: account details, email code verification, then completion with authenticated cookies.
- Nickname availability is checked while typing through a debounced frontend call, but email existence is only exposed on final signup submission.
- `GET /api/auth/verify-email?token=...` consumes the token, marks the local user verified, and redirects to `/auth?verified=1`.
- `POST /api/auth/verify-email-code` consumes the latest active code token, marks the local user verified, issues auth cookies, and returns `CurrentUser`.
- Local login rejects unverified users with `email_not_verified` and suspended users with `account_suspended`.
- Local signup passwords must now be 15-64 characters, stay within BCrypt's safe encoded length, and avoid common/service/email/nickname-derived terms.
- Signup, login, and verification-email resend use DB-backed rate-limit buckets by IP and email. Repeated attempts require CAPTCHA, and excessive login attempts return `429 auth_rate_limited` with `Retry-After`.
- CAPTCHA verification is implemented for Cloudflare Turnstile through `CaptchaVerifier`; tests replace it with a fake verifier.
- Google OAuth users are treated as verified because the provider email is trusted for this app.
- `app_users.roles` carries `ROLE_USER` and optional `ROLE_ADMIN`; JWT cookie auth maps stored roles into Spring Security authorities.
- `ADMIN_BOOTSTRAP_EMAILS` promotes verified matching users to `ROLE_ADMIN` on login, refresh, or request-time user lookup.
- `/api/admin/**` requires `ROLE_ADMIN` and, when admin MFA is enabled, a verified short-lived `ADMIN_MFA` HttpOnly cookie.
- Admin MFA uses encrypted TOTP secrets and one-time hashed recovery codes. Setup and verification live under `/api/auth/mfa/totp/*`.
- Admin actions are recorded in `admin_audit_logs`.
- The admin console exposes user moderation, report/content actions, economy sync status/manual sync, Agent run status, and audit logs.
- Hard delete is intentionally limited to community posts and comments.

## Why It Matters

- Email verification blocks disposable pending accounts from entering authenticated community and Agent areas.
- Code verification keeps the signup flow in the app, while the older link endpoint preserves compatibility with previously sent emails.
- Required consent timestamps make signup state auditable without building full legal-document pages in this iteration.
- Rate limiting and conditional CAPTCHA raise the cost of signup spam, login guessing, and SMTP resend abuse without forcing CAPTCHA on every user.
- Longer passphrases and context-aware password rejection reduce weak local credentials without relying on brittle symbol rules.
- Roles stay in the database, so OAuth and JWT users share one authorization model.
- Admin-only TOTP adds a second factor for high-impact console actions while keeping normal user login lightweight.
- Bootstrap admin emails let the first operator get access without a manual database edit after email verification.
- Audit logs make destructive or privilege-changing admin actions reviewable later.
- Restricting hard delete to community content avoids accidental loss of economy cache, Agent history, or user identity records.

## API Contract

- `POST /api/auth/signup`
  - Body: `email`, `password`, `nickname`, `termsAccepted`, `privacyAccepted`, `marketingOptIn`, optional `captchaToken`.
  - Returns `202 Accepted` and `{ "email": "...", "status": "verification_required" }`.
  - Does not set auth cookies.
- `GET /api/auth/nickname-availability?nickname=...`
  - Returns `{ nickname, valid, available, message }`.
  - Uses the same 2-20 character Korean/English/number/underscore/hyphen rule as signup.
- `GET /api/auth/verify-email?token=...`
  - Marks the token consumed and redirects to `${APP_PUBLIC_BASE_URL}/auth?verified=1`.
- `POST /api/auth/verify-email-code`
  - Body: `email`, `code`.
  - Accepts a 6-digit code, allows five wrong attempts, then requires a newly resent code.
  - On success, verifies the email, writes auth cookies, and returns `CurrentUser`.
- `POST /api/auth/resend-verification`
  - Body: `email`, optional `captchaToken`.
  - Returns `202 Accepted` with the same verification-required shape.
- `POST /api/auth/login`
  - Body: `email`, `password`, optional `captchaToken`.
  - Returns `403` with `email_not_verified`, `account_suspended`, or `captcha_required` when blocked.
  - Returns `429 auth_rate_limited` and `Retry-After` when attempts exceed the hard limit.
- `GET /api/me`
  - Adds `roles`, `emailVerified`, `suspended`, `adminMfaRequired`, `adminMfaVerified`, and `adminMfaEnrolled`.
- `POST /api/auth/mfa/totp/setup`
  - Requires authenticated `ROLE_ADMIN`.
  - Returns `secret` and `otpauthUri`.
- `POST /api/auth/mfa/totp/confirm`
  - Body: `code`.
  - Confirms setup, writes `ADMIN_MFA`, and returns one-time recovery codes.
- `POST /api/auth/mfa/totp/verify`
  - Body: `code` or `recoveryCode`.
  - Writes `ADMIN_MFA` when verification succeeds.
- `/api/admin/**`
  - Requires `ROLE_ADMIN`.
  - Returns `403 admin_mfa_setup_required` or `403 admin_mfa_required` until admin MFA is satisfied.
  - Mutating requests still require the existing `X-XSRF-TOKEN` header when using JWT cookies.

## Frontend Call Path

- `front/src/pages/AuthPage.tsx` renders the signup stepper and calls `checkNicknameAvailability` after a 500 ms nickname debounce.
- The account step calls `signupWithEmail` with password, nickname, consent booleans, and optional CAPTCHA token.
- The email-code step calls `verifyEmailCode`; success stores the returned `CurrentUser` in local component state and shows the `/home` navigation button.
- The resend button calls `resendVerificationEmail`, starts a 30-second client cooldown, and keeps the same conditional CAPTCHA handling used by signup/login.
- `front/src/api/backend.ts` owns the request/response shapes for signup, nickname availability, resend, and code verification.

## Verification

- `mvn.cmd -Dtest=ApiIntegrationTests#checksNicknameAvailabilityBeforeSignup,ApiIntegrationTests#requiresSignupTermsAndPrivacyConsent,ApiIntegrationTests#signsUpAndVerifiesEmailCodeWithAuthCookies,ApiIntegrationTests#rejectsEmailVerificationCodeAfterFiveFailures test`: failed before implementation, then passed after implementation.
- `mvn.cmd -Dtest=ApiIntegrationTests#rejectsInvalidAndDuplicateJwtSignupRequests+requiresCaptchaAfterRepeatedSignupAttemptsAndAcceptsValidTurnstileToken+rateLimitsRepeatedLoginFailuresWithRetryAfter+protectsAdminApisAndAllowsAdminToModerateContentWithAuditLog test`: passed.
- `mvn.cmd test`: passed with 72 tests.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed with the existing Vite large chunk warning.

## Pitfalls And Follow-Ups

- SMTP must be configured in `.env.local`; otherwise signup can create a pending account but returns `verification_email_send_failed`.
- In production, set `APP_PUBLIC_BASE_URL` to the frontend origin that can route `/api/auth/verify-email` to the backend, or use a backend public URL if there is no frontend proxy.
- Verification code failure counts are intentionally committed even when the request returns an auth error; do not remove the `noRollbackFor` behavior from code verification.
- Resending consumes the currently active verification token for that user so old codes and links cannot stay valid alongside a fresh code.
- `ADMIN_BOOTSTRAP_EMAILS` only grants admin after the email is verified.
- Set `TURNSTILE_SECRET_KEY` and `VITE_TURNSTILE_SITE_KEY` together before enabling CAPTCHA in production.
- Set a stable high-entropy `APP_DATA_ENCRYPTION_KEY`; changing it after TOTP enrollment prevents existing encrypted admin secrets from being decrypted.
- Store admin recovery codes immediately after setup. They are returned once and are hashed in the database.
- Admin Agent retry is recorded as a retry request in v1; a full replay queue can be added later.
- Admin hard delete does not apply to users, economy cache, Agent logs, or audit logs.
