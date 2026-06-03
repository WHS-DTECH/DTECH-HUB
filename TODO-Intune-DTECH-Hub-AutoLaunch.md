# TODO: DTECH Hub Auto-Launch Rollout (Windows 11 + Intune)

Purpose: Prepare an implementation plan for System Administrator review so DTECH Hub auto-launches for all DTECH desktops at Windows sign-in.

Status: In progress with completed local pilot setup (updated June 2026)
Owner: DTECH Team + System Administrator

## Completed So Far (June 2026)
- [x] Production URL confirmed as `https://dtech-hub2.onrender.com`.
- [x] Startup shortcut app-mode command confirmed: `msedge.exe --app=https://dtech-hub2.onrender.com`.
- [x] Intune user-context install script prepared: `intune/Install-DTECHHub-Autolaunch.ps1`.
- [x] Intune rollback script prepared: `intune/Remove-DTECHHub-Autolaunch.ps1`.
- [x] Local Non-Intune Pilot setup command executed on laptop.
- [x] Local Startup shortcut validated (target + arguments).

## Confirmed Decisions (From DTECH Team)
- DTECH desktops are shared multi-user devices.
- Preferred assignment model is user-based targeting (students and staff who use DTECH rooms).
- Official launch experience should be Edge app-mode window for DTECH Hub.
- Primary objective: when students sign in to computing room desktops, DTECH Hub launches automatically and stays available for reminders/logging workflows.

## Critical Design Guardrail
Use one primary auto-launch method per target group to avoid duplicate windows/tabs at sign-in.

Recommended production choice (based on confirmed decisions):
- Primary: Startup shortcut script launching Edge app mode.
- Secondary/fallback only: Edge startup URL policy (disabled unless app-mode is unavailable).

## 1) Confirm Scope and Targeting
- [ ] Confirm target device group(s) in Intune (all DTECH Windows 11 desktops).
- [ ] Confirm user-based assignment groups for shared multi-user devices (students + staff).
- [ ] Confirm whether any device-based assignment is still required for room-specific controls.
- [ ] Confirm pilot ring (small class + staff) before full rollout.
- [x] Confirm production DTECH Hub URL to launch.

## 2) Edge Policy (Primary Launch Method)
Create an Intune Settings Catalog profile for Microsoft Edge as fallback control (not parallel primary launch) with:
- [ ] Startup action = Open a list of URLs.
- [ ] Startup URLs includes DTECH Hub production URL.
- [ ] Optional: Continue running background apps when Edge is closed (if desired).
- [ ] Optional: Force browser sign-in and sync policies if needed for SSO consistency.

Admin validation points:
- [ ] Confirm policy does not conflict with existing school startup browser policies.
- [ ] Confirm this policy remains disabled while app-mode startup shortcut is active.

## 3) App-Like Launch Window (Optional but Recommended)
Use startup shortcut to run Edge app mode:
- Command format:
    msedge.exe --app=https://dtech-hub2.onrender.com

- [x] Confirm if app-mode window is preferred over normal browser tab launch.
- [ ] Confirm icon/branding requirements for shortcut name and icon.

## 4) Intune PowerShell Script (User Context, Recommended Primary)
Deploy a user-context script that creates a Startup shortcut once per user.

Script requirements:
- [ ] Runs in user context.
- [ ] Creates Startup folder shortcut to DTECH Hub app-mode command.
- [ ] Uses HKCU marker to avoid recreating on every sign-in.
- [ ] Validates shortcut target + arguments and repairs if deleted/corrupted.
- [ ] Exits safely with clear logging if Edge executable is not found.
- [ ] Writes marker only after successful shortcut validation.
- [ ] Uses a versioned marker value to support future script upgrades.

Draft script (for SysAdmin review):

```powershell
$hubUrl = "https://dtech-hub2.onrender.com"
$shortcutName = "DTECH Hub.lnk"
$startupFolder = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupFolder $shortcutName
$edgePath = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe"
}

if (-not (Test-Path $edgePath)) {
    Write-Error "Microsoft Edge executable was not found. Shortcut not created."
    exit 1
}

$regPath = "HKCU:\Software\DTECHHub"
$regName = "StartupShortcutVersion"
$regValue = "1"

if (-not (Test-Path $regPath)) {
    New-Item -Path $regPath -Force | Out-Null
}

$expectedArgs = "--app=$hubUrl"
$needsCreate = $true

if (Test-Path $shortcutPath) {
    try {
        $wshRead = New-Object -ComObject WScript.Shell
        $existing = $wshRead.CreateShortcut($shortcutPath)
        if (($existing.TargetPath -eq $edgePath) -and ($existing.Arguments -eq $expectedArgs)) {
            $needsCreate = $false
        }
    } catch {
        $needsCreate = $true
    }
}

if ($needsCreate) {
    $wsh = New-Object -ComObject WScript.Shell
    $sc = $wsh.CreateShortcut($shortcutPath)
    $sc.TargetPath = $edgePath
    $sc.Arguments = $expectedArgs
    $sc.WorkingDirectory = Split-Path $edgePath
    $sc.Description = "Launch DTECH Hub"
    $sc.Save()
}

if (Test-Path $shortcutPath) {
    New-ItemProperty -Path $regPath -Name $regName -Value $regValue -PropertyType String -Force | Out-Null
} else {
    Write-Error "Shortcut creation/validation failed."
    exit 1
}
```

## 5) Authentication and SSO Validation
Given students have linked Microsoft + Google accounts:
- [ ] Confirm expected sign-in identity provider path for DTECH Hub.
- [ ] Confirm first-run behavior (silent SSO vs one-time prompt).
- [ ] Confirm cookie/session policies on shared desktops.

## 6) Pilot Test Plan
- [ ] Assign policy/script to pilot group.
- [ ] Reboot or sign out/sign in test users.
- [ ] Verify DTECH Hub launches automatically at sign-in.
- [ ] Verify correct account lands in DTECH Hub.
- [ ] Verify no duplicate windows/tabs across repeated sign-ins.
- [ ] Collect student/staff feedback.

Suggested measurable pilot success criteria:
- [ ] >= 95% successful auto-launch on first sign-in after policy apply.
- [ ] < 2% duplicate-launch events (two windows/tabs).
- [ ] >= 95% users reach DTECH Hub with expected account context.
- [ ] No critical support tickets for login loops or blocked startup.

## 7) Full Rollout Gates
- [ ] Pilot success criteria documented and signed off.
- [ ] Expand assignment to all DTECH Windows 11 desktops.
- [ ] Monitor Intune deployment status and error reports.
- [ ] Confirm ongoing behavior after Windows and Edge updates.

## 8) Rollback Plan
- [ ] Remove/disable Edge startup policy profile.
- [ ] Unassign/remove startup shortcut script.
- [ ] Cleanup HKCU marker and Startup shortcut (if required).

Rollback cleanup recommendation:
- [ ] Provide a user-context cleanup script to remove:
    - `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\DTECH Hub.lnk`
    - `HKCU:\Software\DTECHHub\StartupShortcutVersion`

## 9) Security and Governance Checks
- [ ] Confirm least-privilege principle (no admin rights needed for user startup shortcut).
- [ ] Confirm no unsupported browser extensions or elevated scripts are used.
- [ ] Confirm change record and approval in school IT process.

## 10) Final Decision Checklist for SysAdmin
- [ ] Approve app-mode startup shortcut as official experience.
- [ ] Approve Edge startup policy as fallback only (not simultaneous primary).
- [ ] Approve pilot group and rollout timeline.
- [ ] Approve rollback and support ownership.

## 11) Phase 1 vs Prompts Tradeoff (Detailed)
Question: Should rollout prioritize no prompts at login, even if that means dropping app-mode in phase 1?

Interpretation for this environment:
- If app-mode causes extra Google prompts or profile selection friction at sign-in, phase 1 can temporarily use a simpler launch path (standard Edge startup URL) to maximize reliability.
- If app-mode is stable in pilot (low prompt rate, low duplicate rate), keep app-mode as phase 1.

Decision rule:
- Keep app-mode in phase 1 if pilot meets success criteria.
- If pilot shows frequent prompt friction, launch with standard tab in phase 1, then re-introduce app-mode in phase 2 after policy/profile tuning.

Pilot decision matrix:

| Pilot observation | Prompt friction | Duplicate launches | Decision |
| --- | --- | --- | --- |
| App-mode launches cleanly for most users | Low | Low | Proceed with app-mode as phase 1 |
| App-mode works but occasional prompts are acceptable to teachers | Medium | Low | Proceed with app-mode and tune profile/sign-in settings |
| App-mode causes repeated account picker/sign-in interruptions | High | Low/Medium | Temporarily use standard Edge tab for phase 1 |
| Any method creates frequent duplicate windows/tabs | Any | High | Pause rollout and fix launch-policy overlap before continuing |

## 12) Local Non-Intune Pilot (Laptop)
You can test this on a single laptop before Intune by manually creating the same Startup shortcut in user profile:

1. [x] Confirm DTECH Hub production URL.
2. [x] Create shortcut in startup folder:
     - Path: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`
     - Target: `msedge.exe`
    - Arguments: `--app=https://dtech-hub2.onrender.com`
3. [ ] Sign out/sign in and confirm behavior.
4. Validate:
     - Single app window launch.
     - No duplicate tab + app windows.
     - Google sign-in behavior acceptable for student workflow.

Local pilot execution log:
- Date: 2026-06-03
- Executed: Startup shortcut creation command (user context)
- Result: Shortcut created at `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\DTECH Hub.lnk`
- Verified target: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`
- Verified arguments: `--app=https://dtech-hub2.onrender.com`

Optional one-time local command example:
```powershell
$startup = [Environment]::GetFolderPath("Startup")
$lnk = Join-Path $startup "DTECH Hub.lnk"
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe" }
$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut($lnk)
$sc.TargetPath = $edge
$sc.Arguments = "--app=https://dtech-hub2.onrender.com"
$sc.WorkingDirectory = Split-Path $edge
$sc.Save()
```

## 13) System Admin Technical Rundown (DTECH Hub)
- Google sign-in setup:
    - Frontend now uses Google Identity Services ID token credential flow for backend authorization.
    - Client stores auth profile in local storage (`hub_google_auth_v1`) with ID token-first behavior.
    - Backend authorization now validates Google ID bearer tokens server-side (hybrid mode currently active).
    - Access control is enforced in backend routes using school email/domain + role checks.
- What was used to build it:
    - Custom web app built with Node.js + Express backend and vanilla HTML/CSS/JavaScript frontend.
- Tech stack:
    - Backend: Node.js, Express, pg (PostgreSQL client), multer, mammoth, nodemailer, optional pdf parsing.
    - Frontend: static pages and page-level JavaScript modules.
    - Hosting/deploy: Render web service.
- Database:
    - PostgreSQL via `DATABASE_URL`.
- HTTPS handling:
    - HTTPS termination is handled by Render (managed TLS for hosted endpoint).
- Internet access requirements:
    - Required externally: Google sign-in APIs, Google userinfo endpoint, and hosted DTECH Hub URL.
    - Optional/feature-based external access: NZQA lookups, Trello integration, external staff directory API.
    - Core internal usage pattern: app can run for internal school users, but Google sign-in and any enabled external integrations still require wider internet access.

## 14) Handoff Artifacts Added
- SysAdmin one-page brief:
    - `docs/SysAdmin-DTECH-Hub-Rundown.md`
- Production Intune install script (user context):
    - `intune/Install-DTECHHub-Autolaunch.ps1`
- Production Intune rollback script (user context):
    - `intune/Remove-DTECHHub-Autolaunch.ps1`
- Security hardening plan (server-side Google ID token verification):
    - `docs/Google-Identity-Hardening-Plan.md`

---
Notes:
- A standard website cannot install a true Windows system tray icon by itself.
- If a tray icon is required later, that needs a separate native app deployment.
