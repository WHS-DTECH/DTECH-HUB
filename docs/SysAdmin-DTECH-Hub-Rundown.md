# DTECH Hub: SysAdmin Technical Rundown

Date: June 2026
Audience: Westland High School System Administration

## 1) What This Website Is
DTECH Hub is a web application used in DTECH classes for project/activity access, uploads, assessment resources, and teacher/admin workflows.

## 2) How Google Sign-In Is Set Up
- Frontend uses Google Identity Services OAuth token flow.
- User signs in with Google and the app fetches profile details from the Google userinfo API.
- The app stores signed-in profile context in browser local storage (`hub_google_auth_v1`).
- Browser requests include `x-user-email` for API access checks.
- Backend enforces school-domain and role-based checks for protected operations.

Current security note:
- Server-side Google ID token verification support is activated in backend middleware (staged rollout mode).
- Current backend policy is hybrid:
	- Verified bearer ID token is accepted and preferred when present.
	- Legacy `x-user-email` fallback remains temporarily available for compatibility.
	- If an invalid bearer token is presented, request is rejected (no legacy fallback for that request).
- A hardening plan is provided in `docs/Google-Identity-Hardening-Plan.md` for full strict enforcement cutover.

Current rollout mode:
- `AUTH_MODE=hybrid` is currently enabled in production.
- Google token audience configuration is active (`google_id_token_audiences_configured > 0`).
- `AUTH_MODE=strict` can be enabled once remaining protected frontend calls all send bearer ID tokens.

Migration status (June 2026):
- Bearer token headers added to high-risk frontend flows:
	- Upload flows (Activity, Assessment, Project)
	- Admin maintenance + Assessment Standards management
	- Teacher allocation flows (Project + Assessment)
- Bearer token headers now also added to lower-risk teacher/upload flows:
	- Upload Course Outline, Upload Unit Plan, Upload Lesson
	- Teacher View authenticated API calls
- Final frontend sweep completed for additional authenticated views:
	- Homepage assignment/assessment card lookups
	- Activity detail interest + Trello actions
	- User Profile Trello API helper
	- Class Management, Browse Unit Plans, Browse Practicals
	- Assessment Standard Card, Admin recipe image manager
- Header fallback (`x-user-email`) remains in place for hybrid compatibility, but bearer token support is now wired across identified protected frontend routes.

Live verification status:
- Health endpoint confirms hybrid mode and audience configuration.
- Invalid bearer token test returns `401` with token verification failure.
- Header-only compatibility path still functions in hybrid mode.

Strict cutover checklist (go/no-go):
1. Confirm env is ready:
	- `AUTH_MODE=hybrid`
	- `GOOGLE_ID_TOKEN_AUDIENCES` set to production OAuth client ID(s)
	- `/api/health` reports `ok: true`, `auth_mode: "hybrid"`, and `google_id_token_audiences_configured > 0`
2. Smoke-test key authenticated flows while signed in:
	- Upload Activity/Assessment/Project
	- Teacher allocations (project + assessment)
	- Activity detail interest actions (student + teacher)
	- Class Management / Browse Unit Plans / Browse Practicals
	- Admin pages using protected APIs
3. Validate bearer enforcement behavior in hybrid:
	- Request with invalid bearer token must fail with `401 token_verification_failed`
	- Request without bearer but with legacy header still succeeds (temporary hybrid fallback)
4. Switch to strict:
	- Set `AUTH_MODE=strict` and deploy
5. Immediate post-switch checks:
	- Re-run smoke tests in step 2
	- Watch logs for `missing_bearer_token` or `token_verification_failed` spikes
6. Rollback path (if needed):
	- Revert to `AUTH_MODE=hybrid`
	- Deploy
	- Triage affected frontend route and patch missing bearer header support

## 3) What It Was Built With
- Backend: Node.js + Express
- Frontend: Vanilla HTML, CSS, JavaScript
- File/process helpers: multer, mammoth, pdf-parse (optional), nodemailer
- Database client: pg

## 4) Tech Stack Summary
- Runtime: Node.js
- Web framework: Express
- Database: PostgreSQL
- Hosting/Deploy: Render web service (`render.yaml`)

## 5) Database Used
- PostgreSQL (configured through `DATABASE_URL`).
- If `DATABASE_URL` is missing, some memory-backed fallback behavior exists for selected features.

## 6) HTTPS Responsibility
- HTTPS/TLS termination is currently handled by Render-managed certificates.
- The app itself runs as a standard Node web service behind Render's HTTPS edge.

## 7) Internal-Network vs Internet Requirements
Minimum external internet needed:
- Google sign-in endpoints (Google Identity Services)
- Google userinfo API
- Hosted DTECH Hub URL (if hosted on Render)

Optional external internet (feature-dependent):
- NZQA standards lookups
- Trello API integration
- External staff directory API (if configured)

Conclusion:
- DTECH Hub can be used by internal users, but it is not fully internet-isolated if Google sign-in remains enabled.
- If true internal-only operation is required, an alternate authentication model and disabled external integrations would be needed.

## 8) Intune Auto-Launch Direction (Confirmed)
- Device profile: shared multi-user Windows 11 desktops.
- Preferred assignment model: user-based groups.
- Preferred user experience: Edge app-mode launch of DTECH Hub at sign-in.
- Guardrail: use one primary launch method per target to avoid duplicate windows.
