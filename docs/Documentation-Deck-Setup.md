# Submission Documentation Deck

The Task List's Preparing for Final Submission card is separate from the client
presentation. It offers linked merging or Google Sync for an existing written
documentation deck. Linking an existing deck does not move or edit its slides.
Deck-ready state is preparation for Stage 3, not a final submission or an
assessment grade. Stage 3 itself is not implemented by this change.

## Existing decks

Google Sync validates the Google Slides link and stores it against the signed-in
student and selected assessment. Previously linked full slide sets are recognised
as existing documentation. They are not automatically rebuilt. A manually
assembled deck cannot be used as the target of Add missing slides.

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
action starts the browser download and automatically uploads those cached bytes
to the student's owned `SeniorDTECH/Process Assessment` folder, after checking
its name, ownership and parent. A failed upload is reported separately from the
download, with Retry Google Drive save available for the same prepared ZIP.
No permissions are changed by these new endpoints.
The ZIP includes repository content, not a generated production build or external
assets. Submodules, Git LFS rules, export exclusions, truncated trees, and archives
over 25 MB are rejected to avoid incomplete outcomes. These need manual packaging.

Prepared ZIPs expire after 15 minutes, on server restart, or on bounded-cache
eviction. Download a fresh ZIP before saving if it expires. Cache limits are
50 MB per server process, with archive builds serialised per process; multi-instance
hosting may require shared snapshot storage or session affinity. Tokens are not
stored. The latest saved file link and full commit metadata persist in the
assessment's template-copy record. Earlier ZIP files remain in Drive; deterministic
repository/assessment/full-commit filenames make repeat saves reuse the same
version instead of replacing or duplicating it. Students should keep a repository
and its assets reasonably sized and check their final downloaded outcome.

Run `node scripts/regression-final-outcome-zip.js` for mocked archive, access,
destination ownership, expiration, missing-content, and duplicate-save checks.
Before rollout, test a student download and Drive save against a public repository,
then push a new commit and check both Drive versions remain available. Verify
that download contents include the intended source files and assets. Download
initiation does not prove the browser has saved the file successfully.

## Linked Merge Verification

Run `node scripts/regression-documentation-deck.js` and
`node scripts/regression-middle-task-list.js` locally. The documentation suite
uses mocked Google services; it does not prove the deployment or OAuth settings.
Before rollout, test a first merge, repeat open, a newly added source slide,
linked-source Update in Google Slides, and Google Sync of a pre-existing deck.
Confirm that its original content remains untouched and that each student's
master belongs to their own Drive account.