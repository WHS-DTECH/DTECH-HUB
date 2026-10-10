# Learning Pathways

A separate library with five pre-loaded Year 7/8 curriculum area cards and the Licence Library's card layout,
search, year-level/category/status filters and sorting.
The footer card type is **Curriculum Strands**: these cards describe teacher
curriculum requirements, analogous to standards in the SeniorDTECH library.
This label does not change pathway names or populate the student Task List.

The yellow **Pathways** navbar button opens this dashboard for signed-in users
whose actual course is JuniorDTECH or MiddleDTECH. It updates after saving a
staff course, stays hidden while the course loads or cannot be confirmed, and
is hidden for SeniorDTECH and signed-out users. Browse also contains a library
link; the navbar visibility does not restrict direct dashboard access.

In Student View, the main home entry (`/` or `/index.html`) routes JuniorDTECH
and MiddleDTECH users to Learning Pathways. SeniorDTECH users use Computer Lab;
opening the Pathways homepage in that view returns them to Computer Lab.
The Computer Lab brand link targets the user's course homepage. This applies
to students and staff using their saved actual course in Student View.
Teacher View, Admin pages and links to individual resources are not redirected.
Signed-out users and unknown courses retain the existing public homepage.
Routing waits for both course and access resolution, including after refresh.

- `index.html`: public dashboard (`/learning-pathways/`).
- `admin.html` and `admin.js`: admin-only card editor. Save Card to Draft adds or
  updates a local draft; Publish Library persists additions, edits and deletions.
- `library.json`: curriculum card seed, kept separate from the Licence Library.
- `library-store.js`: validation, persistent storage and API routes.
- `styles.css`: library-specific styles.
- `digital-systems.html`: teacher-facing curriculum reference with all eight
  requested sections, aligned Year 7/8 knowledge and practices, integrated
  Design, Make, and Innovate, a planning progression matrix, Minecraft contexts
  and coverage/evidence cautions. Summaries are paraphrased from the supplied
  September 2026 Technology Years 0-10 PDF (pp. 2, 5, 13, 16, 17 and 25).
  The supplied document is proposed; this page does not assert later approval.
  The public reference uses the shared site navigation, not a new admin editor.
  No assessment descriptors or automatic completion rules are introduced.
- `programming-and-algorithms.html`, `data-and-information.html`,
  `digital-citizenship.html` and `systems-and-control.html`: the other four teacher
  references, using the same sections, comparison tables, source/status notice
  and styles as Digital Systems. Systems and Control maps to the official strand
  on p. 16; the other school pathways map to Digital Technology (p. 17) and
  Design, Make, and Innovate (p. 13). Shared responsibilities, year-specific
  statements and school-context extensions are distinguished. Existing kit
  outlines are context opportunities, not proof of curriculum coverage; hidden
  Search/Login worksheets are not assumed to be active.
- `task-list.html` and `task-list.js`: JuniorDTECH student Task List skeleton.
  The green navbar and sidebar Task List buttons use the resolved actual course:
  JuniorDTECH opens this page, SeniorDTECH retains its existing Task List, and
  MiddleDTECH has no Task List button yet. Course changes and sign-out clear the
  list immediately. The page lists only the names of published Junior DTECH
  pathway cards in alphabetical order, with no tasks, completion controls,
  assessment criteria or progress descriptors yet. Course/library failures have
  visible retry actions. The shared `hub-course-resolved` event carries course
  loading, success and error state; the page does not infer course from year.

Keep future pathway pages, images and resources inside this folder and link to
them from pathway cards. The dashboard reuses the existing shared card renderer
in `../practical-skills/app.js`, configured through its section's data attributes,
and the site's shared navigation, sign-in, sidebar and styles.

Published cards are stored in Postgres (`learning_pathways_library_store`) so
they survive Render restarts and deployments. `library.json` seeds the first
database read only; without `DATABASE_URL`, local development reads/writes that
file. A versioned, one-time migration adds missing curriculum area cards to
existing libraries without overwriting existing cards. Later edits and deletions
are preserved; an empty published library stays empty after the migration.
Version 2 merges the original Programming and Algorithms starter cards into
**Programming & Algorithms**, with a combined description. Other cards are
unchanged; an existing combined card is preserved, and later deletion of the
combined card is not undone on refresh or restart.
Version 3 renames Data to **Data and Information**, including its category label,
without changing its description, ID or other card fields.
Version 4 removes the Design and Innovation starter card without changing the
remaining cards.
Version 5 links an existing, unlinked Digital Systems card to its curriculum page,
preserving all other fields, custom links, card order and deleted cards. Later
published link changes are not undone. The source PDF stays in local TeacherFiles
and is not copied or published as part of this page.
Version 6 links the other four unlinked curriculum cards to their reference pages,
without replacing custom links, changing other card fields/order or restoring
deleted cards. Later published link changes are preserved. All five curriculum
cards are now linked; the Junior Task List still displays names only.

## Progression Pathway (Teacher View)

`progression-pathway.html`, `.js`, `.css` and `progression-store.js` provide the
Student Work > Progression Pathway tracker. The layout follows the supplied
JuniorDTECH tracker concept: student/rotation, five pathway results, selected
curriculum coverage/evidence and teacher strengths/next-learning summary.
The five user-supplied descriptors and colours are teacher selected. Coverage
is separate; Not taught requires Not determined. No kit-derived grades or
student-facing results are added.

Teacher/Admin-protected `/api/teacher/progression/students` and
`/api/teacher/progression/records` (GET/PUT) use the existing write-access
middleware and directory. Each student/school-year/term has its own Postgres
record in `progression_pathway_results`, including the year level/class snapshot,
teacher and update time. Save is explicit, and revision checks prevent concurrent
teachers overwriting each other's edits. Earlier rotations remain available.
Students with saved history remain discoverable after moving beyond Year 10;
their historical year level/class and saved name are retained. New rotations
require a current Year 7-10 directory entry.
Database-unavailable development returns an explicit 503 rather than pretending
results were saved. Source PDFs remain local and are not published.
The student controls use Homeroom and Year level filters together with name
search (for example JPI + Year 7). JVE, JPI, JMM, JSR, JSD, 7S and 8S are offered,
along with other directory homerooms. Explicit homeroom/tutor fields take
priority over class codes; class is used only when no homeroom is supplied.
No class-to-homeroom membership is guessed. Zero matches are shown explicitly.
Filtering away from a student prompts before discarding unsaved edits and clears
the previous results. Homeroom is saved separately from class; old records use
their class as a display fallback. Saved term results keep the existing
student/school-year/term storage key and history; this is not a storage migration
from terms to homerooms.
Run `node scripts/regression-progression-pathway.js` for validation, teacher
access, history persistence, concurrent-edit conflicts and descriptor contrast.

Public reads: `/learning-pathways/library.json` and
`GET /api/learning-pathways/library`. Admin reads and publishing:
`GET` / `PUT /api/admin/learning-pathways/library`, protected by existing admin
access middleware. PUT accepts `{ "cards": [...] }`. Cards require title,
summary. A blank link renders a non-clickable card; adding an internal site path
or HTTP(S) link enables it when activities are ready. Duplicate IDs and unsafe
link protocols are rejected.

Learning Pathways does not award licence stamps, change course assignments, or
alter Licence Library cards or kit progress.

Run the focused regression checks from the repository root:
`node scripts/regression-learning-pathways.js` and
`node scripts/regression-pathway-task-list.js`.
