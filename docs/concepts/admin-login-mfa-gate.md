# Admin Login MFA Gate

## Where It Appears

- `front/src/features/auth/pages/AuthPage.tsx`
- `backend/src/main/java/com/junglecamp/backend/config/SecurityConfig.java`
- `backend/src/main/java/com/junglecamp/backend/auth/filter/AdminMfaFilter.java`
- `backend/src/main/java/com/junglecamp/backend/auth/controller/AuthController.java`
- `backend/src/main/java/com/junglecamp/backend/auth/service/AdminMfaService.java`
- `front/src/features/auth/api/authApi.ts`

## What Was Applied

- Admin users are routed into MFA immediately after login, instead of waiting until `/admin` is opened.
- Local email login uses the `CurrentUser` response from `/api/auth/login` to decide whether to show TOTP setup or verification.
- Google OAuth and backend form-login success handlers redirect admin users that still need MFA to `/auth?mfa=1`.
- `/api/admin/**` still keeps the server-side MFA filter as a defense-in-depth boundary.
- Pending admin MFA now blocks regular authenticated API access, including `/api/me` and user preference APIs, with `401 admin_mfa_setup_required` or `401 admin_mfa_required`.
- `/api/auth/mfa/session` is the narrow endpoint used by the MFA screen to recover pending admin context after refresh or OAuth redirect.
- `/api/auth/mfa/**` and `/api/logout` remain available while MFA is pending, so admins can finish MFA or abandon the pending session.
- Public home APIs such as `/api/status` and `/api/us-economy/dashboard` remain available with pending admin cookies, so the home page can render public data while treating the admin as not logged in.

## Why It Matters

- Administrator authentication now has the expected two-step shape: password or OAuth first, TOTP second.
- Admins without an enrolled TOTP secret are shown setup immediately, and enrolled admins are asked for a TOTP or recovery code immediately.
- The admin page is no longer the first place where MFA is discovered, but it still blocks access if the login-time check is bypassed or expires.
- Pressing "back home" before completing MFA no longer makes the home app treat the admin as logged in, because normal current-user lookup is blocked until MFA succeeds.
- Blocking applies to account-specific APIs, not public economy dashboard data.

## Verification

- `mvn.cmd -Dtest=ApiIntegrationTests#blocksPendingAdminMfaFromBecomingLoggedInOnRegularApis test`: passed.
- `mvn.cmd -Dtest=ApiIntegrationTests#protectsAdminApisAndAllowsAdminToModerateContentWithAuditLog test`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed, with the existing Vite large chunk warning.

## Pitfalls And Follow-Ups

- The `ADMIN_MFA` cookie has a short TTL, so an already logged-in admin can still be sent back to `/auth?mfa=1` later.
- The TOTP setup screen shows recovery codes once after confirmation; admins should store them before continuing.
- Keep `/api/admin/**` MFA enforcement in place even though login-time MFA is now the primary UX.
- Do not switch MFA recovery screens back to `/api/me`; that endpoint intentionally reports pending admin MFA as unauthenticated to the regular app.
