# Local API CORS

## Where It Appears

- `backend/src/main/java/com/junglecamp/backend/config/SecurityConfig.java`
- `backend/src/main/resources/application.properties`
- `backend/src/test/java/com/junglecamp/backend/ApiIntegrationTests.java`

## What Was Applied

- CORS is enabled on the `/api/**` Spring Security chain before authentication handles requests.
- Allowed origins are configured by `app.cors.allowed-origins`.
- The local default allows `http://localhost:5173` and `http://127.0.0.1:5173`.
- Credentials are enabled so JWT cookies and `X-XSRF-TOKEN` can travel with frontend API calls.

## Why It Matters

- Vite proxy calls work without CORS, but a browser request to `http://localhost:8080` or `http://127.0.0.1:8080` is cross-origin from the frontend.
- Without CORS, the backend can be running and still appear as `Failed to fetch` in the browser.
- Preflight requests must succeed before admin APIs can be called from a non-proxied frontend origin.

## Verification

- `mvn.cmd '-Dtest=ApiIntegrationTests#allowsFrontendCorsPreflightForApiRequests' test`: passed.

## Pitfalls And Follow-Ups

- Do not use wildcard origins with credentials.
- Update `APP_CORS_ALLOWED_ORIGINS` when the frontend domain, host, or preview port changes.
- Keep local browser host consistent: `localhost` cookies and `127.0.0.1` cookies are different browser origins.
