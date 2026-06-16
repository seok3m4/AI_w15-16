# Google OAuth Dashboard Preferences

## Where It Appears

- `backend/pom.xml`
- `backend/src/main/java/com/junglecamp/backend/config/SecurityConfig.java`
- `backend/src/main/java/com/junglecamp/backend/controller/ApiController.java`
- `backend/src/main/java/com/junglecamp/backend/controller/DashboardPreferenceController.java`
- `backend/src/main/java/com/junglecamp/backend/user/`
- `backend/src/main/resources/db/migration/V3__create_users_and_dashboard_preferences.sql`
- `backend/src/main/resources/application.properties`
- `backend/src/test/java/com/junglecamp/backend/ApiIntegrationTests.java`
- `backend/src/test/java/com/junglecamp/backend/user/AppUserServiceTests.java`
- `front/src/api/backend.ts`
- `front/src/app/App.tsx`
- `front/src/features/economy/pages/HomePage.tsx`
- `front/src/features/economy/pages/HomePage.css`
- `front/src/features/profile/pages/MyPage.tsx`
- `front/src/features/profile/pages/MyPage.css`

## What Was Applied

- Google OAuth2 login is exposed at `/oauth2/authorization/google`.
- After a successful web login, Spring Security redirects to `${FRONTEND_BOARD_URL:http://localhost:5173/home}`.
- Google user profile data is upserted into `app_users` by provider and provider user id.
- Login-time profile persistence and request-time user lookup are intentionally separated:
  `PersistingOAuth2UserService` refreshes the Google profile during OAuth login, while
  `AppUserService.currentUser()` first reads an existing user and only creates one when
  it is missing. This keeps authenticated GET requests safe inside read-only
  transactions.
- `/api/me` now returns `username`, `email`, `displayName`, `avatarUrl`, and `provider`.
- Dashboard preferences are stored per user in `user_dashboard_preferences`.
- The preference API stores only display choices. Economic data still comes from `/api/us-economy/dashboard`.
- The frontend keeps `/home` public, adds `/mypage`, and filters home sections/items using saved preferences when a user is logged in.
- `visibleSections` is a required non-empty list for saved preferences. The frontend keeps at least one section selected, and the backend rejects an empty list with `400 Bad Request`.
- Home renders and exposes preference-aware sections only when `preferences.visibleSections.includes(...)` allows them. Hidden economic events, reports, and watchlist sections are also removed from the Home navigation.
- React logout uses `POST /api/logout`, which invalidates the Spring Security session and returns `204 No Content` for API-style handling.
- `NEWS_SEARCH_API_KEY` is not part of this flow.

## Why It Matters

- Anonymous users can still read the public economic dashboard.
- Logged-in users can personalize the dashboard without changing the shared economy data cache.
- OAuth profile storage gives the project a real user identity boundary without building a separate signup form.
- Keeping preferences as ID lists makes the feature small and resilient when the dashboard data changes.

## API Contract

- `GET /api/me`
  - Authenticated only.
  - Returns `username`, `email`, `displayName`, `avatarUrl`, and `provider`.
- `GET /api/users/me/dashboard-preferences`
  - Authenticated only.
  - Returns default preferences if the user has not saved preferences yet.
- `PUT /api/users/me/dashboard-preferences`
  - Authenticated only.
  - Request and response body:

```json
{
  "coreMetricIds": ["cpi", "unemployment"],
  "watchMetricIds": ["usd-krw"],
  "eventIds": ["cpi-release"],
  "reportIds": ["cpi-fred"],
  "visibleSections": ["core-metrics", "watchlist"]
}
```

- Allowed `visibleSections`: `core-metrics`, `economic-events`, `reports`, `watchlist`.
- Unknown section keys return `400 Bad Request`.
- Empty `visibleSections` returns `400 Bad Request`; defaults are returned only when a user has no saved preference record yet.
- Anonymous preference requests return `401 Unauthorized`.
- `POST /api/logout`
  - Authenticated API logout.
  - Returns `204 No Content`.
  - Invalidates the current server session and lets the React app clear local user/preference state.
- `GET /api/us-economy/dashboard` remains public.

## Frontend Call Path

- `front/src/api/backend.ts`
  - `getGoogleLoginUrl()`
  - `fetchCurrentUser()`
  - `logoutCurrentUser()`
  - `fetchDashboardPreferences()`
  - `saveDashboardPreferences()`
- `front/src/features/economy/pages/HomePage.tsx`
  - Fetches economy dashboard and current user.
  - Fetches preferences only when a user is logged in.
  - Filters core metrics, economic events, reports, and watchlist IDs on the client.
  - Uses `visibleSections` to conditionally render the core metrics, economic events, reports, and watchlist areas.
  - Removes hidden section workspaces from the Home navigation and sends direct hidden-section access back to Home with a personalization message.
  - Shows Google login when anonymous and a profile button when authenticated.
  - Shows a logout button when authenticated, then clears user and preference state after `POST /api/logout`.
- `front/src/features/profile/pages/MyPage.tsx`
  - Requires login.
  - Loads current dashboard items and saved preferences.
  - Saves section visibility and item selections through the preference API.
  - Disables the last checked visible-section checkbox so the saved configuration cannot become empty.

## Run Commands

- Backend tests: `cd backend; mvn test`
- Frontend lint: `cd front; npm.cmd run lint`
- Frontend build: `cd front; npm.cmd run build`
- Google OAuth local setup:
  - Set `GOOGLE_CLIENT_ID`.
  - Set `GOOGLE_CLIENT_SECRET`.
  - Configure the Google redirect URI as `http://localhost:8080/login/oauth2/code/google`.
  - Start backend and frontend, then open `http://localhost:5173/home`.

## Verification

- `mvn -Dtest=LoginSecurityTests#logsOutApiSessionWithNoContentResponse test`: passed.
- `mvn test`: passed with 28 tests, 0 failures, 0 errors, 0 skipped.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed; Vite reported the existing large chunk warning.
- `Invoke-WebRequest http://localhost:8080/api/us-economy/dashboard`: returned `200 OK`.
- `Invoke-WebRequest http://127.0.0.1:5173/home`: returned `200 OK`.
- `Invoke-WebRequest http://localhost:8080/api/me`: returned `401 Unauthorized` for anonymous access.
- `Invoke-WebRequest http://localhost:8080/api/users/me/dashboard-preferences`: returned `401 Unauthorized` for anonymous access.
- `mvn.cmd "-Dtest=com.junglecamp.backend.user.AppUserServiceTests#currentUserReadsExistingGoogleUserWithoutRefreshingProfile" test`: passed.
- `mvn.cmd test`: passed with 50 tests, 0 failures, 0 errors, 0 skipped.

## Pitfalls And Follow-Ups

- The test-only local `user/password` login remains so existing security tests and local fallback keep working.
- Real Google login needs valid `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; placeholder defaults only keep the app bootable.
- Do not call profile upsert from read-only service methods such as board feed,
  notifications, preference reads, or Agent catalog reads. PostgreSQL enforces
  read-only transactions and will reject UPDATE statements from those paths.
- Preferences intentionally do not validate every metric/event/report id because the economy dataset changes over time.
- If an item id no longer exists in `/api/us-economy/dashboard`, the frontend silently excludes it.
- Alerts, news search, report subscriptions, and interest-indicator notifications remain follow-up scope.
