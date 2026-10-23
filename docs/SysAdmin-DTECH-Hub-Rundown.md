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

### My Class description tracker (October 2026)
- The [Student Work Tracker](../teacher-student-work.html) has **My Students** and **My Class** tabs. Existing embedded assessment trackers keep their previous view without tabs.
- My Class uses the current DTECH class-management roster, including students with no recorded assessment activity. Years 7-8 / 9-10 / 11-13 select JuniorDTECH / MiddleDTECH / SeniorDTECH. Description checks are configured for MiddleDTECH only.
- **Refresh whole MiddleDTECH class** reads, but never edits, linked Digital Outcome Description slides. It can also find descriptions in students' recorded MDTECH Project folders when no link was recorded.
- First-slide writing means added words relative to the **current** library template, excluding formatting, prompt order and deletions. It is not proof of a login, authorship, completion or quality. Older template versions may need manual checking.
- Google Drive comments are paginated and matched to the signed-in teacher, including their replies in other people's threads and resolved threads. Deleted comments are omitted. Expand a thread to read the comments and reply context.
- Teacher-only endpoints: `GET /api/student-tracker/my-class` and `POST /api/student-tracker/my-class/check` (up to five roster IDs per request). Refresh verifies that the Google Drive token belongs to the signed-in teacher. Existing Google Drive consent is reused.
- `student_class_description_checks` is created on first use. It stores each teacher's latest per-student JSON result and checked time, including comment text, scoped by `(teacher_email, student_key)`. OAuth access tokens are not stored in these results. The database is required; save failures are reported, not replaced with a memory-only success.
- Saved results are snapshots, not a background sync. Reload shows saved checks; refresh after students edit slides or teachers add comments. API/access failures show **Unable to check**, never a negative writing/comment result. **No linked description** is not proof that no file exists.
- Implementation: [server integration](../student-class-tracker.js), [tab UI](../teacher-my-class.js), [styles](../teacher-my-class.css). Run `node scripts/regression-my-class.js` and `node scripts/regression-middle-task-list.js` for focused regression checks.

### MDTECH Task List presentation
- The MiddleDTECH Digital Outcome Topic hides the separate success-measurement and tools-identification prompts. Digital Media shows the appropriate-tools criterion and its subtasks above the existing efficient-tools criterion and subtasks.
- This is a display-only change: saved checklist rows and evidence remain intact, and rendered checkboxes retain their original storage indexes. SeniorDTECH criteria are unchanged. Covered by `node scripts/regression-middle-task-list.js`.

### Kit Content Builder sign-in readiness

- Uploaded kits have an admin-only Delete Kit button with confirmation. Removal archives the saved kit with a deletion timestamp and removes its library card; kit content and student progress are retained. Built-in kits cannot be deleted, and stale editors cannot republish deleted kits.
- My Licence uses a compact, clickable stamp/kit grid as its primary launch area. Stats, badges and the detailed kit collection remain available in the collapsed "My achievements, stats & kit details" section. The Typing log stays separate from earned stamps.
- The current six launch cards were checked at a 1366 x 650 browser viewport (100% zoom), including space for a 96px navigation bar. Larger future collections and expanded details can scroll normally; content is never clipped to force a fixed-height screen.

- Activity Details supports an optional activity-specific challenge, tasks (one per line, automatically numbered), key skill and evidence instructions. Students see these in a task panel above images/questions; a task-only activity does not display the empty-questions message. These fields do not add file upload or automatic evidence checking, and do not change completion rules.
- A read-only Live Preview below Activity Details uses the student worksheet renderer and updates after edits or question/image additions and removals. Previewing does not save content or student progress.
- `node --test scripts/regression-activity-task-brief.js` covers editor save/reload, task numbering, preserved activity details and escaped student output.

### Activity Content Block Builder

- Activity Details includes an ordered block builder: Text / Instructions, Image, Task List, Question (written, choice or checklist), Website Link, Resource File, Checkbox, Table (static or student-filled), Word Search, Crossword and Create Document. Blocks can repeat, move or be removed; the read-only preview follows the same order.
- Ordinary legacy questions/images migrate to blocks when saved. Stable legacy answer keys are retained. Existing specialised assessments retain their question controls, marking and completion rules; extra blocks do not override those rules.
- Completion is chosen per activity: **Student marks complete**, or **Automatic tick**. Automatic mode requires at least one required interactive block. Written answers are checked only for presence, choices for a selected option, checklists for all boxes, editable tables for all cells, and puzzles for correct solutions. Links, resources, images, tasks and instructions are not assessed.
- Block answers autosave. Automatic ticks are checked on the server and removed when required answers become incomplete. Students can also choose **Check & Save Activity**; the manual completion endpoint cannot bypass automatic checks.
- Resource File supports an HTTPS link or an admin upload (maximum 15 MB; PDF, Office, text/CSV and standard image extensions). Uploads use the teacher's verified Google Drive account, in **DTECH Kit Resources**, with school-domain reader sharing. Sharing failures are shown explicitly. Upload only resources the teacher is permitted to share; Save Activity Details after uploading.
- Create Document requires a Google Docs template shared with students. It creates/reopens a separate copy in the signed-in student's **WHS-DTECH > course > KITS** folder. Receipts and per-document locks reuse copies; resetting progress does not delete documents. A required document block confirms that a copy was created, **not** that the work inside it is complete.
- Word searches/crosswords use 1–15 unique answers of 2–15 letters (A–Z). Crossword lines use `ANSWER | Clue`. Words run across/down; generated crosswords share letters where possible. Puzzle answers and grid coordinates persist with other block responses.
- Validation: `node --test scripts/regression-activity-blocks.js scripts/regression-activity-task-brief.js scripts/regression-kit-certificate.js`.

- Saving an active custom kit also makes it available on My Licence in both the stamp collection and Your Kit Collection, including existing custom kits. Name, icon and subtitle come from saved kit content. Completed activities earn the kit's stamp and certificate through the existing completion flow.
- Planning/archived custom kits are excluded from these collections; their saved progress remains available. Active custom kits increase the stamp total but do not alter the original three-kit points, tiers or badge rules. Typing remains a separate practice log, not a stamp.
- Licence coverage: `node --test scripts/regression-licence-custom-kits.js scripts/regression-licence-dashboard.js scripts/regression-kit-certificate.js scripts/regression-kit-builder-new-kit.js`.

- Editor buttons and the blank draft initialise before the asynchronous Google sign-in check. Adding worksheets works while sign-in is pending; saving rechecks admin access and shows errors beside the Save button as well as at the top.
- The builder retries access checks on `hub-auth-state-changed` without resetting a new kit's draft or registering duplicate click handlers. Existing-kit content is loaded after access is confirmed.
- Run `node --test scripts/regression-kit-builder-auth.js scripts/regression-kit-builder-new-kit.js scripts/regression-kit-builder-year-level.js scripts/regression-kit-worksheet-removal.js`.

### Typing Kit difficulty launch buttons

- Daily records display the latest saved attempt in a three-circle scorecard: gross typing speed, accuracy and net speed. Values come directly from the saved attempt, not a recalculation or a personal-best comparison. A highlighted exercise-book panel provides the week/period and scores to copy, followed by a physical teacher-signature reminder. Attempt history and saving behaviour are unchanged.
- All three Typing Kit API endpoints (read log, save attempt, update calendar) require a server-verified Google identity, even while the rest of the application remains in hybrid mode. Either the middleware-verified ID token or an OAuth access token validated via Google's token-info and userinfo endpoints is accepted. OAuth validation checks this app's configured audience, token expiry and a Google-verified school email; it does not trust email headers. The frontend sends its ID token or existing access token. Missing, invalid or expired tokens return HTTP 401.
- The Typing Kit displays the existing Google Identity Services verification widget until a log loads successfully. This provides an ID-token sign-in path for older OAuth/Drive-only sessions; the normal top-bar button may grant Drive access without an ID token.
- Daily records offer three one-click, new-tab links: Easy (green), Medium (blue), Hard (purple), each fixed at one minute. The links use TypingTest.com's own `/test.php` parameters: `minutes=1`, `textfile=easyText.txt` / `mediumText.txt` / `difficultText.txt`, `mode=sent`, `result_url=/result.php`.
- Return prompts, result-link saving, attempt history and exercise-book sign-off are unchanged. Difficulty is a launch choice; this change does not add a verified difficulty field to saved scores.
- Run `node scripts/regression-typing-kit.js` to check launch parameters, all three return prompts, text contrast and existing record-saving behaviour.

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
