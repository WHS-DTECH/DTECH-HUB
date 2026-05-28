# TODO: DTECH Hub Auto-Launch Rollout (Windows 11 + Intune)

Purpose: Prepare an implementation plan for System Administrator review so DTECH Hub auto-launches for all DTECH desktops at Windows sign-in.

Status: Draft for review
Owner: DTECH Team + System Administrator

## 1) Confirm Scope and Targeting
- [ ] Confirm target device group(s) in Intune (all DTECH Windows 11 desktops).
- [ ] Confirm whether policy assignment should be device-based, user-based, or both.
- [ ] Confirm pilot ring (small class + staff) before full rollout.
- [ ] Confirm production DTECH Hub URL to launch.

## 2) Edge Policy (Primary Launch Method)
Create an Intune Settings Catalog profile for Microsoft Edge with:
- [ ] Startup action = Open a list of URLs.
- [ ] Startup URLs includes DTECH Hub production URL.
- [ ] Optional: Continue running background apps when Edge is closed (if desired).
- [ ] Optional: Force browser sign-in and sync policies if needed for SSO consistency.

Admin validation points:
- [ ] Confirm policy does not conflict with existing school startup browser policies.
- [ ] Confirm whether to apply only on shared lab desktops or all DTECH devices.

## 3) App-Like Launch Window (Optional but Recommended)
Use startup shortcut to run Edge app mode:
- Command format:
  msedge.exe --app=https://YOUR-DTECH-HUB-URL

- [ ] Confirm if app-mode window is preferred over normal browser tab launch.
- [ ] Confirm icon/branding requirements for shortcut name and icon.

## 4) Intune PowerShell Script (User Context)
Deploy a user-context script that creates a Startup shortcut once per user.

Script requirements:
- [ ] Runs in user context.
- [ ] Creates Startup folder shortcut to DTECH Hub app-mode command.
- [ ] Uses HKCU marker to avoid recreating on every sign-in.
- [ ] Recreates shortcut if deleted/corrupted.

Draft script (for SysAdmin review):

```powershell
$hubUrl = "https://YOUR-DTECH-HUB-URL"
$shortcutName = "DTECH Hub.lnk"
$startupFolder = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupFolder $shortcutName
$edgePath = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe"
}

$regPath = "HKCU:\Software\DTECHHub"
$regName = "StartupShortcutInstalled"

if (-not (Test-Path $regPath)) {
    New-Item -Path $regPath -Force | Out-Null
}

$needsCreate = $true
if (Test-Path $shortcutPath) {
    $needsCreate = $false
}

if ($needsCreate) {
    $wsh = New-Object -ComObject WScript.Shell
    $sc = $wsh.CreateShortcut($shortcutPath)
    $sc.TargetPath = $edgePath
    $sc.Arguments = "--app=$hubUrl"
    $sc.WorkingDirectory = Split-Path $edgePath
    $sc.Description = "Launch DTECH Hub"
    $sc.Save()
}

New-ItemProperty -Path $regPath -Name $regName -Value 1 -PropertyType DWord -Force | Out-Null
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

## 7) Full Rollout Gates
- [ ] Pilot success criteria documented and signed off.
- [ ] Expand assignment to all DTECH Windows 11 desktops.
- [ ] Monitor Intune deployment status and error reports.
- [ ] Confirm ongoing behavior after Windows and Edge updates.

## 8) Rollback Plan
- [ ] Remove/disable Edge startup policy profile.
- [ ] Unassign/remove startup shortcut script.
- [ ] Cleanup HKCU marker and Startup shortcut (if required).

## 9) Security and Governance Checks
- [ ] Confirm least-privilege principle (no admin rights needed for user startup shortcut).
- [ ] Confirm no unsupported browser extensions or elevated scripts are used.
- [ ] Confirm change record and approval in school IT process.

## 10) Final Decision Checklist for SysAdmin
- [ ] Approve Edge-only startup policy.
- [ ] Approve optional app-mode startup shortcut.
- [ ] Approve pilot group and rollout timeline.
- [ ] Approve rollback and support ownership.

---
Notes:
- A standard website cannot install a true Windows system tray icon by itself.
- If a tray icon is required later, that needs a separate native app deployment.
