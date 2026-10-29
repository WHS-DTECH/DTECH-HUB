# Practical Skills Module Template

This folder is the reusable Practical Skills module for HUB sites.

## Folder Structure

- `index.html` - Practical Skills homepage (student-facing card library)
- `app.js` - Homepage rendering logic and API calls
- `checklist.html` - Standalone Practical Skills Checklist page
- `checklist.js` - Kit progression and scoreboard loaded from server-saved progress
- `checklist.css` - Checklist page styling
- `library.json` - Source-of-truth library card data persisted by admin save
- `admin.html` - Admin management UI for Practical Skills cards
- `admin.js` - Admin add/edit/delete/publish logic
- `typing-kit.html`, `typing-kit.js`, `typing-kit.css` - Typing Kit dashboard and daily period records
- `typing-kit-store.js` - Typing result validation, calendar and append-only attempt storage

## Typing Kit

Open **Typing Kit** from My Licence or the Licence Library. Its seven calendar
weeks initially start on Monday **26 October 2026** and finish on Sunday
**13 December 2026**. Each week has Period 1 and Period 2, linking to fourteen
daily records. Every submitted attempt is retained; the dashboard shows the
latest WPM/accuracy and attempt count for each period. All scores and times
remain available on the underlying daily page.

Students use their existing Hub school Google identity. They launch a public
one-minute TypingTest.com test in a new tab, complete it, paste the results page
URL, save, then copy the saved result into their exercise book for a handwritten
teacher signature. Returning to the kit prompts for the link, but does not claim
to detect completion. No scraping, TypingTest.com login, electronic teacher
approval, certificate, points or 24-hour completion timer is involved.

The server accepts completed 60-second HTTPS TypingTest.com results links,
validates score fields, and extracts net/gross WPM, accuracy and duration.
These are **student-submitted**, not verified scores. Timestamps record submission,
not the time of the test, and are displayed in New Zealand time. A submission ID
prevents network retries from creating duplicate attempts. Explicitly submitting
the same results link again is a new attempt, not proof of a separate test.

Teaching staff can expand **Teacher calendar settings** on the dashboard to change
the Monday starting Week 1. This is one shared calendar for all Typing Kit users,
not a per-class schedule. Previous results remain attached to their original
calendar week and period; those outside the new calendar are accessible through
**Earlier / other dated records**. Periods are chosen by the student; their actual
lesson day is not preset. Changing the calendar never renumbers stored results.

Storage requires PostgreSQL (`DATABASE_URL`). The module creates
`typing_kit_settings` and `typing_kit_attempts` on first use. Without database
storage it explicitly refuses to save, rather than using temporary in-memory
results. Student reads/writes are scoped to the authenticated school account;
calendar edits use the existing teaching-staff permission check.

The Typing Kit card is supplied for both seeded and already-published libraries
without changing the original three kits' scoring, stamps or certificates.
The ID `kit-typing` is reserved for this specialised log; creating an ordinary
kit with that name uses a different ID. Its calendar is managed on its own page,
not through the generic activity builder.

- `GET /api/practical-skills/typing-kit` - Own saved attempts, current calendar and calendar-edit permission
- `POST /api/practical-skills/typing-kit/attempts` - Append an attempt for a current calendar week and period
- `PUT /api/practical-skills/typing-kit/settings` - Teaching-staff-only shared start-date update

Validate with `node --test scripts/regression-typing-kit.js` and
`node scripts/regression-licence-dashboard.js`.

## Google Drawings shape checks

Ship, TV and Flower Pot in the Google Drawings Kit each show the supplied
reference picture and instructions to build a similar picture from separate,
filled Insert > Shape objects, then a required Share Link field.
A saved link alone does not earn the tick. The student chooses
**Check my drawing**; the server confirms their Google account, reads the
Drive file (it must be a Google Drawing), exports it as SVG and stores a
receipt (`google-drawing-shapes-v1`) when it finds at least 8 filled shapes and
no inserted or pasted pictures. Line-only and outline-only artwork does not
pass. Each activity needs a different drawing. Receipts are tied to the current
link and progress reset, and editing the drawing later needs a new check.
Teachers can open the drawing in Results and approve or revoke completion.
The check cannot judge visual similarity to the reference or prove the exact
menu used; filled text or a filled background may count as shapes, so teacher
review remains the fallback. Existing link IDs and response keys are retained;
the one-time upgrade (`drawingCheckVersion: 1`) replaces the shape instructions
by ID, adds images only if they were never added before, and leaves later
teacher edits alone. Existing link-only ticks are recalculated and need a check
or approval. The usual all-activities certificate process applies, and the kit
stays Not Live until explicitly published. Teacher preview remains read-only.
The Upload menu, Kit Content Builder and Licence Kit Setup links are hidden in
Student View, including for staff previewing that view. In Teacher View, upload
tools remain available to staff and builder/setup links require admin access.

Validate with `node --test scripts/regression-google-drawings-links.js`.

## Search Kit progress safeguards

Search answer autosaves send only fields edited since that tab loaded or last
saved, and PostgreSQL merges those fields atomically. An older activity tab
cannot replace the entire kit's answers with its stale snapshot. Each Search
assessment saves only its own graded question IDs, never unrelated answers
included in a client snapshot. Obsolete clients submitting replacement-style
Search saves receive an explicit reload error.

Queued saves, marking timers and in-flight reads are scoped to the current
account/session. Changing accounts cancels Search timers and rejects stale
results. A failed progress read shows an error and retry control, not a misleading
empty activity list. Reset requires a warning/confirmation on both the worksheet
and Licence page; Search reset requests also require explicit confirmation on
the server. Intentional resets still retain answers and Drive files.

On the next Search progress/certificate read, a one-time additive recovery
rechecks saved answers for the four question-based activities. It restores only
missing ticks that pass the existing server graders, preserves earned ticks and
timestamps, and does not infer a research-report pass from client-editable answer
data. If that final tick is missing, the student must recheck the existing report;
they do not need to recreate it. The `search_tick_recovery_version` progress
column records recovery and prevents it from undoing a later intentional reset.
No other kits or student documents are migrated by this recovery.

Validate with `node --test scripts/regression-search-progress-preservation.js`
and `node scripts/regression-search-penguin-mission.js`.

## Rattlesnakes text-completion pilot

The Files & Folders kit's **Rattlesnakes** activity now needs both a valid saved
document link and a server-owned text-check receipt or explicit teacher approval.
Existing instructions, link block IDs, answers and files are preserved. Other
activities retain their existing rules. Old Rattlesnakes ticks without a receipt
are recalculated as incomplete on the next progress/completion check.

Students save their work and use **Check my document**. With Google Drive
permission for their own school account, the server exports Google Docs text or
reads a Word `.docx` file in Drive. It never fetches an arbitrary sharing URL.
PDFs, images and other providers (including OneDrive) need teacher review.
Automatic checks require at least 95% ordered word coverage overall and 90% in
each of the four reference paragraphs. Punctuation, spacing and minor spelling
differences are tolerated; a title, repeated paragraph or missing paragraph
cannot pass. Formatting, file location, manual typing versus pasting and teacher
sharing permissions are **not** verified.

On **Teacher Review > Student Review**, read the Files & Folders
kit's saved results, open the current submitted document, tick the review
confirmation and choose **Approve reviewed document**. Approval records the
teacher and timestamp; removing approval requires another successful check or
review. These controls require verified Google sign-in and the existing
admin-review and server-side teaching-staff permissions. Reading results alone
does not mutate progress or send certificates.

PostgreSQL table `practical_skills_document_checks` is created on first write.
Receipts store the account, kit/activity, canonical file identity, reference
version, result, method and check/reviewer timestamps, not access tokens or
document contents. They apply only to that submitted file and are snapshots,
not continuous monitoring. Changing to another file or resetting progress
requires a new check. After editing a checked file, students should check again.
If a document cannot be read, the error is shown; an earlier saved check is
not represented as a new successful check.

Every automatic completion and certificate recalculation uses the trusted
receipt. Client answer fields cannot invent approval. The distinct-document
rule and all-five-activities certificate requirement remain in force, including
after teacher approval. Teacher approval recalculates completion without
emailing a certificate as the teacher; the student's normal kit/certificate
workflow remains responsible for delivery.

- `GET/POST /api/practical-skills/blocks/:kitId/:activityIndex/document-check`
- `GET/PUT /api/admin/kit-document-review/:kitId/:activityIndex`

Validate with `node --test scripts/regression-document-verification.js scripts/regression-files-folders-links.js`.

## Teacher certificate email catch-up

On the admin **Email Log**, use **Check missing teacher copies** to cross-match
completed Login/Search Kits against successful email logs. Matching requires
the student, kit subject (including previous Login/Search names) and current
DTECH Lead Teacher recipient. A student-only email or the
`certificate_emailed_at` flag alone does not prove that a teacher received it.

**Send missing teacher copies** sends an individual PDF certificate to each
missing teacher recipient only. It never re-emails students or alters their kit
completion. A durable per-student/kit/teacher reservation prevents repeats;
uncertain or interrupted deliveries require manual review rather than automatic
retry. The sender shares a database lock with ordinary certificate email sends
to avoid racing with a student's automatic email. Later student certificate
emails omit teachers already handled by catch-up.

PostgreSQL and configured SMTP are required. The catch-up creates
`kit_teacher_certificate_deliveries`, recording reservation and sent timestamps.
Existing untracked mail outside the Hub cannot be inferred from the database.
The preview reports completed records whose certificate is no longer available
under current activity requirements, rather than assuming they can be emailed.

- `GET /api/admin/practical-skills/certificate-catchup` - Admin-only preview
- `POST /api/admin/practical-skills/certificate-catchup` - Admin-only send for one previewed student/kit

Validate with `node --test scripts/regression-certificate-catchup.js` and
`node scripts/regression-kit-certificate.js`.

## API Endpoints Used

The global sidebar shows Current Learning Kit and View My Licence above Quick
Links for all course levels, including SeniorDTECH. These use a copper/peach
palette distinct from the green/blue senior assessment summaries and gold
Quick Links. The current kit is the first unfinished kit in the Licence's
ordered `/api/practical-skills/my-progress` response; its name comes from the
kit content API. Open Kit links to its worksheet. When all kits are complete,
the panel points to Licence stamps and certificates instead. Loading failures
are visible with a Retry button; stale responses from other accounts are ignored.

- `GET /api/practical-skills/library` - Public read for student page
- `GET /api/admin/practical-skills/library` - Admin-only read
- `PUT /api/admin/practical-skills/library` - Admin-only publish/save
- `GET /api/admin/practical-skills/preview-users` - Admin-only directory names and basic profile details for the user/course preview

## Admin User and Course Preview

Above the Card Editor, select Students or Staff, search for a named person, and
choose a temporary JuniorDTECH, MiddleDTECH or SeniorDTECH course. The preview
panel has a pale teal background and dark teal accent border to distinguish
it from the unchanged Card Editor. The preview
includes All Years cards and matching pathway/year cards. Student defaults are
inferred from their directory year level; staff default to All courses.
This is a read-only planning preview, not impersonation or a saved assignment.
It does not change directory records, Login Kit check-ins, Drive folders, the
student-facing library, or the full Card Editor and Current Cards sections.
The preview is an alphabetically sorted, searchable list of kit names rather
than full cards. Its height is limited to 240px, with keyboard-accessible
scrolling for long lists. Kit-name search only filters this preview, not the
Card Editor or Current Cards. Preview names reflect local edits; Publish
Library remains the save action.
Find a person offers native dropdown suggestions as you type. Choose a name
to select that person and their default preview course automatically. Suggestions
include email or homeroom details to distinguish similar names and follow the
Students/Staff selector. The separate person dropdown remains available.

## Shared Button Readability

Admin and navigation buttons use the shared styles in `../styles.css`:
opaque purple/white primary buttons and pale blue/navy secondary buttons.
Disabled labels remain readable, with a distinct disabled appearance and no
hover movement. Keep normal and hover text contrast at least 4.5:1; validate
with `node scripts/regression-button-contrast.js` from the repository root.

## Sidebar Course

The sidebar displays the signed-in user's actual pathway beneath their name,
not the Admin preview selection. Student pathways follow the latest directory
year level. Staff can select their own account in the Admin preview and click
"Save as my actual course" for JuniorDTECH, MiddleDTECH or SeniorDTECH.
This separate action persists their choice in Postgres and refreshes the sidebar
immediately; it does not assign other users or move/create Google Drive folders.
Future course-folder requests use the saved staff choice, reusing existing folders.
Without an explicit saved choice, staff pathways come from their completed
Login Kit course check-in; otherwise the label says "Not confirmed yet".
The preview dropdown alone still makes no saved changes.
`PUT /api/admin/practical-skills/my-course` saves only the authenticated admin's
own staff course; it rejects All courses and student accounts.
`GET /api/practical-skills/my-course` returns this read-only label.
My Assessment Tasks, My Projects, Internal Assessment Summary and External
Assessment Summary are only visible in the sidebar for SeniorDTECH. They stay
hidden for JuniorDTECH, MiddleDTECH and unconfirmed/unavailable courses, including
while the course is loading. Allocations themselves are not changed or deleted.
Sidebar navigation and Quick Links are unaffected.

## Required Server Config

In `server.js`, ensure this file path constant points to this module folder:

- `PRACTICAL_SKILLS_LIBRARY_FILE = path.join(__dirname, "practical-skills", "library.json")`

## Required Navigation Links

- Global nav Practical Skills item should link to `/practical-skills/`
- Admin menu Practical Skills manager should link to `/practical-skills/admin.html`

## Quick Rebrand Config

Use this checklist when cloning the module to another HUB.

- `Module Route Base`: `/practical-skills/`
- `Student Page`: `practical-skills/index.html`
- `Admin Page`: `practical-skills/admin.html`
- `Data File`: `practical-skills/library.json`
- `Server Constant`: `PRACTICAL_SKILLS_LIBRARY_FILE`
- `Public API`: `GET /api/practical-skills/library`
- `Admin APIs`: `GET /api/admin/practical-skills/library`, `PUT /api/admin/practical-skills/library`
- `Navbar Label`: `Practical Skills`
- `Admin Menu Label`: `Practical Skills Library`
- `Default Card Palette`: `linear-gradient(135deg, #2f8f61 0%, #3ca873 54%, #65c494 100%)`

### Rebrand Targets

Update these files for site-specific naming and visual tweaks:

- `practical-skills/index.html`
- `practical-skills/admin.html`
- `practical-skills/library.json`
- `script.js`
- `admin-menu.html`

## Porting To Another HUB Site

1. Copy the whole `practical-skills/` folder.
2. Copy the 3 Practical Skills API endpoints in `server.js`.
3. Update nav/admin links in the destination site.
4. Keep shared auth helper flow so admin endpoints remain protected.
5. Seed `library.json` with starter cards for the new site.
