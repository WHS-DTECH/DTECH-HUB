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

## Phase 3 foundation

- Legacy two-cloud kites represent separately attributed arguments and require evidence. The map limits how many kites it shows to reduce clutter; the keyboard-accessible searchable list gives access to all visible kites.
- Authorised teachers use the same kite form, discussions and evidence tools from the shared web under their own verified identity. They do not need to use **Switch to Student View**. Cloud management and student proposals remain separate.
- On an approved proposal, **Publish as Kite** prefills the original connection and evidence, which the student can edit before publishing. The same proposal can be converted only once.
- On a kite, students can post questions and replies without citations and add separately attributed evidence that supports, challenges, or contextualises the argument. Contributions publish immediately. Owners can edit their own contributions without changing original authorship or creation time; previous content is recorded privately.
- **My Contributions**, opened from the toolbar on the shared web, is a separate page for your proposals, kites, comments and evidence. Links reopen the relevant cloud or kite on the shared web. Other readers see display names, not private school identities.
- Students can submit private reports about behaviour, not disagreement. A report does not hide content. Authorised staff can hide the reported contribution or dismiss the report; both actions are audited privately. Hiding a kite hides its discussion and evidence with it. Ordinary contributions do not enter a review queue.
- The first open report for a contribution triggers a generic email to the configured DTECH Lead Teacher recipients when Hub mail is configured. The message includes a moderation link but no student identity or report content. Reports remain saved in **Manage Knowledge Web** if mail is unavailable or delivery fails.

## Revised architecture

**Stage 1:** Select one published cloud and choose **Add a Kite** to publish an idea, observation, question, or argument without teacher approval. Evidence is optional and can also be added later. Each new kite has one string to its cloud. Existing two-cloud kites remain intact and readable without an inferred originating cloud. The original approved-proposal **Publish as Kite** flow still publishes a two-cloud kite during this transition.

Use **Explore the Knowledge Web** to search clouds and kites together or open **+ Add** for the actions available to your account. Select a result or canvas item to open it in the information panel next to the canvas (below it on narrow screens). Kite evidence, discussion and actions stay in that panel. The Timeline toolbar groups date navigation separately from canvas zoom and reset.

**Stage 2:** Use **+ Add → Connect Ideas** to link two different published clouds or visible kites in either order. The selected cloud or kite is prefilled when available. Write a relationship explanation; evidence is optional. Independent explanations between the same pair can coexist. Dashed strings are selectable separately from the solid kite attachments, and unified search can open any connection, including those whose endpoints are outside the canvas's kite display limit. Connections, evidence, and replies publish immediately. **My Contributions** includes connection work. Staff can hide reported strings without hiding their endpoints; hiding a kite makes its connections unavailable without deleting them.

Stage 2 creates separate connection, comment, evidence, revision and moderation tables through the existing transactional PostgreSQL schema setup. It does not convert or rewrite legacy two-cloud kites.

Drag clouds and kites on the canvas, or focus one and use **Shift + arrow keys**. Enter and Space still open details. Strings follow their endpoints. Saved moves affect only your account; **Reset Layout** clears your personal positions without changing zoom or shared content. Authorised teachers can use **Edit default layout** to set starting positions for clouds and kites, then switch back to their own layout. A personal position overrides its shared default.

Search opens a list of matching clouds, kites and connections; use **Browse** to open the list without typing. Select a result to inspect it beside the map (below it on narrow screens). Expand **Timeline** below the workspace for the selected cloud's dates and sources. The map toolbar has separate **Reset view** and **Layout** controls; **Map help** lists the keyboard shortcuts and explains the two kinds of strings.

### Hot-Air Balloons

Select a published cloud or visible kite, then choose **+ Add → Add Hot-Air Balloon**. Name one specific theoretical principle for the basket, explain what it means in the balloon, and explain separately why it relates to the originating item. Select the solid attachment string on the map to read that relationship. Evidence is optional and can be added later. Publication is immediate; the explanation is the contributor's interpretation, not a verified historical claim.

The solid attachment string stays tied to the original item. **Connect Ideas** adds independent, explained strings between any two different clouds, kites or balloons. Search balloon ideas, principles and explanations; use **My Contributions** to revisit your balloon, evidence or discussion. Drag it or use **Shift + arrow keys** to move it in your personal layout.

The existing transactional PostgreSQL setup adds a separate principle explanation field without reinterpreting earlier idea-based balloons. Earlier balloons keep their original wording, editing fields, attachments, connections, and layouts. Hiding a balloon (or its origin) makes its dependent connections unavailable without deleting them. Hiding a connection on its own does not hide either endpoint.

### Stage 3 (planned): Upgrade to Cloud

**Upgrade to Cloud** starts a separate historical cloud draft; it does not convert the kite or approve its interpretation. Only staff authorised to manage Knowledge Web clouds can start the draft or publish it. The draft stays private until explicitly published.

1. Check for an existing published cloud on the same topic when starting the draft and again before publication. If the topic already exists, use that cloud rather than publishing a duplicate. The student can add an attributed connection to it and explain the relationship. Neither finding a match nor publishing a new cloud automatically creates a student connection.
2. Verify the historical event or development, write a standalone account of what happened and why it matters, and add relevant dates and context.
3. Add credible sources to the new cloud that support its own historical claims and broaden the treatment beyond the original kite. The kite's argument and evidence are not automatically copied into the cloud as historical facts. The system can require the relevant fields and sources; the teacher is responsible for judging credibility, significance, and whether the topic stands on its own.
4. Publish through the teacher cloud workflow. Record provenance separately from ordinary connections: link the new cloud ID to the original kite ID and record the responsible teacher and timestamps. Label it **Developed from a kite**, not as evidence or endorsement. Show a link to the original contribution only where it is visible to the reader; retain the provenance privately if the kite is later hidden.

The original kite keeps its ID, student authorship, timestamps, evidence, discussion, and connection history. The teacher-authored cloud has its own ID, sources, timeline, and publication record. Sharing provenance does not change the student's contribution or make the student the author of the historical cloud.

## Future phases

- **Phase 4:** Advanced kite tails and tangent-to-cloud conversion are not implemented.
- **Selected evidence export:** Use stable contribution and context IDs to assemble the student's selected arguments and comments with the associated historical context, sources, authorship, timestamps and Knowledge Web references. Apply visibility rules and omit private identifiers and other users' private data. No grading, standards mapping or portfolio submission is in scope.

## Regression test

Set `KNOWLEDGE_WEB_TEST_DATABASE_URL` to an isolated PostgreSQL database and run:

```powershell
node --test scripts/regression-knowledge-web.js
```

The integration test creates and removes a unique schema in that database.
