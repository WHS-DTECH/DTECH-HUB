# TODO: AUTH_MODE Strict Cutover Plan

Purpose: Run controlled Hybrid validation on Thursday and Friday, then switch production to Strict on the weekend.

Status: Ready to execute
Owner: DTECH Team + SysAdmin
Reference: docs/SysAdmin-DTECH-Hub-Rundown.md (Strict cutover checklist)

## Schedule
- Thursday (Hybrid test day 1)
- Friday (Hybrid test day 2 + go/no-go)
- Weekend (Strict switch + monitoring)

## 0) Preconditions (Do Before Thursday)
- [ ] Confirm production env has `AUTH_MODE=hybrid`.
- [ ] Confirm `GOOGLE_ID_TOKEN_AUDIENCES` includes production OAuth client ID(s).
- [ ] Confirm `/api/health` returns:
  - [ ] `ok: true`
  - [ ] `auth_mode: "hybrid"`
  - [ ] `google_id_token_audiences_configured > 0`
- [ ] Confirm test accounts are ready:
  - [ ] 1 admin
  - [ ] 1 teacher
  - [ ] 1 student

## 1) Thursday - Hybrid Validation (Day 1)
- [ ] Sign in as teacher and test authenticated flows:
  - [ ] Upload Activity
  - [ ] Upload Assessment
  - [ ] Upload Project
  - [ ] Teacher project allocation
  - [ ] Teacher assessment allocation
  - [ ] Class Management
  - [ ] Browse Unit Plans (including resync/delete where permitted)
  - [ ] Browse Practicals tracker actions
- [ ] Sign in as student and test:
  - [ ] Activity detail interest toggle
  - [ ] Evidence/progress actions tied to allocated tasks
- [ ] Sign in as admin and test:
  - [ ] Assessment Standards manager
  - [ ] Admin maintenance pages used in normal operations
- [ ] Record pass/fail and exact route/page for any failure.

## 2) Friday - Hybrid Enforcement + Final Go/No-Go
- [ ] Re-run a short smoke test on all key flows above.
- [ ] Validate bearer enforcement behavior while still in Hybrid:
  - [ ] Invalid bearer token request returns `401 token_verification_failed`.
  - [ ] Header-only request path still works in Hybrid (temporary compatibility).
- [ ] Check production logs for repeated auth errors:
  - [ ] `missing_bearer_token`
  - [ ] `token_verification_failed`
- [ ] Go/No-Go decision by end of Friday:
  - [ ] GO if no critical auth blockers and no widespread auth error spikes.
  - [ ] NO-GO if any core teacher/admin/student flow fails.

## 3) Weekend - Strict Cutover Execution
- [ ] Set production env `AUTH_MODE=strict`.
- [ ] Deploy and verify release health.
- [ ] Confirm `/api/health` reports `auth_mode: "strict"`.
- [ ] Run immediate post-switch smoke tests:
  - [ ] Upload Activity/Assessment/Project
  - [ ] Teacher allocations
  - [ ] Activity detail interest actions
  - [ ] Class Management / Browse Unit Plans / Browse Practicals
  - [ ] Admin protected pages
- [ ] Observe logs during first post-switch window for auth error spikes.

## 4) Rollback (If Needed)
- [ ] Revert production env to `AUTH_MODE=hybrid`.
- [ ] Deploy rollback.
- [ ] Re-test critical flows.
- [ ] Triage failing frontend route(s), patch bearer header support, and re-schedule strict switch.

## 5) Sign-Off
- [ ] Weekend strict switch completed.
- [ ] Monday confirmation: no critical auth regressions reported.
- [ ] Mark this TODO complete.
