# Staff student-work evidence packages

In **Student Work Tracker > Process Assessment**, each SeniorDTECH student's row has a **Package work set** button. **SeniorDTECH project work sets** appears beneath it for project allocations, including students who have no Process Assessment allocation. These rows do not alter assessment counts. Missing assessment records are not login-history evidence.

When searching by student name, matching project work appears immediately beneath the student search box, with its **Package work set** action. An empty assessment section means no matching assessment allocation, not no saved project work.

1. Select the student's assessment or project/task-list record. Opening from a project row preselects that project; the selector lists the student's allocated assessments and projects.
2. Optionally attach an already-downloaded OneDrive or other outcome ZIP (up to 64 MB). The ZIP is retained unchanged, not extracted or independently verified.
3. Choose **Build evidence pack** and allow access to your staff Google Drive account.
4. Review the included, missing and unavailable sources, then choose **Download ZIP** within 15 minutes.

This is a staff assessment-evidence snapshot, not the student's final-submission workflow. It does not change task ticks, grades, student readiness, saved Drive files or submissions, and does not send notifications. Missing work, including a missing client presentation, does not block a package. A package with no collectible files is rejected.

## Collected evidence

- Distinct linked task-list documents are exported using staff Drive access and merged into `Task-List-Documentation.pdf`. Original PDFs are also retained. Supported sources are Google Slides, Docs, Sheets and saved PDFs. Previously merged decks can overlap individual documents; the manifest explicitly notes this.
- Client presentations are kept separate when available.
- Saved PDFs are fallback sources if their corresponding live deck cannot be collected. Saved PDFs, outcome ZIPs and Trello reports are labelled as saved snapshots, not current-source verification.
- Linked public GitHub repositories use the existing outcome packager, including commit pinning and submodule/LFS/export-exclusion safeguards.
- A fresh Trello PDF is generated using the **staff member's** connected Trello account, including archived cards. Connect Trello in Settings and ensure the staff account can open the linked board. Student Trello credentials are not used.
- `Evidence-Manifest.json` and `READ-ME.txt` list collected files, source failures and missing components. `Task-List-Record.json` preserves the selected record's evidence/checklist and saved source links.

Sources must already be linked to the selected student's assessment or project. Private OneDrive folders are not fetched automatically: download the web files in OneDrive and attach that ZIP. Files in Google Drive must be shared with the staff account; this feature never impersonates the student or changes sharing.

## Access and limits

The API requires verified school Google identity and server-resolved staff permission; client email/role hints are not authorization. Drive tokens must belong to that same staff member. Downloads are scoped to that staff identity, student and assessment, with private/no-store caching. Withdrawn students can still be packaged from their retained Year 11-13 directory and allocation records.

Only one build runs at a time per server process. Limits: 60 Drive sources, 5 repositories, 10 Trello source links, 20 MB per PDF, 40 MB of source PDFs, 500 merged pages, 128 MB of buffered documents/attachments, and 256 MB per completed archive. Temporary server snapshots expire after 15 minutes and are pruned by the existing outcome archive store; downloads should be kept in the school's approved assessment storage.

Validation:

```powershell
node --test scripts\regression-staff-evidence-package.js scripts\regression-documentation-deck.js scripts\regression-submission-package.js
```
