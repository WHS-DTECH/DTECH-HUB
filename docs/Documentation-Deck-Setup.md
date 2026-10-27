# Submission Documentation Deck

The Task List's Preparing for Final Submission card is separate from the client
presentation. It offers linked merging or Google Sync for an existing written
documentation deck. Linking an existing deck does not move or edit its slides.
Deck-ready state is preparation for Stage 3, not a final submission or an
assessment grade. Preparing these files does not perform final submission.

## Existing decks

Google Sync validates the Google Slides link and stores it against the signed-in
student and selected assessment. Previously linked full slide sets are recognised
as existing documentation. They are not automatically rebuilt. A manually
assembled deck cannot be used as the target of Add missing slides.

## Slideshow PDF Exports

The client-presentation and Stage 1 documentation cards each offer Convert
slideshow to PDF. The source must already be saved on the selected assessment;
the endpoint does not accept arbitrary slideshow URLs. Export uses the student's
existing Google Drive permission and Google's Slides-to-PDF export, independently
of the linked-merge Apps Script configuration. The source slideshow is not edited,
moved, or replaced, and no sharing permissions are changed.

Each action validates the student's allocation, token identity, and owned
`SeniorDTECH/Process Assessment` destination, checks the slideshow's version and
modified time before/after export, and rejects a changed source or replaced
assessment link. Google Drive's PDF export limit is 10 MB; oversized or invalid
responses fail without a PDF upload. Every successful conversion creates a new
dated file. The latest PDF link, source identity/version and export time persist
against the assessment; previous PDFs remain in Drive.

The saved-PDF link is shown only for the same linked slideshow. Export is a
snapshot of that slideshow's current content, not proof of completed answers or
grading. For generated linked decks, update linked slides in Google Slides before
exporting if their source content has changed; exporting does not refresh links.
Live source changes after conversion require another PDF conversion.

## Stage 6: Additional Slideshows

The final stage lets a SeniorDTECH student add as many additional Google Slides
presentations as needed (usually one or two). Each **+ Add slideshow** card
links an existing, accessible Google Slides presentation to the current
assessment in place; it neither copies, moves nor edits the source. The student
then converts that linked presentation into a new PDF saved separately in their
owned `SeniorDTECH/Process Assessment` folder. Each saved additional PDF is
included in the Final Package after its files are checked.
The student must select Yes or No before the Final Package can be checked.
Yes requires a saved PDF for every linked additional slideshow; No is recorded
as Not needed when no additional slideshow has been linked. A No answer cannot
be saved after a slideshow has already been linked.

Each card has its own persistent source/PDF records, so cards remain available
across devices and reloads. A PDF link is shown only when its saved source
presentation still matches that card. Converting again creates a new dated PDF;
older PDFs are left untouched in Drive. Students need access to the source
presentation and their normal Google Drive permission. No sharing permissions
are changed. The Stage 6 action validates a school assessment, student token,
live Google Slides type, and source version during export before saving a PDF.

`node scripts/regression-documentation-deck.js` tests both PDF kinds, source
and destination checks, immutable versions, invalid exports, changed-source
rejection, saved-link reloads and UI controls. A school-account smoke test is
still needed to confirm live Google export and Drive upload permissions.

`node scripts/regression-additional-slideshows.js` checks unique repeatable
slideshow IDs, saved card/PDF matching, link-in-place sync, separate PDF output
and the additional-card controls.

## One-time school setup for linked merging

The Node Slides REST API does not expose linked slide import. The provided Apps
Script uses `insertSlide(index, source, SlidesApp.SlideLinkingMode.LINKED)`.
It must execute as the student, not as a teacher or service account.

1. Create a standalone school-owned Apps Script project. Add the contents of
   `apps-script/DocumentationMerge.js` as its script code.
2. In Project Settings, show the manifest and use
   `apps-script/appsscript.json`. Its scopes are Drive, presentations, and the
   current user's email. Do not add other services or scopes without also
   updating the merge-specific OAuth request in the Task List.
3. Associate it with the **same standard Google Cloud project** as the Hub's
   browser OAuth client (not an Apps Script default Cloud project).
4. Enable the Apps Script API in that Cloud project. Ensure the OAuth consent
   screen permits school users and includes the three manifest scopes. The
   school Workspace administrator may need to trust this internal app and
   permit Apps Script execution for students.
5. Deploy a version as an **API executable**, with domain-only access. Ensure
   authorised school users can execute that deployed version. This is not a
   public web app and must not run as its owner. The executing account must be
   able to access the script and its own source and destination Drive files.
6. Set `DOCUMENTATION_MERGE_SCRIPT_ID` on Render to the project's **Script ID**
   from Project Settings, not the deployment ID or a web-app URL. Restart or
   redeploy the Hub. Future script changes also need a new deployed version.
7. Test with a school test-student account that owns a
   `SeniorDTECH/Process Assessment` folder. Approve the extra presentation
   permission when prompted by Merge Documentation Deck.

Never deploy an unauthenticated endpoint that accepts Drive tokens, disable the
email checks, or use a teacher's identity to operate on every student's Drive.
The server forwards the student's OAuth token only to Google's Execution API;
tokens are not stored in the documentation record or Apps Script properties.

## Merge behaviour

- The Hub derives topic order from the selected Task List's rendered evidence
  links. Drive inventory order does not decide the documentation sequence.
- Only matching evidence decks within the existing Process Assessment tree are
  considered. Unrelated decks, the client presentation, existing full slide
  sets, and the master deck are excluded. Each source deck is included once at
  its first matching topic, preserving its own slide order.
- Apps Script independently verifies the school identity, folder ownership,
  SeniorDTECH parent, source membership, and generated-target marker.
- The master is saved directly in Process Assessment. User properties retain
  its ID for recovery if the Hub loses a response. Native source-presentation
  and source-slide IDs prevent repeat imports.
- Reopening a saved deck does not merge again. Add missing slides inserts only
  missing slides in the source order; it neither rewrites existing slides nor
  refreshes their content. Use Google Slides' linked-slide Update action to
  refresh content. Source edits override edits made directly to a linked slide
  when it is refreshed. Source deletions are not automatically mirrored.
- Missing evidence is listed without inserting blank slides. A partial merge or
  missing source decks prevents the generated deck's ready flag. Large merges
  can be continued through Add missing slides. Linking an existing assembled
  deck marks it ready after link/file validation, not content grading.

## Final Digital Outcome ZIP

The Stage 2 card below the divider packages the default branch's latest pushed
GitHub commit for the selected assessment. It does not access local or unpushed
work, run build commands, export a hosted website, or certify assessment completion.
The student must confirm that final changes are pushed before downloading.

Repositories must be saved as `GITHUB_REPO_URL|...` in that student's assessment
evidence, and a matching SeniorDTECH digital media allocation (91893 or 91903)
must exist. When there are several saved repositories the student selects one.
This confirms the saved assessment association, not GitHub account ownership.
Public repositories only are supported; the existing server `GITHUB_TOKEN` must
be configured for GitHub metadata requests. It is never sent to archive hosts.
Drive save uses the student's existing Google Drive permission, independently of
the Slides Apps Script deployment. No extra ZIP library or Apps Script is needed.

Download latest ZIP requests Google Drive permission first, pins a commit,
validates its tree, and obtains GitHub's archive for that exact commit. The same
action starts the browser download and automatically uploads those prepared bytes
to the student's owned `SeniorDTECH/Process Assessment` folder, after checking
its name, ownership and parent. A failed upload is reported separately from the
download, with Retry Google Drive save available for the same prepared ZIP.
No permissions are changed by these new endpoints.
The ZIP includes repository content, not a generated production build or external
assets. Submodules, Git LFS rules, export exclusions, and truncated trees are
rejected to avoid incomplete outcomes. These need manual packaging.

Prepared ZIPs are streamed to private temporary files, not whole-archive buffers.
The per-ZIP safety cap is 512 MiB and the per-process temporary-file budget is
1 GiB; Otto's measured 169.14 MiB archive fits within these bounds. Preparation
has a five-minute archive-transfer timeout. Builds are serialised per process.
Active download/upload leases protect files from eviction and expiry cleanup.
Idle files expire after one hour and are also evicted to make room. Periodic
cleanup removes expired files; partial files are deleted after failed preparation,
and startup cleanup removes app-owned files left by dead processes. Disk-full
errors are reported without recording a successful package.

ZIP downloads stream directly from disk through Express. The browser still
obtains a Blob for its local download, so client disk/memory capacity also matters.
Google Drive uploads use resumable sessions and 8 MiB chunks, never multipart
bodies containing the entire archive. A retry probes the server-acknowledged offset
before continuing the same file, including when the response to an accepted chunk
was lost. Completion requires a matching size and MD5 checksum. Session URLs are
kept in bounded process memory, not sent to the browser or logged; OAuth tokens
are supplied per request and are not stored in the session. A server restart loses
prepared snapshots/sessions: download a fresh ZIP; completed Drive files are
recognised by name and checksum rather than overwritten. Partial Google upload
sessions eventually expire on Google's side.

Multi-instance hosting requires shared temporary storage/session state or session
affinity. Monitor available ephemeral disk space, concurrent lease use, upload
duration and host/proxy request timeouts for the deployment. The latest saved
file link and full commit metadata persist in the
assessment's template-copy record. Earlier ZIP files remain in Drive; deterministic
repository/assessment/full-commit filenames make repeat saves reuse the same
version instead of replacing or duplicating it. Students should keep a repository
and its assets reasonably sized and check their final downloaded outcome.

Run `node scripts/regression-final-outcome-zip.js` for mocked archive, access,
destination ownership, expiration, missing-content, duplicate-save, disk-backed
170 MiB preparation, cleanup, resumable-offset, lost-response, and retry checks.
Before rollout, test a student download and Drive save against a public repository,
then push a new commit and check both Drive versions remain available. Verify
that download contents include the intended source files and assets. Download
initiation does not prove the browser has saved the file successfully.

### ZIP Size in Project Management

The Project Management GitHub tile also shows the compressed ZIP size of the
repository selected in Stage 2. A size check runs when its saved repository is
loaded, when the selection changes, and after Sync from GitHub. It does not alter
checkboxes, assessment completion, repository files, or Drive files. Multiple
saved repositories need an explicit Stage 2 selection. The hover title identifies
the repository, branch, commit and measurement time. Sizes use MiB (1,048,576 bytes).
The student tile displays size only, without packaging-limit warnings.

Size checks stream GitHub's commit-pinned archive without retaining its bytes.
Measurements are cached per repository/commit for five minutes, with at most 128
results per process. The current default-branch commit is checked before reusing
a cached measurement. Reads stop at 200 MiB and display a lower bound rather
than an invented exact size. Size checks time out after two minutes; unavailable
sizes show an error in their hover title and can be retried with GitHub sync.
This is distinct from GitHub's repository-storage size and is not a guarantee
that a repository has no submodules, Git LFS files, or missing external assets.

## Stage 3 Trello Report

The Trello Report card uses the student's existing Trello connection and the
`TRELLO_CARD_URL|...` links saved on the selected assessment. Card links resolve
to their boards; duplicate boards are deduplicated. Multiple boards require an
explicit selection. Access is checked using that student's Trello token on
generation, download and save. The token is never returned to the browser or
included in the report. This uses the existing `TRELLO_API_KEY`; there is no new
Trello credential or Apps Script deployment to configure.

Download Trello report requests Drive permission, reads live Trello data, creates
a PDF, starts its download and automatically saves the same bytes directly in
`SeniorDTECH/Process Assessment`. The sample `TeacherFiles/VP-TaskList - DTECH26.pdf`
informs the cover, summary counts, and card-detail structure. The report includes
board/student/export details, list and card totals, due-date counts, list names,
card names and descriptions, labels, dates, archived status, and Trello links.
Open and archived cards/lists are included, with list/card order preserved.
Comments, attachment contents and checklist items are not exported. It is a
current board snapshot, not an audit trail, evidence of authorship, or a grade.
Nothing is written to Trello.

The report is limited to 500 cards, 100 lists, 500,000 card-text characters and
10 MB. Oversized boards fail clearly instead of producing partial reports.
Prepared PDFs expire after 15 minutes/restart or bounded-cache eviction (20 MB
per server process). The same single-instance/shared-cache considerations as
the ZIP workflow apply. Each generation has a unique filename and retains older
reports in Drive. Retrying an upload reuses that same generated snapshot and
checksums any existing file before reusing it. Latest saved metadata persists
against the assessment and the saved link returns on reload.

Run `node scripts/regression-trello-report.js` for PDF text/pagination, source
selection, access, upload identity, saved state and frontend retry checks.
Before rollout, use a school student account to connect Trello, generate a
report, check descriptions and dates against the board, and confirm the Drive
file and downloaded PDF match. Live Trello/Drive authorisation is not covered
by mocked endpoint tests.

## Submission Stage

The final Submission Stage card always packages these four required assessment artifacts:

1. `01-Client-Presentation.pdf`
2. `02-Documentation.pdf`
3. `03-Digital-Outcome.zip`
4. `04-Trello-Report.pdf`

It also includes every saved PDF from Stage 6 as a separate
`05-Additional-Slideshow-<id>.pdf` entry. Stage 6 PDFs are optional, but when
present they are checked and included; an outdated or unverifiable saved PDF
blocks the package until it is regenerated.

Check files requests the student's existing Google Drive permission and validates
the four required Drive files and any saved Stage 6 PDFs (type, owner, folder,
size and checksum). It checks that each
file matches its generated checksum; older records without a checksum must have
a saved timestamp proving the Drive file has not changed, or need regeneration.
It also checks that each
PDF belongs to the currently linked slideshow and matches that source's version
and modified time. A partial/missing-evidence documentation merge is not ready.
The GitHub ZIP must belong to a saved assessment repository and match its current
default-branch commit. The Trello report must belong to a linked board and be no
older than its last activity. Trello comments or other board activity can therefore
require regenerating the report, even if card names are unchanged.

Build submission ZIP is enabled only after a successful check. The server repeats
validation before packaging, after assembly, before upload, and after upload.
Missing/stale files block the package rather than being skipped. Version changes
during a long build require another check/build. Files are streamed from Google
Drive into the ZIP with byte-count, file-signature and MD5 verification. The inner
GitHub ZIP remains intact; all entries use ZIP store mode rather than
recompressing already compressed files. No repository, board, slideshow or source
artifact is modified by building a package.

The streaming ZIP uses the same bounded temporary-file store and resumable Drive
uploader as Stage 2, including its 512 MiB archive cap, shared 1 GiB per-process disk
budget, one-hour expiry, leases, interruption recovery and multi-instance caveats.
A failed or changed-input build discards its temporary output. Every successful
build has a dated unique filename in `SeniorDTECH/Process Assessment`, retaining
earlier packages. Retry Google Drive save continues that same prepared package;
same-name complete files require matching checksums before reuse. Latest saved
package metadata persists with the exact package manifest and source versions.
If inputs change during upload, an older snapshot may remain in Drive but is not
recorded as the current saved package.

The saved link returns after reload; checks must be run again before building.
Saving new earlier-stage artifacts resets the local checked state. The result is
**package ready, not assessment submitted**. No school submission workflow, grade,
or completion tick is automatically changed. Linked Slides must still be updated
in Google Slides before exporting if their source content changed; the package
check cannot verify content that was never refreshed into the documentation deck.

Run `node scripts/regression-submission-package.js` for readiness, staleness,
exact archive entries, unchanged inner ZIP, corrupt-input rejection, authenticated
endpoint, saved-state, upload retry and 170 MiB streaming-package checks. A live
school-account check/build/upload is still needed before rollout. The ZIP writer
is the production `archiver` dependency; `jszip` is used only to inspect small test
archives, not for production package assembly.

## Linked Merge Verification

Run `node scripts/regression-documentation-deck.js` and
`node scripts/regression-middle-task-list.js` locally. The documentation suite
uses mocked Google services; it does not prove the deployment or OAuth settings.
Before rollout, test a first merge, repeat open, a newly added source slide,
linked-source Update in Google Slides, and Google Sync of a pre-existing deck.
Confirm that its original content remains untouched and that each student's
master belongs to their own Drive account.