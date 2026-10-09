# TODO: Practical Skills Licence Roadmap

This TODO captures the Practical Skills advice roadmap for building the DTECH-HUB version as a reusable template for other HUB sites.

## 1. Product Goal

- Build a Practical Skills Licence pathway where students progress through kits over time.
- Require selected kits before students can move to specific assessment tasks.
- Provide real-time student feedback and teacher visibility of gaps.
- Remove downtime by always showing students what to do next.

## 2. Student Experience (Must-Have)

- Add a `Next Best Task` panel at the top of the Practical Skills homepage.
- Show licence progress (`X/Y kits complete`).
- Show assessment readiness status (`Ready` or `Missing required kits`).
- Show a `Missing Before Assessment` section listing incomplete required kits.
- Add a `While You Wait` queue with short practical tasks.

## 3. Kit Detail / Checklist Behavior

- Implemented: Login Kit combines Google/Microsoft sign-in and opening Drive
  into one School Apps Explorer activity. Its interactive, keyboard-accessible
  word search teaches Docs/Word, Sheets/Excel, Slides/PowerPoint and Drive/OneDrive.
  Students find all eight names, set up Google Drive and confirm school Microsoft
  OneDrive access, then check answers to save a completion tick. Microsoft access
  is explicitly student-confirmed, not automatically verified.
  Microsoft opens the work/school Microsoft 365 portal; students choose Apps >
  OneDrive rather than relying on the failing direct OneDrive launch redirect.
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
- Implemented: Login Kit's `Password Problems` includes a Year 7/8 Password
  Detective activity with five problem/fix matches and five scenario questions.
  `Check my answers` returns helpful feedback and allows unlimited retries.
  The server checks all ten answers and atomically saves answers and the
  completion tick in the existing progress row when the score is 10/10.
  Manual completion is disabled for this self-marking activity. The built-in
  task is attached by worksheet title without replacing teacher-authored
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
