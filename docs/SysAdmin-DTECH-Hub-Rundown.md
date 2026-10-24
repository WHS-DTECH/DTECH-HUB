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
- `DATABASE_URL` is mandatory: startup fails explicitly if it is absent or blank. The running application cannot enter the legacy in-memory mode. Database/schema initialization must succeed before the HTTP listener starts; database errors are not retried through temporary storage.
- `/health` reports `hasDatabase`; the live service was checked on 24 October 2026 and returned `true`. This is a configuration indicator, not a backup guarantee or a continuous connectivity check.
- Kit/activity content is saved in `practical_skills_kit_content`, student answers/completions in `practical_skills_progress`, the published library in `practical_skills_library_store`, and document-copy receipts in `student_kit_documents`. Binary resource files and actual Google Docs remain in Google Drive; their URLs/receipts belong in PostgreSQL.
- Kit registry queries refresh from PostgreSQL on later requests (concurrent callers share an in-flight load). Kit APIs/library responses are not cached, and Practical Skills static assets must revalidate so older Licence renderers cannot indefinitely hide custom cards or show obsolete totals.
- This change does not move every other subsystem's filesystem assets into PostgreSQL, nor recover records previously lost from a no-database deployment.

### Read-only kit results review
- Typing now uses the same database publication table and teacher Licence-card Live/Not Live pill as other kits. It remains Live by default until explicitly paused and remains a practice log, excluded from stamp totals and certificates. Not Live hides Typing from student Licence/library listings and blocks all Typing API reads and writes for students, including direct daily-record URLs. Teachers may view their own saved log read-only while paused; result submission and calendar changes are blocked even for teachers. Republishing restores access without deleting attempts or calendar settings.
- Teachers can click **Preview Not Live kit** on a Licence card to open `kit-worksheet.html?kit=KIT_ID&preview=1`. Activity links and the back-to-kit link retain preview mode. The server checks kit-management permission for explicit previews, including Live kits. Student access to Not Live content remains blocked.
- Preview is read-only: it fetches content without loading or creating progress, hides completion/certificates and disables answer checks and Drive/file creation. The shared sidebar also skips its progress-loading request. It does not publish the kit or simulate grading; use the separate **Edit kit** link to change content.
- Minecraft now has a separate database-saved **Google Drive Setup** activity using the Activity Content Block Builder. Short action headings, text and seven privacy-redacted screenshots cover school sign-in, Add folder, selecting Videos, checking the selection, Open Drive and finding Videos on the web. Screens that only say Next are omitted. The kit introduction is short; setup is not repeated there.
- The setup worksheet is appended at its own stable activity index and marked `startHere: true`. The overview displays start-here worksheets first without reindexing original activities or their saved answers/ticks. It now ends with File Explorer > right-click Videos > Open with Google Drive, then Share > Copy link. Students paste the Videos folder link into a required Student Add a Link block and choose Check & Save Activity. Automatic completion uses the existing HTTPS-link check only; it does not verify folder identity, sharing permissions, sync or folder contents. Do not instruct students to make their entire Videos folder public.
- The former Show your teacher, Something looks different? and At the end of each lesson blocks were removed from this setup activity. Two cropped screenshots illustrate the Explorer menu and Drive's Computers > PC > Videos location, without displaying personal files or account details.
- Videos is the local working folder for Minecraft, synced through Drive for Desktop after setup. Students use `Videos\Minecraft`, finish/close work and verify sync before Windows sign-out. Minecraft world autosave does not export a `.mcworld` backup. The web Hub cannot configure or verify Desktop sync, inspect local folders or certify that uploads finished.
- The Minecraft overview no longer shows the redundant **Keep a copy of your Minecraft evidence** panel or its Create/Open folder button. Google Drive Setup is the first activity and collects the Videos folder share link. Existing Drive folders and exports are not deleted; the legacy folder API is unchanged. Minecraft remains Not Live until explicitly published by the teacher.
- **Network Heroes - Export & Submit** replaces My First Build at activity index 0 without shifting existing activity IDs. Its database-saved content blocks use cropped launch/export screenshots and the specific Cyber Fundamentals 1 lesson link. Students play briefly, Save & Exit, choose My Worlds > their world > Manage > Export, save the `.mcworld` in `Videos\Minecraft`, wait for Drive sync and submit the exported file's Google Drive share link. Finishing the world, screenshots of gameplay and a reflection document are not required. Students share the file with their teacher, not publicly.
- Google Drive Setup collects a **folder** link; Network Heroes collects the exported **file** link. Both use required Student Add a Link blocks and automatic completion's existing HTTPS URL-presence check. A saved tick is not verification of the file, teacher access, sync, or Cyber lesson completion. Teacher review remains necessary to verify the actual submission. The remaining building activities and publication setting are unchanged.
- **The Interceptors - Download & Import** replaces The Block Challenge at stable index 1. Students use the official Cyber Fundamentals 2 lesson's **Download world** link, move the downloaded `.mcworld` from Downloads to `Videos\Minecraft`, and use Minecraft **Play > Import** to select that file. After import, they find **Cyber FUNdamentals 2** in My Worlds and choose Play. Import creates an in-app world; it does not keep that played world automatically updated in the downloaded `.mcworld` file. Students do not need to finish the lesson.
- Import activity evidence is a screenshot of The Interceptors in **My Worlds**, saved as an image in `Videos\Minecraft`. Students wait for Drive sync, share that screenshot file with their teacher and submit its file link in the required Student Add a Link block. URL validation does not inspect the screenshot or prove importing; the teacher reviews the image. Six cropped screenshots illustrate the significant actions without exposing the teacher's account or profile path.
- Google token expiry no longer erases a remembered account during navigation, and failed Google/Drive refreshes retain the current session instead of clearing it. Remembered profile data is not a verified token: expired JWTs are never extended, and API permissions remain server-enforced. Interactive Google verification/Drive consent may still be needed.
- ID-token expiry is read independently of the OAuth Drive lifetime. Same-account ID verification preserves an unexpired Drive grant; changing OAuth accounts clears the old ID token. Kit and Activity editors use the shared expiry-aware bearer selector. Refreshing the same account does not remount the kit draft.
- The teacher Licence dashboard lists all non-deleted database kits, including planning/Not Live kits, and has a confirmed Live/Not Live pill on each certificate kit. Typing remains a separate practice log.
- Publication is stored separately in `practical_skills_kit_publication`, so saving an old builder draft cannot remove the switch setting. Newly created kits start Not Live; existing active kits retain Live until explicitly changed. Planning/archived kits default Not Live.
- Not Live hides the kit from student Licence/library listings and blocks direct content access, answers, document creation, completion and certificate endpoints. Teachers may preview content; student completion/certificate actions remain blocked even for teacher accounts. Turning Live on is an explicit publication action, not a validation of activity quality.
- Registry loading uses explicit API path prefixes and is also awaited by the builder catalog and Licence snapshot. Teacher listings derive from saved kit rows, not a browser-side three-kit list or a prior visit to the library.
- Admin-only `POST /api/admin/kit-results/:kitId/reset` accepts `emails` (1-20 school addresses). It atomically clears activity ticks, completion and certificate eligibility, retaining answers, Drive files and email history. Original progress and the resetting teacher are audited in `practical_skills_kit_resets`; certificate email locks coordinate concurrent sends. Previously delivered/downloaded PDFs cannot be recalled.
- Open **Review student kit results (read-only)** from the Kit Content Builder. Admin sign-in is required; enter a kit ID and up to 20 school email addresses identified in the email log.
- The report shows saved completion/timestamps, original answer keys/values, current activity definitions and document-copy receipts. Current definitions are not historical versions, and stored ticks or certificates do not establish that practical evidence exists or meets the tasks.
- `GET /api/admin/kit-results/:kitId?emails=...` uses parameterised SELECT queries only. It does not call student progress/completion/email handlers, initialise schemas or open/modify Drive files. Access failures are explicit and responses use `private, no-store`.
- A kit with worksheet titles but no activity definitions permits manual completion ticks; the report warns about this rather than presenting certificates as verified work.
- Admin users can also open **Licence > Teacher Review** in Teacher View. The menu uses the same admin permission as Upload Kits; the report endpoint still enforces admin access.
- Future completion-certificate subjects include the student's certificate name, e.g. `[DTECH HUB] Minecraft Builder Kit - Certificate of Completion - Alex Student`, including teacher catch-up copies. Existing sent mail is unchanged; legacy and named subjects are both recognised when checking prior teacher deliveries.

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

- The builder loads its saved kit dropdown with caching disabled; the admin catalog response also uses `Cache-Control: no-store`. Catalog failures are shown explicitly rather than silently presenting only built-ins. **Refresh kit list** retries without clearing the current draft, and failed initial catalog loads can retry after Google auth becomes ready. A selected kit missing from the catalog is reported instead of silently switching to a blank kit.

- Uploaded kits have an admin-only Delete Kit button with confirmation. Removal archives the saved kit with a deletion timestamp and removes its library card; kit content and student progress are retained. Built-in kits cannot be deleted, and stale editors cannot republish deleted kits.
- My Licence uses a compact, clickable stamp/kit grid as its primary launch area. Stats, badges and the detailed kit collection remain available in the collapsed "My achievements, stats & kit details" section. The Typing log stays separate from earned stamps.
- The current six launch cards were checked at a 1366 x 650 browser viewport (100% zoom), including space for a 96px navigation bar. Larger future collections and expanded details can scroll normally; content is never clipped to force a fixed-height screen.

- Activity Details supports an optional activity-specific challenge, key skill and evidence instructions. The old "Your tasks (one step per line)" field is removed, and its legacy instructions are no longer displayed; saving kit content deletes those old task values, including saves from older editors. Use separate Task List blocks for instructions with bold headings and numbering restarted at 1. Challenge, key skill, evidence and existing Task List blocks are retained. The brief fields do not add file upload or automatic evidence checking, and do not change completion rules.
- A read-only Live Preview below Activity Details uses the student worksheet renderer and updates after edits or question/image additions and removals. Previewing does not save content or student progress.
- `node --test scripts/regression-activity-task-brief.js` covers editor save/reload, removal of legacy task instructions, preserved activity details/blocks and escaped student output.

### Activity Content Block Builder

- Activity Details includes an ordered block builder: Text / Instructions, Image, Task List, Question (written, choice or checklist), Website Link, Student Add a Link, Resource File, Checkbox, Table (static or student-filled), Word Search, Crossword and Create Document. Blocks can repeat, move or be removed; the read-only preview follows the same order.
- Text / Instructions offers **Number each line**: non-empty lines become ordered steps, restarting at 1 under each bold block heading. New text blocks default to numbering on; existing blocks keep plain text until the teacher selects the option. Task List blocks remain numbered as before.
- **Website Link** is a teacher-supplied link. **Student Add a Link** provides one saved HTTPS URL per student per block and an Open Link button. Optional teacher instructions describe which link to paste. Invalid/unsafe URLs are saved as drafts with inline feedback but cannot be opened or earn a required automatic tick. Automatic marking checks URL format only, not reachability, file permissions, ownership or the work inside. Clearing a required URL removes its automatic tick. Add multiple blocks for multiple submissions.
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
