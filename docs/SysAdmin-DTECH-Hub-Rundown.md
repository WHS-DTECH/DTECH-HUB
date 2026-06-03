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
- Identity context currently relies on client-supplied email header patterns in many routes.
- Server-side Google ID token verification support is now activated in backend middleware (staged rollout mode).
- A hardening plan is provided in `docs/Google-Identity-Hardening-Plan.md` for full strict enforcement cutover.

Current rollout mode:
- `AUTH_MODE=hybrid` is recommended during migration.
- `AUTH_MODE=strict` can be enabled once all protected frontend calls send bearer ID tokens.

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
