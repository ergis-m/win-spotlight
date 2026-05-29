#!/usr/bin/env bash
# Bump version, commit, tag, and push.
# Usage: ./scripts/release.sh [major|minor|patch]
#   Defaults to "patch" if no argument given.

set -euo pipefail

LEVEL="${1:-patch}"

if [[ "$LEVEL" != "major" && "$LEVEL" != "minor" && "$LEVEL" != "patch" ]]; then
  echo "Usage: $0 [major|minor|patch]"
  exit 1
fi

# Read current version from tauri.conf.json (source of truth)
CURRENT=$(grep -oP '"version":\s*"\K[0-9]+\.[0-9]+\.[0-9]+' src-tauri/tauri.conf.json)

if [[ -z "$CURRENT" ]]; then
  echo "Error: could not read version from src-tauri/tauri.conf.json"
  exit 1
fi

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case "$LEVEL" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
esac

NEW="${MAJOR}.${MINOR}.${PATCH}"

echo "Bumping version: $CURRENT -> $NEW ($LEVEL)"

# --- Update CHANGELOG.md ----------------------------------------------------
# Promote the [Unreleased] section to the new version, leave a fresh empty
# [Unreleased] in its place, and refresh the compare links at the bottom.
REPO="https://github.com/ergis-m/win-spotlight"
DATE=$(date +%Y-%m-%d)

if [[ -f CHANGELOG.md ]]; then
  if ! grep -q '^## \[Unreleased\]' CHANGELOG.md; then
    echo "Error: CHANGELOG.md is missing the '## [Unreleased]' section"
    exit 1
  fi

  # Replace the "## [Unreleased]" heading with a fresh empty section followed
  # by the new version heading. perl handles the multi-line replacement.
  perl -0pi -e "s/## \[Unreleased\]/## [Unreleased]\n\n### Added\n\n### Changed\n\n### Fixed\n\n## [$NEW] - $DATE/" CHANGELOG.md

  # Update the link references at the bottom of the file.
  perl -pi -e "s{\Q[Unreleased]: $REPO/compare/v$CURRENT...HEAD\E}{[Unreleased]: $REPO/compare/v$NEW...HEAD\n[$NEW]: $REPO/compare/v$CURRENT...v$NEW}" CHANGELOG.md
fi

# Update all version files
sed -i "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW\"/" package.json
sed -i "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW\"/" src-tauri/tauri.conf.json
sed -i "s/^version = \"$CURRENT\"/version = \"$NEW\"/" src-tauri/Cargo.toml

# Update Cargo.lock to reflect the new version
(cd src-tauri && cargo generate-lockfile 2>/dev/null || true)

echo "Updated files:"
echo "  package.json"
echo "  src-tauri/tauri.conf.json"
echo "  src-tauri/Cargo.toml"
echo "  CHANGELOG.md"

# Commit, tag, push
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock CHANGELOG.md
git commit -m "release: v${NEW}"
git tag -a "v${NEW}" -m "v${NEW}"
git push --follow-tags

echo ""
echo "Released v${NEW}"
