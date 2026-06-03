# DTECH Hub Phase 2: Windows System Tray App Plan

Date: June 2026
Audience: DTECH Team + SysAdmin

## 1) Objective
Deliver a lightweight Windows desktop companion that provides:
- A persistent system tray icon
- One-click open/focus of DTECH Hub
- Auto-start at user sign-in
- Optional desktop notifications and quick actions

## 2) Why Phase 2
Current rollout uses Edge app-mode startup. This is good for fast launch, but it does not provide a true tray icon or background tray behavior.

## 3) Recommended Technical Approach
Recommended stack:
- .NET 8 WPF tray app (NotifyIcon)
- Microsoft Edge WebView2 runtime for in-app window hosting of `https://dtech-hub2.onrender.com`

Why this option:
- Native Windows tray support is straightforward and reliable
- Lower runtime footprint and simpler enterprise support than Electron
- Strong compatibility with Intune Win32 app deployment

Alternative options:
- Electron tray app: fastest for web developers, but larger memory/disk footprint
- Tauri tray app: small footprint, but adds Rust toolchain complexity

## 4) Functional Scope (MVP)
MVP features:
- Tray icon visible after user logon
- Left click: open/focus DTECH window
- Right click menu:
  - Open DTECH Hub
  - Restart app
  - Exit
- Auto-start at logon (single instance)
- Health check ping to app URL (optional status indicator)

Out of scope for MVP:
- Offline mode
- Full desktop notifications pipeline
- Deep native integrations beyond tray + launch

## 5) Authentication Model
- Keep existing website authentication (Google ID token flow) in web app
- Desktop tray app does not store privileged backend secrets
- If using WebView2 profile persistence, validate shared-device behavior (school policy)

Security constraints:
- No long-lived admin/service credentials in client app
- Signed binaries only
- Restrict update/install channel to Intune-managed packages

## 6) Deployment Model (Intune)
Package and delivery:
- Build signed Win32 package (`.intunewin`)
- Install in user context on shared devices
- Configure auto-start via app startup registration (not multiple methods)

Detection/health:
- File/version detection for installed app
- Optional registry marker `HKCU\\Software\\DTECHHubTray\\Version`

Rollback:
- Intune uninstall assignment removes app and startup registration

## 7) Operations and Support
Telemetry/logging (local):
- App start/stop events
- Launch failures (WebView2 missing, URL load failure)
- Optional log file in `%LOCALAPPDATA%\\DTECHHubTray\\logs`

Support playbook:
- Restart tray app
- Re-register startup
- Reinstall from Intune

## 8) Delivery Plan
Phase 2A (prototype, 2-4 days):
- Build tray app shell
- Open/focus DTECH window
- Single-instance + auto-start

Phase 2B (pilot, 3-5 days):
- Package for Intune pilot ring
- Validate shared-user behavior and sign-in UX
- Confirm no duplicate launch conflicts with existing startup method

Phase 2C (production, 2-3 days):
- Rollout to full target groups
- Monitor startup reliability and support tickets

## 9) Acceptance Criteria
- Tray icon appears for >= 95% of pilot users after sign-in
- Open/focus action works reliably in <= 2 clicks
- No duplicate launch windows in normal usage
- No critical auth regressions compared with current app-mode rollout

## 10) Decision Gate
Proceed with Phase 2 tray app only if one or more are true:
- School requires persistent tray presence for workflow visibility
- App-mode startup remains unreliable on key device cohorts
- Notification/control requirements exceed what browser app-mode can provide

If not required, keep current app-mode + auto-login prompt setup as the lower-maintenance baseline.
