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
