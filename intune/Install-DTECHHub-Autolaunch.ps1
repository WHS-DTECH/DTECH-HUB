# DTECH Hub auto-launch install script (user context)
# Intended for Intune PowerShell script deployment.

$ErrorActionPreference = "Stop"

$hubUrl = "https://dtech-hub2.onrender.com"
$shortcutName = "DTECH Hub.lnk"
$startupFolder = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupFolder $shortcutName

$regPath = "HKCU:\Software\DTECHHub"
$regName = "StartupShortcutVersion"
$regValue = "1"

function Resolve-EdgePath {
    $candidates = @(
        "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
        "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe"
    )

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    return $null
}

try {
    if ([string]::IsNullOrWhiteSpace($hubUrl) -or ($hubUrl -notmatch "^https://")) {
        throw "Invalid hub URL. Use an https URL before deployment."
    }

    $edgePath = Resolve-EdgePath
    if (-not $edgePath) {
        throw "Microsoft Edge executable not found."
    }

    if (-not (Test-Path $regPath)) {
        New-Item -Path $regPath -Force | Out-Null
    }

    $expectedArgs = "--app=$hubUrl"
    $needsCreateOrRepair = $true

    if (Test-Path $shortcutPath) {
        try {
            $wshExisting = New-Object -ComObject WScript.Shell
            $existing = $wshExisting.CreateShortcut($shortcutPath)
            if (($existing.TargetPath -eq $edgePath) -and ($existing.Arguments -eq $expectedArgs)) {
                $needsCreateOrRepair = $false
            }
        } catch {
            $needsCreateOrRepair = $true
        }
    }

    if ($needsCreateOrRepair) {
        $wsh = New-Object -ComObject WScript.Shell
        $sc = $wsh.CreateShortcut($shortcutPath)
        $sc.TargetPath = $edgePath
        $sc.Arguments = $expectedArgs
        $sc.WorkingDirectory = Split-Path $edgePath
        $sc.Description = "Launch DTECH Hub"
        $sc.IconLocation = "$edgePath,0"
        $sc.Save()
    }

    if (-not (Test-Path $shortcutPath)) {
        throw "Shortcut creation/repair failed."
    }

    New-ItemProperty -Path $regPath -Name $regName -Value $regValue -PropertyType String -Force | Out-Null

    Write-Output "DTECH Hub auto-launch install complete."
    exit 0
} catch {
    Write-Error "DTECH Hub auto-launch install failed: $($_.Exception.Message)"
    exit 1
}
