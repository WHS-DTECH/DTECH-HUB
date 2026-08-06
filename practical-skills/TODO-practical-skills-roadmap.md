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

- Add checklist steps per kit with self-marking.
- Support evidence capture where needed (text, link, or image).
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
