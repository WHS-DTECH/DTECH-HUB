# DTECH Hub Security Hardening Plan
## Server-Side Google Identity Validation (ID Token Verification)

Date: June 2026
Goal: Reduce header spoofing risk by replacing trust in `x-user-email` with server-verified identity.

## Activation Status (Current)
- Server-side Google ID token verification has been activated in backend middleware.
- Auth mode support is active via `AUTH_MODE=legacy|hybrid|strict`.
- Current recommended mode for rollout is `hybrid` while frontend token transport is completed.
- In `hybrid` mode:
  - Verified bearer ID token is preferred and used when present.
  - Legacy email header fallback remains temporarily available when no bearer token is supplied.
  - If a bearer token is supplied but fails verification, fallback is blocked for that request.
- In `strict` mode:
  - Protected routes require verified bearer ID tokens.
  - Legacy header-only identity is rejected.

## Problem Statement
Current API authorization patterns often use client-supplied `x-user-email` as user identity context. Any client that can send custom headers can potentially spoof identity unless server-side identity verification is enforced.

## Target Security Model
- Browser obtains Google ID token for the signed-in user.
- Browser sends bearer token in `Authorization: Bearer <id_token>`.
- Backend verifies token signature and claims against Google public keys and expected audience.
- Backend derives authenticated user email from verified token claims (not from request headers).
- Role checks and permission checks use verified identity only.

## Implementation Phases

### Phase 1: Add Verified Identity Middleware
1. Add a new auth middleware in backend (example file: `auth/googleIdentity.js`).
2. Middleware behavior:
   - Read `Authorization` bearer token.
   - Verify token using Google libraries (`google-auth-library`) or OIDC JWKS verification.
   - Validate required claims:
     - `aud` matches configured Google client ID(s).
     - `iss` is Google trusted issuer.
     - `exp` not expired.
     - `email_verified` is true.
     - `hd` (if used) matches school domain policy.
   - Attach normalized identity to request (`req.user = { email, sub, name, hd, roles? }`).
3. Reject invalid/missing tokens with `401`.

### Phase 2: Migrate API Routes
1. For write/admin routes, require verified middleware.
2. Replace all `req.headers["x-user-email"]` identity reads with `req.user.email`.
3. Keep temporary compatibility mode only for low-risk read routes if needed.
4. Add feature flag for staged enforcement:
   - `AUTH_MODE=legacy|hybrid|strict`

### Phase 3: Frontend Token Transport Update
1. Update frontend auth state to carry ID token (short-lived).
2. Add `Authorization` header to API calls.
3. Remove dependence on email header for identity.
4. Keep local profile cache only for UI display, not authorization.

### Phase 4: Tighten Role Resolution
1. Resolve roles server-side from trusted data source (DB tables).
2. Bind role lookups to `req.user.email`.
3. Ensure admin-only routes reject unverified or domain-mismatched identities.

### Phase 5: Decommission Legacy Header Trust
1. Remove acceptance of `x-user-email` as identity source.
2. Keep `x-user-email` optional for logging only (if desired), never auth.
3. Add regression tests to block reintroduction.

## Recommended Technical Controls
- Use `google-auth-library` in backend for token verification.
- Cache Google cert keys according to library behavior/JWKS TTL.
- Add request audit logging fields:
  - `auth_mode`, `token_issuer`, `token_aud`, `user_email`, `route`, `decision`.
- Apply stricter CORS and security headers where relevant.
- Add basic rate limits on auth-sensitive endpoints.

## Threats Mitigated
- Header spoofing (`x-user-email` forgery).
- Cross-user data mutation attempts using crafted requests.
- Unauthorized role elevation by forged identity fields.

## Residual Risks
- Stolen valid tokens on compromised endpoints/devices.
- Shared desktop session leakage if browser/profile sign-out practices are weak.

Mitigations:
- Short token lifetimes.
- Classroom sign-out policy and automatic browser profile/session cleanup on logout.
- Optional conditional access controls (device compliance and sign-in risk policies).

## Rollout Plan (Practical)
1. Week 1: Implement middleware + hybrid mode + logging.
2. Week 2: Migrate admin/write routes and pilot with staff.
3. Week 3: Migrate remaining protected routes + run regression tests.
4. Week 4: Switch to strict mode and remove legacy header trust.

## Configuration Checklist
- Set `AUTH_MODE=hybrid` for initial deployment.
- Ensure at least one Google audience is configured:
  - `HUB_GOOGLE_CLIENT_ID` and/or
  - `GOOGLE_OAUTH_CLIENT_ID` and/or
  - `GOOGLE_ID_TOKEN_AUDIENCES` (comma-separated override list)
- Verify server health endpoint returns auth diagnostics:
  - `GET /api/health` should report `auth_mode` and `google_id_token_audiences_configured`.
- After frontend bearer rollout and pilot validation, set `AUTH_MODE=strict`.

## Acceptance Criteria
- 100% of protected routes derive identity from verified token claims.
- 0 protected routes authorize using `x-user-email` alone.
- Failed/forged token requests consistently return `401/403`.
- Regression tests cover spoof attempts and permission boundaries.
