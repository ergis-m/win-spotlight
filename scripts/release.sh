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

# Commit, tag, push
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "release: v${NEW}"
git tag -a "v${NEW}" -m "v${NEW}"
git push --follow-tags

echo ""
echo "Released v${NEW}"
