# Email Verification And Admin Console

## Where It Appears

- `backend/src/main/java/com/junglecamp/backend/auth/`
- `backend/src/main/java/com/junglecamp/backend/admin/`
- `backend/src/main/java/com/junglecamp/backend/auth/controller/AuthController.java`
- `backend/src/main/java/com/junglecamp/backend/admin/controller/AdminController.java`
- `backend/src/main/java/com/junglecamp/backend/config/SecurityConfig.java`
- `backend/src/main/resources/db/migration/V15__add_email_verification_and_admin.sql`
- `backend/src/main/resources/db/migration/V16__add_auth_rate_limit_and_admin_mfa.sql`
- `backend/src/main/resources/db/migration/V17__add_signup_consent_and_email_codes.sql`
- `front/src/features/auth/api/authApi.ts`
- `front/src/features/auth/pages/AuthPage.tsx`
- `front/src/features/admin/`
- `front/src/features/economy/`

## What Was Applied

- Local signup starts with email only. It creates or reuses a pending local user, stores a hashed one-time email verification token, sends an SMTP verification email, and does not issue login cookies.
- Signup and resend responses include the server-calculated email verification `expiresAt` timestamp, so the frontend countdown follows `EMAIL_VERIFICATION_TTL_MINUTES` instead of a hardcoded duration.
- Nickname, password, required terms/privacy consent timestamps, and optional marketing consent are stored only by the final signup-complete request after email verification.
- Signup emails display only the 6-digit verification code plus a no-reply notice. The backend still creates the existing link token for compatibility, but the SMTP body no longer exposes the verification URL.
- The signup UI now uses one screen: email input, send code, code verification, then nickname/password/consent completion.
- A fresh `/auth` navigation without query parameters resets the cached Ionic auth page to the login tab and clears signup/MFA temporary state.
- Field validation is rendered directly under each input instead of in a separate bottom checklist.
- Nickname availability is checked while typing after email verification through a debounced frontend call, but email existence is only exposed by signup submission.
- `GET /api/auth/verify-email?token=...` consumes the token, marks the local user verified, and redirects to `/auth?verified=1`.
- `POST /api/auth/verify-email-code` only accepts the latest active code token, consumes it, marks the local user verified, and returns `{ email, status: "email_verified" }` without issuing auth cookies.
- `POST /api/auth/signup/complete` requires a verified pending local email, stores the final profile credentials, issues auth cookies, and returns `CurrentUser`.
- Local login rejects unverified users with `email_not_verified` and suspended users with `account_suspended`.
- Local signup passwords must now be 12-64 characters, include at least one uppercase letter and one special character, stay within BCrypt's safe encoded length, and avoid common/service/email/nickname-derived terms.
- Signup, login, and verification-email resend use DB-backed rate-limit buckets by IP and email. Repeated signup code sends and resend attempts require CAPTCHA, and excessive login attempts return `429 auth_rate_limited` with `Retry-After`.
- A single request can match both IP and email rate-limit buckets, but the server verifies a Turnstile token only once per request because Turnstile tokens are single-use.
- SMTP delivery requires `SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD`, and a Gmail-compatible `SMTP_FROM`. For Gmail, `SMTP_FROM` should be the authenticated Gmail address or a verified Gmail Send mail as alias, not `no-reply@localhost`.
- CAPTCHA verification is implemented for Cloudflare Turnstile through `CaptchaVerifier`; tests replace it with a fake verifier.
- Local development keeps `AUTH_CAPTCHA_ENABLED=false` unless a matched Cloudflare Turnstile site key and secret key are configured. If the widget shows success but the server still returns `captcha_required`, the browser token was created but backend siteverify rejected it or could not reach Cloudflare.
- Google OAuth users are treated as verified because the provider email is trusted for this app.
- A normalized email can belong to only one signup provider in v1. If a Google email already exists, local signup returns `409 email_registered_with_google`; if a local email exists, first-time Google OAuth creation fails with `local_email_exists`. Automatic account linking is deferred to a separate UX.
- `app_users.roles` carries `ROLE_USER` and optional `ROLE_ADMIN`; JWT cookie auth maps stored roles into Spring Security authorities.
- `ADMIN_BOOTSTRAP_EMAILS` promotes verified matching users to `ROLE_ADMIN` on login, refresh, or request-time user lookup.
- `/api/admin/**` requires `ROLE_ADMIN` and, when admin MFA is enabled, a verified short-lived `ADMIN_MFA` HttpOnly cookie.
- Admin MFA uses encrypted TOTP secrets and one-time hashed recovery codes. Setup and verification live under `/api/auth/mfa/totp/*`.
- The admin MFA setup UI renders the returned `otpauthUri` as a local QR code. Manual secret/URI values are still available behind a fallback toggle.
- Local email login always returns the user to `/home`; admin MFA is requested only when the operator enters the admin console.
- The cached Ionic home view refreshes `/api/me` when it becomes active again, so login/MFA cookie changes are reflected when returning from auth or admin routes.
- The cached Ionic admin view also refreshes `/api/me` and admin data when it becomes active again, so newly issued `ADMIN_MFA` cookies are reflected without a browser refresh.
- Admin actions are recorded in `admin_audit_logs`.
- The admin console exposes user moderation, report/content actions, economy sync status/manual sync, Agent run status, and audit logs.
- Hard delete is intentionally limited to community posts and comments.

## Why It Matters

- Email verification blocks disposable pending accounts from entering authenticated community and Agent areas.
- Code verification keeps the signup flow in the app. The older link endpoint remains available for compatibility with previously sent emails, but new SMTP emails do not show that link.
- Required consent timestamps make signup state auditable without building full legal-document pages in this iteration.
- Rate limiting and conditional CAPTCHA raise the cost of signup spam, login guessing, and SMTP resend abuse without forcing CAPTCHA on every user.
- Twelve-character minimum passwords, one uppercase letter, one special character, and context-aware rejection reduce weak local credentials while keeping the signup rule understandable.
- Roles stay in the database, so OAuth and JWT users share one authorization model.
- Admin-only TOTP adds a second factor for high-impact console actions while keeping normal user login lightweight.
- QR-first TOTP enrollment reduces manual secret-copy errors while keeping a no-network fallback for authenticator apps that cannot scan.
- Keeping login redirect behavior consistent avoids treating admin accounts as a separate login experience; admin-only risk is enforced at the admin console boundary instead.
- Refreshing the home session on view entry prevents cached route state from showing a logged-out header after a successful login or MFA verification.
- Bootstrap admin emails let the first operator get access without a manual database edit after email verification.
- Audit logs make destructive or privilege-changing admin actions reviewable later.
- Restricting hard delete to community content avoids accidental loss of economy cache, Agent history, or user identity records.

## API Contract

- `POST /api/auth/signup`
  - Body: `email`, optional `captchaToken`.
  - Returns `202 Accepted` and `{ "email": "...", "status": "verification_required", "expiresAt": "..." }`.
  - Returns `409 email_already_registered` when the normalized email already belongs to a completed local account.
  - Returns `409 email_registered_with_google` when the normalized email already belongs to a Google OAuth account.
  - Does not set auth cookies.
- `GET /oauth2/authorization/google`
  - Existing Google `sub` users continue normally.
  - First-time Google users are not created when the normalized email already belongs to a local account.
  - On that conflict, Spring Security redirects to `${APP_PUBLIC_BASE_URL}/auth?oauthError=local_email_exists`.
- `GET /api/auth/nickname-availability?nickname=...`
  - Returns `{ nickname, valid, available, message }`.
  - Uses the same 2-20 character Korean/English/number/underscore/hyphen rule as signup.
- `GET /api/auth/verify-email?token=...`
  - Marks the token consumed and redirects to `${APP_PUBLIC_BASE_URL}/auth?verified=1`.
- `POST /api/auth/verify-email-code`
  - Body: `email`, `code`.
  - Accepts a 6-digit code, allows five wrong attempts, then requires a newly resent code.
  - On success, verifies the email and returns `{ "email": "...", "status": "email_verified" }`.
  - Does not set auth cookies.
- `POST /api/auth/signup/complete`
  - Body: `email`, `nickname`, `password`, `termsAccepted`, `privacyAccepted`, `marketingOptIn`.
  - Requires the local email to be verified and still pending.
  - Stores nickname, password hash, and consent state, then writes auth cookies and returns `CurrentUser`.
- `POST /api/auth/resend-verification`
  - Body: `email`, optional `captchaToken`.
  - Returns `202 Accepted` with the same verification-required shape, including a fresh `expiresAt`.
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

- `front/src/features/auth/pages/AuthPage.tsx` renders signup as a single inline flow without a stepper.
- Navigating to `/auth` with no query parameters resets the cached Ionic auth page to the login tab, so returning home and opening login/signup again starts from login.
- The email block calls `signupWithEmail` with `email` and optional CAPTCHA token, then locks the email input while code verification is active.
- The code block displays a live seconds-based countdown from the backend `expiresAt`; the value updates every second and changes to an expired message at zero.
- The email validation list only shows "인증번호 전송됨" after the send request succeeds; before that it stays in a waiting state.
- The code block calls `verifyEmailCode`; success only unlocks the nickname/password/consent area and does not navigate.
- The final submit calls `completeSignupWithEmail`; success stores the returned `CurrentUser` and navigates to `/home`.
- Email, code, and nickname checks render their own `auth-validation-list`; password and password-confirm checks render one-line field messages directly under the relevant input.
- The resend button calls `resendVerificationEmail`, stores the returned fresh `expiresAt`, starts a 30-second client cooldown, and keeps the same conditional CAPTCHA handling used by signup/login.
- If signup code send or resend returns `captcha_required`, the frontend stores that pending action and automatically retries it once after Turnstile returns a token.
- Signup conflict `email_already_registered` shows "이미 등록된 이메일입니다." during the email-code send step.
- Signup conflict `email_registered_with_google` shows "이미 Google로 가입된 이메일입니다. Google로 계속해 주세요."
- OAuth conflict query `oauthError=local_email_exists` shows that a normal email account already exists and account linking will be handled later.
- Email/password login calls `loginWithEmail` and redirects to `/home` for normal and admin users alike.
- `front/src/features/admin/pages/AdminPage.tsx` links admins without a verified MFA cookie to `/auth?mfa=1`; that query makes `AuthPage` fetch the current user and open either TOTP setup or TOTP verification.
- `front/src/features/admin/pages/AdminPage.tsx` also uses `useIonViewWillEnter` to refresh current-user MFA state and admin data whenever the cached admin view becomes active again.
- `front/src/features/economy/pages/HomePage.tsx` uses `useIonViewWillEnter` to refresh the current user and dashboard preferences whenever the cached home view becomes active again.
- Admin TOTP setup calls `setupAdminTotp`, lazy-loads `qrcode`, converts the returned `otpauthUri` to an in-browser QR data URL, then asks for the 6-digit app code. The raw secret and URI are shown only if the operator opens manual setup or QR generation fails.
- Admin console API calls convert network failures, expired login, missing admin MFA, and missing admin role into user-readable Korean messages instead of exposing raw `Failed to fetch`.
- `front/src/features/auth/api/authApi.ts` owns the request/response shapes for signup, signup completion, nickname availability, resend, and code verification.

## Verification

- `mvn.cmd -Dtest=ApiIntegrationTests#signsUpVerifiesEmailCodeThenCompletesWithAuthCookies+signsUpVerifiesEmailThenLogsInRefreshesAndLogsOutWithJwtCookies+rejectsInvalidAndDuplicateJwtSignupRequests+requiresCaptchaAfterRepeatedSignupAttemptsAndAcceptsValidTurnstileToken+requiresSignupTermsAndPrivacyConsent+checksNicknameAvailabilityBeforeSignup+resendsVerificationEmailForPendingLocalUser+rejectsEmailVerificationCodeAfterFiveFailures test`: failed on the old signup contract first, then passed after implementation.
- `mvn.cmd -Dtest=SmtpVerificationEmailSenderTests test`: failed while the SMTP body still contained the link section, then passed after the body was changed to code-only plus no-reply copy.
- `mvn.cmd -Dtest=ApiIntegrationTests#rejectsInvalidAndDuplicateJwtSignupRequests test`: first failed because the active policy accepted a lowercase-only password with a special character, then passed after the 12-character, uppercase, special-character, and UTF-8 byte checks were implemented.
- `mvn.cmd test`: passed with 76 tests after the latest-code and send-attempt CAPTCHA follow-up.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed with the existing Vite large chunk warning.
- `mvn.cmd -Dtest=ApiIntegrationTests#signupResponseIncludesEmailVerificationExpiryFromConfiguredTtl,ApiIntegrationTests#resendsVerificationEmailForPendingLocalUser test`: passed.
- `mvn.cmd -Dtest=ApiIntegrationTests#rejectsStaleAndAlreadyConsumedEmailVerificationCodes+requiresCaptchaAfterRepeatedSignupVerificationSends test`: first failed because already verified pending users could re-submit any code and successful signup sends did not count toward CAPTCHA, then passed after the latest-code and send-attempt rate-limit fixes.
- `mvn.cmd -Dtest=ApiIntegrationTests#requiresCaptchaAfterRepeatedSignupVerificationSends test`: first failed after the fake verifier was changed to consume tokens once, then passed after rate-limit buckets shared one CAPTCHA verification result per request.
- `mvn.cmd -Dtest=ApiIntegrationTests#rateLimitsRepeatedLoginFailuresWithRetryAfter test`: passed after the test stopped reusing a single CAPTCHA token across multiple requests.
- `mvn.cmd test`: passed with 79 tests after the one-time CAPTCHA token handling fix.
- `mvn.cmd "-Dtest=ApiIntegrationTests#rejectsLocalSignupWhenEmailBelongsToGoogleAccount,AppUserServiceTests#rejectsNewGoogleUserWhenEmailBelongsToLocalAccount" test`: first failed because cross-provider email conflicts were allowed, then passed after local signup and first-time Google OAuth creation were blocked.
- `mvn.cmd test`: passed with 81 tests after the cross-provider email conflict policy.
- `npm.cmd run lint`: passed after the OAuth conflict message mapping.
- `npm.cmd run build`: passed with the existing Vite large chunk warning.
- `npm.cmd run lint`: passed after QR-first admin MFA setup.
- `npm.cmd run build`: passed after QR-first admin MFA setup with the existing Vite large chunk warning.
- Targeted PowerShell source assertion for `handleLoginSubmit`: failed before the fix because login branched into admin MFA, then passed after login consistently redirected to `/home`.
- Targeted PowerShell source assertions for `/auth?mfa=1`: passed after the admin MFA link and AuthPage MFA entry path were added.
- `npm.cmd run lint`: passed after admin login redirect and MFA entry routing changes.
- `npm.cmd run build`: passed after admin login redirect and MFA entry routing changes with the existing Vite large chunk warning.
- Targeted PowerShell source assertion for `HomePage`: failed before the fix because the cached Ionic home view did not refresh current-user state on view entry, then passed after `useIonViewWillEnter` was added.
- `npm.cmd run lint`: passed after home session refresh on view entry.
- `npm.cmd run build`: passed after home session refresh on view entry with the existing Vite large chunk warning.
- Targeted PowerShell source assertion for `AdminPage`: failed before the fix because the cached Ionic admin view did not refresh MFA/admin state on view entry, then passed after `useIonViewWillEnter` was added.
- `npm.cmd run lint`: passed after admin MFA/admin state refresh on view entry.
- `npm.cmd run build`: passed after admin MFA/admin state refresh on view entry with the existing Vite large chunk warning.

## Pitfalls And Follow-Ups

- SMTP must be configured in `.env.local`; otherwise signup can create a pending account but returns `verification_email_send_failed`.
- In production, set `APP_PUBLIC_BASE_URL` to the frontend origin that can route `/api/auth/verify-email` to the backend, or use a backend public URL if there is no frontend proxy.
- Verification code failure counts are intentionally committed even when the request returns an auth error; do not remove the `noRollbackFor` behavior from code verification.
- Signup and resend both consume the currently active verification token for that user before creating a fresh token; code verification still checks only the latest active token so old codes and already consumed codes cannot verify the account.
- `ADMIN_BOOTSTRAP_EMAILS` only grants admin after the email is verified.
- Set `TURNSTILE_SECRET_KEY` and `VITE_TURNSTILE_SITE_KEY` together before enabling CAPTCHA in production.
- If a CAPTCHA token is submitted and the backend still returns `captcha_required`, reset the widget so the UI does not keep showing a stale success state.
- Set a stable high-entropy `APP_DATA_ENCRYPTION_KEY`; changing it after TOTP enrollment prevents existing encrypted admin secrets from being decrypted.
- Store admin recovery codes immediately after setup. They are returned once and are hashed in the database.
- Generate the TOTP QR code in the browser from the backend `otpauthUri`; do not use an external QR image API because that would leak the MFA secret outside the app.
- Admin Agent retry is recorded as a retry request in v1; a full replay queue can be added later.
- Admin hard delete does not apply to users, economy cache, Agent logs, or audit logs.
