# TODO: DTECH Hub Auto-Launch on Windows 11 (Intune Rollout)

Purpose: Deploy DTECH Hub so it opens automatically for students on sign-in across all DTECH-managed Windows 11 desktops.

## 1) Confirm technical approach with SysAdmin
- [ ] Confirm using Intune + Microsoft Edge startup policies as the primary method.
- [ ] Confirm app-mode launch preference using `msedge.exe --app=<DTECH_HUB_URL>`.
- [ ] Confirm whether rollout should target user groups, device groups, or both.
- [ ] Confirm pilot scope (recommended: small class + selected staff).

## 2) Required information before deployment
- [ ] Final production URL for DTECH Hub.
- [ ] Intune group names for pilot and full rollout.
- [ ] Browser standard decision (Edge only, or Edge + Chrome support).
- [ ] Confirm desired behavior on every login:
  - [ ] Always open DTECH Hub app window.
  - [ ] Open only if not already running.

## 3) Intune policy configuration (Edge)
- [ ] Create Intune Settings Catalog profile for Microsoft Edge.
- [ ] Set startup action to open a list of URLs.
- [ ] Add DTECH Hub URL to startup URLs.
- [ ] Optional: enable running background apps when Edge is closed.
- [ ] Optional: enforce Edge profile sign-in for consistent SSO behavior.

## 4) Startup app-mode launcher (recommended)
- [ ] Deploy a user-context PowerShell script via Intune that:
  - [ ] Creates a Startup shortcut in each user profile.
  - [ ] Shortcut target launches: `msedge.exe --app=<DTECH_HUB_URL>`.
  - [ ] Adds idempotency marker (HKCU RunOnce flag or file marker).
  - [ ] Re-checks and re-creates shortcut if missing.
- [ ] Validate script execution permissions and signing requirements.

## 5) Authentication and account experience
- [ ] Confirm Microsoft account sign-in behavior in Edge.
- [ ] Confirm linked Microsoft/Google account flow works for DTECH Hub SSO.
- [ ] Confirm first-launch does not require repeated auth prompts.

## 6) Validation checklist (pilot)
- [ ] Fresh user sign-in opens DTECH Hub automatically.
- [ ] Restart/sign-out/sign-in repeats expected behavior.
- [ ] DTECH Hub opens reliably on different lab machines.
- [ ] No significant login delay introduced.
- [ ] No duplicate windows when users sign in repeatedly.
- [ ] Students can close and re-open DTECH Hub from desktop/start menu as needed.

## 7) Rollout and support
- [ ] Expand assignment from pilot to all DTECH Windows 11 desktops.
- [ ] Publish short student/staff note: "DTECH Hub now auto-opens at sign-in".
- [ ] Add helpdesk note for common issues:
  - [ ] Startup shortcut missing.
  - [ ] Browser profile not signed in.
  - [ ] Network/auth transient errors.

## 8) Optional enhancements (future)
- [ ] Evaluate true tray icon requirement (would require native app, not website-only).
- [ ] Consider packaging a lightweight desktop wrapper if tray controls are needed.
- [ ] Add monitoring/reporting for launch success rates through Intune reporting.

## 9) Security and governance checks
- [ ] Confirm policy aligns with school device governance and privacy expectations.
- [ ] Confirm URL allow-list and safe browsing policies include DTECH Hub domain.
- [ ] Confirm change window and rollback plan if pilot results are poor.

## 10) Rollback plan
- [ ] Remove Intune startup URL policy assignment.
- [ ] Remove/deactivate startup script assignment.
- [ ] Clean up user Startup shortcuts via remediation script if required.

---
Owner: DTECH
Reviewer: System Administrator
Status: Pending SysAdmin approval
Target term: TBC
