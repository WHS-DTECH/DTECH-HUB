# Knowledge Web

The Knowledge Web is a KNOW Mode feature separate from Licence Kit activities and completion tracking. Its PostgreSQL tables are created by `knowledge-web/.store.js` when the API is first used.

## Phase 1 and 2

- Teachers manage factual clouds at `/knowledge-web/`; only published clouds appear to eligible students.
- Years 9 and 10 students can open a published cloud and propose another cloud with separate sources for its historical claims and proposed connection.
- Students can save private drafts, resume or revise their own proposals, and see statuses and private teacher notes. Similar titles generate an advisory warning.
- Teachers review proposals submitted for cloud publication. They can approve and publish a sourced cloud, return it with a private revision note, or decline it with a reason. Unfinished drafts are not in the teacher review area.
- Approval preserves the student's original cloud, explanation, and connection evidence on the proposal. It does not create or publish a kite.
- Proposal decisions and revisions are recorded in `knowledge_web_proposal_events`.

The initial `2026 NCEA Digital Examination Disruptions` cloud is seeded as an unpublished draft without sources. A teacher must verify its historical information and add sources before publishing it; students need at least one published cloud to propose a connection.

Phase 3 features (live kites, discussions, evidence triangles, and moderation reports) are not implemented.

## Regression test

Set `KNOWLEDGE_WEB_TEST_DATABASE_URL` to an isolated PostgreSQL database and run:

```powershell
node --test scripts/regression-knowledge-web.js
```

The integration test creates and removes a unique schema in that database.
