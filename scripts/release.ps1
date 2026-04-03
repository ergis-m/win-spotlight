# Bump version, commit, tag, and push.
# Usage: .\scripts\release.ps1 [major|minor|patch]
#   Defaults to "patch" if no argument given.

param(
    [ValidateSet("major", "minor", "patch")]
    [string]$Level = "patch"
)

$ErrorActionPreference = "Stop"

# Read current version from tauri.conf.json (source of truth)
$conf = Get-Content "src-tauri/tauri.conf.json" -Raw | ConvertFrom-Json
$current = $conf.version

if (-not $current -or $current -notmatch '^\d+\.\d+\.\d+$') {
    Write-Error "Could not read version from src-tauri/tauri.conf.json"
    exit 1
}

$parts = $current.Split(".")
[int]$major = $parts[0]
[int]$minor = $parts[1]
[int]$patch = $parts[2]

switch ($Level) {
    "major" { $major++; $minor = 0; $patch = 0 }
    "minor" { $minor++; $patch = 0 }
    "patch" { $patch++ }
}

$new = "$major.$minor.$patch"

Write-Host "Bumping version: $current -> $new ($Level)"

# Update all version files
(Get-Content "package.json" -Raw) -replace "`"version`": `"$current`"", "`"version`": `"$new`"" |
    Set-Content "package.json" -NoNewline

(Get-Content "src-tauri/tauri.conf.json" -Raw) -replace "`"version`": `"$current`"", "`"version`": `"$new`"" |
    Set-Content "src-tauri/tauri.conf.json" -NoNewline

(Get-Content "src-tauri/Cargo.toml" -Raw) -replace "(?m)^version = `"$current`"", "version = `"$new`"" |
    Set-Content "src-tauri/Cargo.toml" -NoNewline

# Update Cargo.lock
Push-Location "src-tauri"
try { cargo generate-lockfile 2>$null } catch {}
Pop-Location

Write-Host "Updated files:"
Write-Host "  package.json"
Write-Host "  src-tauri/tauri.conf.json"
Write-Host "  src-tauri/Cargo.toml"

# Commit, tag, push
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "release: v$new"
git tag -a "v$new" -m "v$new"

# Push commit first to warm the cache, then push the tag
Write-Host ""
Write-Host "Pushing commit to main (warms cache)..."
git push

Write-Host "Waiting for cache-warm job to finish..."
Start-Sleep -Seconds 10

# Poll until the cache-warm run completes
$maxAttempts = 30
for ($i = 0; $i -lt $maxAttempts; $i++) {
    $run = gh run list --branch main --workflow "Build & Release" --limit 1 --json status,conclusion 2>$null | ConvertFrom-Json
    if ($run -and $run[0].status -eq "completed") {
        if ($run[0].conclusion -eq "success") {
            Write-Host "Cache warm completed successfully."
        } else {
            Write-Host "Warning: Cache warm finished with status: $($run[0].conclusion)"
        }
        break
    }
    Write-Host "  Still running... ($($i + 1)/$maxAttempts)"
    Start-Sleep -Seconds 15
}

Write-Host "Pushing tag v$new..."
git push origin "v$new"

Write-Host ""
Write-Host "Released v$new"
