# DTECH Hub Tray App

This folder contains the native Windows tray companion app for DTECH Hub.

## Project

- Project path: `tray/DTECHHubTray/DTECHHubTray.csproj`
- Framework: .NET 8 Windows Forms
- Embedded browser: WebView2

## Features (MVP)

- Real system tray icon
- Double-click tray icon to open DTECH Hub
- Right-click tray menu:
  - Open DTECH Hub
  - Open And Sign In
  - Run At Startup (HKCU Run toggle)
  - Restart Tray App
  - Exit
- Single-instance guard
- Startup launch supports autologin URL

## Build

```powershell
dotnet build .\tray\DTECHHubTray\DTECHHubTray.csproj -c Release
```

## Run

```powershell
dotnet run --project .\tray\DTECHHubTray\DTECHHubTray.csproj
```

Optional args:

- `--open` open hub window on launch
- `--signin` open with `?autologin=1`
- `--autorun` startup mode (also opens with `?autologin=1`)

## Publish

```powershell
dotnet publish .\tray\DTECHHubTray\DTECHHubTray.csproj -c Release -r win-x64 --self-contained false
```

Published output is under:

- `tray/DTECHHubTray/bin/Release/net8.0-windows/win-x64/publish`
