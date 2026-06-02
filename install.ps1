# ============================================================
#  Vivaldi Dynamic Island - Installer Script
#  Run this as Administrator in PowerShell after each Vivaldi update
# ============================================================

param (
    [string]$VivaldiPath = ""
)

# --- Auto-detect Vivaldi installation -----------------------
if (-not $VivaldiPath) {
    $candidates = @(
        "C:\VivaldiBrowser\Application",
        "C:\Users\Akshar Srijan\Vivaldi",
        "C:\Users\Akshar Srijan\Documents\Vivaldi",
        "C:\Users\Akshar Srijan\Desktop\Vivaldi",
        "C:\Users\Akshar Srijan\Desktop\Vivaldi\Application",
        "$env:LOCALAPPDATA\Vivaldi\Application",
        "$env:ProgramFiles\Vivaldi\Application",
        "${env:ProgramFiles(x86)}\Vivaldi\Application"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { $VivaldiPath = $c; break }
    }
}

if (-not $VivaldiPath -or -not (Test-Path $VivaldiPath)) {
    Write-Error "Could not find Vivaldi installation. Pass -VivaldiPath explicitly."
    exit 1
}

Write-Host "Killing Vivaldi..." -ForegroundColor Cyan
Stop-Process -Name vivaldi -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# --- Find latest version folder -----------------------------
$versionFolder = Get-ChildItem $VivaldiPath -Directory |
    Where-Object { $_.Name -match '^\d+\.\d+\.\d+\.\d+$' } |
    Sort-Object { [version]$_.Name } -Descending |
    Select-Object -First 1

if (-not $versionFolder) {
    Write-Error "No versioned subfolder found in $VivaldiPath"
    exit 1
}

$resourcesDir = Join-Path $versionFolder.FullName "resources\vivaldi"
Write-Host "Target directory: $resourcesDir" -ForegroundColor Cyan

if (-not (Test-Path $resourcesDir)) {
    Write-Error "Resources directory not found: $resourcesDir"
    exit 1
}

# --- Copy mod files -----------------------------------------
$scriptDir = Split-Path $MyInvocation.MyCommand.Path -Parent

$filesToCopy = @("dynamic-island.js", "content-bridge.js")

foreach ($f in $filesToCopy) {
    $src = Join-Path $scriptDir $f
    if (-not (Test-Path $src)) {
        Write-Error "Source file not found: $src"
        exit 1
    }
    Copy-Item $src $resourcesDir -Force
    Write-Host "Copied $f" -ForegroundColor Green
}

# --- Patch window.html --------------------------------------
$windowHtml = Join-Path $resourcesDir "window.html"

if (-not (Test-Path $windowHtml)) {
    Write-Error "window.html not found at: $windowHtml"
    exit 1
}

# Backup first (only once)
$backupPath = $windowHtml + ".backup"
if (-not (Test-Path $backupPath)) {
    Copy-Item $windowHtml $backupPath
    Write-Host "Backed up window.html to window.html.backup" -ForegroundColor Yellow
}

$content = Get-Content $windowHtml -Raw -Encoding UTF8

# Build tag as a plain string - no interpolation needed
$scriptTag = '<script src="dynamic-island.js"></script>'

if ($content -match [regex]::Escape($scriptTag)) {
    Write-Host "dynamic-island.js already injected in window.html - skipping." -ForegroundColor Yellow
} else {
    # UPGRADE: Use Regex to dynamically locate the closing body tag regardless of whitespace
    $newContent = $content -replace '(?i)<\/body>', "$scriptTag`r`n</body>"
    [System.IO.File]::WriteAllText($windowHtml, $newContent, [System.Text.Encoding]::UTF8)
    Write-Host "Patched window.html successfully with Regex parsing." -ForegroundColor Green
}

Write-Host ""
Write-Host "[OK] Installation complete! Restart Vivaldi to activate the Dynamic Island." -ForegroundColor Green
Write-Host ""
Write-Host "     Hover the pill at the top-center of the browser window" -ForegroundColor Gray
Write-Host "     whenever media is playing to expand the controls." -ForegroundColor Gray

# ══════════════════════════════════════════════════════════════
#  Relaunch Vivaldi (Dropping Admin Privileges)
# ══════════════════════════════════════════════════════════════
Write-Host "Relaunching Vivaldi..." -ForegroundColor Cyan

# Ensure we extract the pure directory or executable path correctly
if ($vivaldiExe -and (Test-Path $vivaldiExe)) {
    # Call explorer.exe to spawn Vivaldi under your standard user token
    Start-Process "explorer.exe" -ArgumentList "`"$vivaldiExe`""
    Write-Host "Vivaldi successfully launched." -ForegroundColor Green
} else {
    Write-Warning "Could not automatically restart Vivaldi. Please open it manually."
}


