# DTECH Hub auto-launch rollback script (user context)
# Intended for Intune remediation/uninstall deployment.

$ErrorActionPreference = "Stop"

$shortcutName = "DTECH Hub.lnk"
$startupFolder = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupFolder $shortcutName

$regPath = "HKCU:\Software\DTECHHub"
$regName = "StartupShortcutVersion"

try {
    if (Test-Path $shortcutPath) {
        Remove-Item -Path $shortcutPath -Force -ErrorAction Stop
    }

    if (Test-Path $regPath) {
        $regValue = Get-ItemProperty -Path $regPath -Name $regName -ErrorAction SilentlyContinue
        if ($null -ne $regValue) {
            Remove-ItemProperty -Path $regPath -Name $regName -ErrorAction SilentlyContinue
        }
    }

    if (Test-Path $regPath) {
        $remaining = Get-ItemProperty -Path $regPath
        $propertyNames = $remaining.PSObject.Properties.Name | Where-Object { $_ -notin @("PSPath", "PSParentPath", "PSChildName", "PSDrive", "PSProvider") }
        if (-not $propertyNames -or $propertyNames.Count -eq 0) {
            Remove-Item -Path $regPath -Force -ErrorAction SilentlyContinue
        }
    }

    Write-Output "DTECH Hub auto-launch rollback complete."
    exit 0
} catch {
    Write-Error "DTECH Hub auto-launch rollback failed: $($_.Exception.Message)"
    exit 1
}
