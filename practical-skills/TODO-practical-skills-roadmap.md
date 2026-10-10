# TODO: Practical Skills Licence Roadmap

This TODO captures the Practical Skills advice roadmap for building the DTECH-HUB version as a reusable template for other HUB sites.

## 1. Product Goal

- Build a Practical Skills Licence pathway where students progress through kits over time.
- Require selected kits before students can move to specific assessment tasks.
- Provide real-time student feedback and teacher visibility of gaps.
- Remove downtime by always showing students what to do next.

## 2. Student Experience (Must-Have)

- Implemented: the student dashboard is now My DTECH-HUB Licence, with the
  school logo, a server-derived holder name (using the certificate identity
  lookup), saved completed-kit stamps and links to each earned certificate.
  The next uncompleted kit is recommended without locking other kits.
  Existing points, tiers, badges and progress controls are retained.
  Student navigation uses Licence / My Licence / Licence Library; the existing
  Years 11-13 Task List branch and API/storage identifiers remain unchanged.
  Signed-out, loading and error states do not display another account's awards.
- Implemented: the shared signed-in navigation shows Licence for every account
  in blue. Years 11-13 students also see a separate green Task List button;
  it no longer replaces Licence or appears duplicated in Browse.
- Implemented: administrators can open the existing Kit Content Builder /
  uploader from the Licence menu's Upload Kits item. The link is hidden from
  non-administrator accounts, matching the uploader's API access control.
- Implemented: the Kit Content Builder Year Level is a dropdown defaulting to
  All Years, with Junior, Middle and Senior DTECH group options, individual
  Years 7-13 DTECH options, and Staff. Existing saved values outside the list
  remain selectable as a preserved current value rather than being discarded.
- Implemented: text-entry fields across the Kit Content Builder and Worksheet
  Details editor no longer have browser-enforced character limits. This includes
  kit identity/theme, instructions, teacher notes, learning/completion text,
  worksheet topic/description, questions and images configured in Activity
  Details. Values continue through the existing preview and save paths.
- Implemented: the Kit Worksheets editor lets teachers hide and restore
  worksheets, preserving their details, activity indexes and student progress.
  Hidden worksheets do not appear to students or count toward kit completion.
- Implemented: the Kit Worksheets editor includes a saved Interactive element
  field after What it establishes; student activity cards display this detail.
- Implemented: Search Like a Pro Mission 1 is the Penguin Mystery. Students
  search with any search engine for another name for New Zealand's little blue
  penguin, with a local illustration; the old Google-open confirmation is
  removed and does not count as evidence.
- Implemented: the Kit Worksheets editor displays a teacher suggestion to
  structure the first activities as foundational skills, middle activities as
  applied skills, and final activities as integrated challenges.
- Implemented: Kit Name is the single source for the student-facing kit/banner
  title and updates that kit's Kit dropdown label after content loads or saves.
  Existing kit IDs remain unchanged so worksheet content and student progress
  remain attached to their kit.
- Implemented: saving kit content creates or updates its matching Practical
  Skills / Licence Library card, linked to that kit's worksheet page. Existing
  card descriptions, audience, category, status and visuals are preserved when
  updating a card title/link. Search Kit has been added to the starter library.
- Add a `Next Best Task` panel at the top of the Practical Skills homepage.
- Show licence progress (`X/Y kits complete`).
- Show assessment readiness status (`Ready` or `Missing required kits`).
- Show a `Missing Before Assessment` section listing incomplete required kits.
- Add a `While You Wait` queue with short practical tasks.

## 3. Kit Detail / Checklist Behavior

- Kits with visible activities now complete automatically from saved activity
  ticks, excluding hidden worksheets and merged activities. The last activity
  check, manual activity completion, progress reload and checklist refresh all
  synchronise the kit state. The award date is retained across reloads; undoing
  an activity removes kit completion without clearing the other activity ticks.
  Reset clears the award and activity ticks. Empty kits are not auto-awarded.
  Manual whole-kit completion cannot bypass unfinished visible activities.
- Completed kits show a personalised Certificate of Completion below the
  student activity list. First and last names come from verified Google identity,
  then the matching staff directory or latest linked student profile. The school
  email is used only when neither source has a name. Certificates include kit title,
  activity count and the persisted completion date in New Zealand time.
  The circular reo school logo appears on-screen, in print and in PDF copies.
  Print / Save as PDF prints only the certificate on A4 landscape; Download PDF
  supplies a one-page server-generated landscape PDF with embedded Unicode
  fonts, including macrons. Email me a copy uses the existing hub SMTP/email-log
  service to send that PDF only to the signed-in student's school email.
  Students can forward the email to share it. Email is explicit, not automatic,
  and repeat sends have a one-minute cooldown. Incomplete kits cannot download
  or email a certificate; errors are displayed without claiming success.
- Login Kit shows five tasks: school identity, Google/Microsoft and Drives,
  Password Problems, DTECH Learning Site, and Using your login details (formerly
  Open Kamar & Hapara). Other worksheets are hidden, not deleted or reindexed;
  their saved answers/ticks remain intact, but do not count in the activity list.
  Old hidden activity URLs open the kit list; the merged Drive URL still opens
  the combined sign-in activity. The overall kit remains named Login Kit.
  Using your login details displays equal-width, aligned three-column website cards:
  Tinkercad, SketchUp Education and Gamefroot for JuniorDTECH (Years 7/8);
  Code Avengers and CodeCombat for MiddleDTECH (Years 9/10). Official brand
  images/icons open websites or teacher-configured class links in new tabs.
  Legacy question data is preserved but not displayed in this activity.
  Completion is earned by correctly checking every visible site's questions,
  not automatically inferred from opening links. Hidden sites and sites without
  questions do not count. If no visible site has questions, manual completion
  remains available. Completion is persisted using existing activity progress.
  Reopening an incomplete activity rechecks saved app answers against the latest
  server configuration, awarding missing ticks for previously correct responses.
  A visible Check Activity Completion button also grades the current fields;
  incomplete checks name the apps still needing correct answers. Saved readiness
  flags alone are never trusted to award completion.
  The staircase loads the signed-in user's server-derived year profile. Years
  7/8 see only the three JuniorDTECH sites; MiddleDTECH and staff retain all five.
  Without a linked year profile, the general list remains visible.
  Tinkercad now uses the supplied class link and a quick three-design-area
  question under its stair. Server marking saves the answer and site readiness
  tick in login-sites-readiness-v1 responses; the whole activity tick is awarded
  when all visible question-bearing sites are correct. Readiness answers
  are evidence, not direct verification of third-party sign-in sessions.
  Code Avengers retains its generic link and adds a Pro > Python > Python 1
  topic-name check (Variables, If Statements and Loops), without starting a course.
  Both site answers are submitted together so checking one preserves the other;
  ticks are recalculated server-side, accepting singular/plural Variable.
  SketchUp retains the generic education link. Four teacher-supplied tool
  pictures have adjacent answer fields: Rectangle, Move, Push/Pull and Line.
  Students hover over toolbar icons, without drawing. Each tool receives server
  feedback; all four correct saves the SketchUp site tick alongside existing
  site evidence. Capitalisation, optional "tool" and Push/Pull separators are
  ignored. Image labels and filenames do not reveal the answer.
  CodeCombat uses the supplied ShortDrawFast class link and asks for the
  programming language shown beside WHS-DTECH under Current Classes (Python).
  A correct answer saves its readiness tick without starting a level. Gamefroot
  remains a generic link with no question and does not block automatic completion.
- Implemented: `teacher-login-sites.html` provides staff-only settings for
  Using your login details, linked from the staff activity toolbar and Activity
  Details. Teachers can add websites, edit names, descriptions, course/year
  labels, HTTPS website/class links, logo images, questions, hints and accepted
  answers (including the existing SketchUp tool pictures). Choose exact-answer
  alternatives or all required terms, one per line. Questions can be disabled.
  Separate Junior, Middle, Senior and Staff switches control each website;
  Hide from everyone overrides all levels. No selected levels also hides a site.
  Sites remain stored when hidden and existing student evidence is preserved.
  Unknown year profiles retain the non-globally-hidden list with selected levels.
  Staff authorization uses the existing Practical Schedule permission helper.
  Answer keys are removed from student content and marking uses the latest saved
  configuration and server-derived profile. Settings persist in existing kit
  content storage; students reload to see edits. No new database table is needed.
- Implemented: Open DTECH Learning Site / Open DTECH-HUB in the Login Kit now
  includes a five-island pirate-map treasure hunt. Students follow Westland High
  Website > Intranet > Learning Sites, visit Science, Mrs O'Malley's English,
  Food & Hospitality, Physical Education, then the main DTECH site.
  The pathway stays below the Set sail heading as a high-contrast navy-and-gold
  numbered route, stacking vertically on mobile without sideways scrolling.
  DTECH Treasure Island also has a standout Google shortcut box: students can
  bypass the school pathway by searching Pringle DTECH, with a new-tab search
  link and guidance to choose the school's DTECH - Miss Pringle result.
  The original decorative SVG map has a dotted trail, compass, ship and X marks;
  the responsive cards retain readable labels and keyboard-accessible links.
  School Google authentication may be required by linked sites.
  Server marking checks five page clues, the selected year/course against the
  latest linked User Profile timetable record, and two course-page clues (8/8
  saves a tick). Junior Years 7/8 find Digital Skills and STEAM Project; Middle
  Years 9/10 find Office and Adobe Suite plus a topic; senior DTECH and Computing
  use their own verified page questions.
  The course selector groups MiddleDTECH as Year 9/10 after Year 8
  and adds Year 11/12/13 SeniorDTECH before Year 11. Grouped choices validate
  the student's year and programme; specific MDTECH, MPROG, DTECH and COMP
  choices remain. Saved year-specific MiddleDTECH answers reopen in the grouped
  choice and remain markable. Missing/conflicting profiles cannot
  earn a tick and receive explicit teacher-help feedback. The endpoint only
  returns the signed-in student's own course information, never a student list.
  Staff can choose Staff and complete the same eight-mark hunt using JuniorDTECH
  clues. Both profile loading and marking confirm staff access server-side via
  the existing Practical Schedule staff/role permission helper; selecting Staff
  or supplying staff status in a request does not grant access to students.
  Existing teacher questions/images, answers and activity indexes are preserved.
  Page clues and links are defined in `learning-sites-assessment.js`, reviewed
  on 9 October 2026; update their marking keys when source pages change (especially
  the Food Technology year). Correct answer keys are not sent to student content.
- Implemented: Login Kit combines Google/Microsoft sign-in and opening Drive
  into one School Apps Explorer activity. Its interactive, keyboard-accessible
  word search teaches Docs/Word, Sheets/Excel, Slides/PowerPoint and Drive/OneDrive.
  Students find all eight names, set up Google Drive and confirm school Microsoft
  OneDrive access, then check answers to save a completion tick. Microsoft access
  is explicitly student-confirmed, not automatically verified.
  Microsoft opens the school-specific OneDrive at
  `https://westlandhigh-my.sharepoint.com/`, not the Microsoft 365/Copilot homepage
  or the failing generic OneDrive launch redirect. No teacher email hint or
  temporary authentication parameters are included. Microsoft handles sign-in
  using each student's own school account.
  Successful Google setup opens WHS-DTECH in a separate tab, reserved during the
  setup click. If blocked or closed, the visible folder link remains available.
  The Login Kit reuses the hub's Google Drive consent flow but calls a separate
  setup endpoint that creates/reuses only `My Drive/WHS-DTECH`, with anyone-with-
  the-link Editor access. Students are warned to store class work only.
  Setup is stored separately in `student_login_drive_setup`; it does not create
  senior folders or unlock the senior Template Library. The homepage Drive Ready
  button and its existing SeniorDTECH/Process Assessment setup are unchanged.
  The old Drive worksheet is hidden in the student overview and its URL opens
  the combined activity. Its content, answer keys and indexes remain intact;
  no existing student responses or activity ticks are deleted/reindexed.
- Implemented: students self-mark each worksheet using `Mark Activity Complete`.
  The kit overview shows saved completion ticks and a completed-activity count.
  Activity completion timestamps are stored per student and kit in
  `practical_skills_progress.completed_activities` (JSONB), separately from answers.
  Students can undo an activity completion; resetting the kit clears its activity ticks
  without deleting answers. Kit-level points and badges remain separately awarded
  through the existing kit completion action.
  The activity's `Completed` status is a keyboard-accessible link back to that
  kit's activity menu. `Not Completed` is not a link; undo remains separate.
  Activity pages use one top-bar Back to Kit Activity List link instead of
  separate checklist and All activities links. The kit activity list retains
  Back to Checklist in that same top-bar position.
- Implemented: Login Kit's `Password Problems` includes a Year 7/8 Password
  Detective activity with five problem/fix matches and five scenario questions.
  `Check my answers` returns helpful feedback and allows unlimited retries.
  The server checks all ten answers and atomically saves answers and the
  completion tick in the existing progress row when the score is 10/10.
  Manual completion is disabled for this self-marking activity.
  The activity includes a prominent, static branded reminder: one school username,
  with KAMAR/Google sharing a password and Microsoft/Computer Room Windows PCs
  using the Microsoft password. Changing KAMAR/Google does not update Microsoft;
  students may have two passwords and should ask school IT to reset the right
  account. The panel uses inline Google/Microsoft/Windows marks and a KAMAR
  text badge, responsive group cards and high-contrast colours without flashing.
  It does not change the assessment score or require students to enter passwords.
  The built-in task is attached by worksheet title without replacing teacher-authored
  questions/images, and survives saving in Activity Details.
- Support evidence capture where needed (text, link, or image).
- Implemented: Login Kit Activity 1 builds from first name and last name to
  username and school email. Its WHS guide explains the `firstinitial_lastname`
  pattern, removing surname hyphens, and assigned numeric
  suffixes. Existing username answer IDs are retained. The versioned content
  update replaces the legacy three-question activity once, preserves images,
  and allows subsequent teacher edits without reseeding the questions.
- Activity 1 is self-marking against the verified Google account's given name,
  family name and actual email/username (not a generated WHS username).
  Feedback appears after a pause in typing, with a retry button for connection
  errors. All four correct answers atomically save a completion tick. Case and
  surrounding whitespace are ignored; surname punctuation and username suffixes
  must match. Missing Google name fields require help from school IT rather than
  guessing a name from the email. Google token verification must be configured
  on the server for these checks.
- Activity 1 includes a visible Google ID sign-in/verification button even when
  the hub already shows a signed-in account. Verification is step 5, after the
  four answer fields and before the marking message and `Check your answers`,
  immediately when the worksheet opens (not only after an answer check).
  Typed answers are retained
  when re-verifying the same account; switching accounts loads that account's
  own progress. Live checks wait until a Google ID token is available.
  This uses the Google Identity
  Services button, rather than the hub's OAuth access-token popup. Changed
  credentials reload the worksheet's saved account-specific progress.
- Use clear kit states:
  - `not_started`
  - `in_progress`
  - `verify_pending`
  - `competent`
- Show immediate feedback after each update:
  - completion state
  - readiness impact
  - next recommended kit

## 4. Teacher Visibility (Live Board)

- Add class board with traffic-light readiness:
  - Green: assessment-ready
  - Amber: nearly ready
  - Red: blocked by missing kits
- Add filters:
  - blocked students
  - awaiting verification
  - idle students (no progress in set window)
- Add student drill-down with:
  - missing kits
  - last activity time
  - suggested next task

## 5. Rules Engine (Assessment Gating)

- Create assessment unlock rules tied to required kits.
- Support both:
  - strict requirements (`A and B and C`)
  - optional pathways (`A or B`)
- Add expiry/refresh rules for safety-critical kits.
- Allow teacher override where appropriate.

## 6. Suggested Data Model

- `kit_definitions`
  - id, title, area, checklist_steps, verification_required, evidence_mode
- `licence_paths`
  - id, class_level, ordered_kit_ids, prerequisite_rules
- `assessment_gates`
  - assessment_id, required_kit_ids, optional_groups, override_allowed
- `student_kit_progress`
  - student_id, kit_id, state, self_checks, evidence, teacher_verified_by, updated_at
- `student_next_task`
  - student_id, recommended_kit_id, reason, generated_at

## 7. Real-Time Update Logic

- On each checklist update:
  - recalculate kit state
  - recalculate assessment readiness
  - recalculate next best task
  - update student page and teacher board
- Start with polling for simplicity, then move to push updates if needed.

## 8. MVP Rollout Plan

- Phase 1 (pilot class):
  - 8-12 kits
  - 1 assessment gate
  - student homepage readiness panel
- Phase 2:
  - teacher verification workflow
  - class live board filters
- Phase 3:
  - while-you-wait recommendations
  - rule tuning based on classroom behavior
- Phase 4:
  - replicate module to other HUB sites using this folder template

## 9. Success Measures

- `% students with a clear next task`
- `average downtime minutes`
- `blocked -> ready turnaround time`
- `assessment readiness rate`
- `off-task incidents per lesson`

## 10. Reuse Checklist For Other HUB Sites

- Copy the full `practical-skills/` folder.
- Copy server endpoints and `PRACTICAL_SKILLS_LIBRARY_FILE` config.
- Update nav/admin links to module paths.
- Seed local `library.json` with site-specific kits.
- Keep auth checks on admin endpoints.
