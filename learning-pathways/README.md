# Learning Pathways

A separate library, initially empty, with the Licence Library's card layout,
search, year-level/category/status filters and sorting.

- `index.html`: public dashboard (`/learning-pathways/`).
- `admin.html` and `admin.js`: admin-only card editor. Save Card to Draft adds or
  updates a local draft; Publish Library persists additions, edits and deletions.
- `library.json`: initial card seed, kept separate from the Licence Library.
- `library-store.js`: validation, persistent storage and API routes.
- `styles.css`: library-specific styles.

Keep future pathway pages, images and resources inside this folder and link to
them from pathway cards. The dashboard reuses the existing shared card renderer
in `../practical-skills/app.js`, configured through its section's data attributes,
and the site's shared navigation, sign-in, sidebar and styles.

Published cards are stored in Postgres (`learning_pathways_library_store`) so
they survive Render restarts and deployments. `library.json` seeds the first
database read only; without `DATABASE_URL`, local development reads/writes that
file. An empty published library stays empty and is not repopulated on restart.

Public reads: `/learning-pathways/library.json` and
`GET /api/learning-pathways/library`. Admin reads and publishing:
`GET` / `PUT /api/admin/learning-pathways/library`, protected by existing admin
access middleware. PUT accepts `{ "cards": [...] }`. Cards require title,
summary and an internal site path or HTTP(S) link; duplicate IDs and unsafe
link protocols are rejected.

Learning Pathways does not award licence stamps, change course assignments, or
alter Licence Library cards or kit progress.

Run the focused regression checks from the repository root:
`node scripts/regression-learning-pathways.js`.
