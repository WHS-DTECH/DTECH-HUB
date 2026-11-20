# Knowledge Web

The Knowledge Web is a KNOW Mode feature separate from Licence Kit activities and completion tracking. Its PostgreSQL tables are created by `knowledge-web/.store.js` when the API is first used.

## Phase 1 and 2

- Teachers manage factual clouds at `/knowledge-web/`; only published clouds appear to eligible students.
- In the teacher cloud editor, **Get source details** can suggest a title, author or organisation, and publication date from a public HTML webpage. It fills only blank fields. Check all suggestions, and write what the source supports yourself; blocked pages, missing metadata, and non-web references require manual entry.
- Event and source dates are displayed and entered as `MM-YYYY` or `DD-MM-YYYY`. Existing ISO-format dates remain compatible and dates are stored in ISO format.
- Select a cloud to explore its timeline. Year view groups entries by recorded month; Day view offers recorded exact dates and orders timed events, with untimed entries identified separately. Teachers can add verified events in **Timeline details**; events can optionally include a 24-hour time with a full date. Source publication dates also appear automatically, labelled separately because they may not be the dates of the events described. Sources without a publication date are not placed on the timeline. Times are displayed as recorded without time-zone conversion; month-only dates remain supported.
- The shared canvas separates overlapping clouds for display while preserving their saved positions. Selecting a title centres the displayed cloud.
- Current Years 9–13 students use the same shared web. The server checks verified school identity and current directory year, not a student-selected year or course. MiddleDTECH (Years 9–10) and SeniorDTECH (Years 11–13) follow the same proposal rules.
- Students open a published cloud to propose another cloud with separate sources for its historical claims and proposed connection. Only teachers can publish independent clouds.
- Students can save private drafts, resume or revise their own proposals, and see statuses and private teacher notes. Similar titles generate an advisory warning.
- Teachers review proposals submitted for cloud publication. They can approve and publish a sourced cloud, return it with a private revision note, or decline it with a reason. Unfinished drafts are not in the teacher review area.
- Approval preserves the student's original cloud, explanation, and connection evidence on the proposal. It does not create or publish a kite.
- Proposals retain the verified account, display name, UUID, original creation date, last edit date, and cloud references. Source and evidence rows retain their own UUIDs, timestamps, and purpose (`cloud` or `connection`); they inherit the verified contributor from their parent proposal. Publication carries over the historical sources' original attribution and timestamps. Public claims show display names, not school accounts or directory identifiers. Author ownership is not based on year or course.
- Proposal decisions and revisions are recorded in `knowledge_web_proposal_events`. **My cloud proposals** in **My Contributions** links back to the original and approved clouds.

The initial `2026 NCEA Digital Examination Disruptions` cloud is seeded as an unpublished draft without sources. A teacher must verify its historical information and add sources before publishing it; students need at least one published cloud to propose a connection.

## Phase 3

- **Connect Clouds** publishes a student's argument as a kite between two different published clouds. At least one piece of evidence with an explanation is required. Multiple kites about the same clouds remain separate arguments. The map limits how many kites it shows to reduce clutter; the keyboard-accessible searchable list gives access to all visible arguments.
- On an approved proposal, **Publish as Kite** prefills the original connection and evidence, which the student can edit before publishing. The same proposal can be converted only once.
- On a kite, students can post questions and replies without citations and add separately attributed evidence that supports, challenges, or contextualises the argument. Contributions publish immediately. Owners can edit their own contributions without changing original authorship or creation time; previous content is recorded privately.
- **My Contributions** shows a student's proposals, kites, comments and evidence and can reopen their original context. Other readers see display names, not private school identities.
- Students can submit private reports about behaviour, not disagreement. A report does not hide content. Authorised staff can hide the reported contribution or dismiss the report; both actions are audited privately. Hiding a kite hides its discussion and evidence with it. Ordinary contributions do not enter a review queue.
- The first open report for a contribution triggers a generic email to the configured DTECH Lead Teacher recipients when Hub mail is configured. The message includes a moderation link but no student identity or report content. Reports remain saved in **Manage Knowledge Web** if mail is unavailable or delivery fails.

## Future phases

- **Phase 4:** Advanced kite tails and tangent-to-cloud conversion are not implemented.
- **Selected evidence export:** Use stable contribution and context IDs to assemble the student's selected arguments and comments with the associated historical context, sources, authorship, timestamps and Knowledge Web references. Apply visibility rules and omit private identifiers and other users' private data. No grading, standards mapping or portfolio submission is in scope.

## Regression test

Set `KNOWLEDGE_WEB_TEST_DATABASE_URL` to an isolated PostgreSQL database and run:

```powershell
node --test scripts/regression-knowledge-web.js
```

The integration test creates and removes a unique schema in that database.
