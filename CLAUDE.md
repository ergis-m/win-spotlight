# Project Rules

## No useEffect

Do not use `useEffect` in this codebase. Instead:

- **Data fetching** — use TanStack Query (`useQuery`, `useMutation`)
- **Derived state** — use `useMemo` or compute inline during render
- **Event listeners** — use ref callbacks or event handler props
- **Subscriptions** — use `useSyncExternalStore` or TanStack Query subscriptions

## Tailwind: use canonical classes

Prefer Tailwind's built-in spacing/sizing utilities over arbitrary values. For example, use `w-50` instead of `w-[200px]`. Only use arbitrary values when no canonical class exists.

## Changelog: record every change

Every user-facing change must be added to the `## [Unreleased]` section of `CHANGELOG.md`, under the appropriate `### Added`, `### Changed`, or `### Fixed` bucket. Do this in the same change that makes the edit — don't defer it.

- Write one concise, user-facing bullet (what changed, not how).
- The release scripts (`scripts/release.ps1` / `release.sh`) stamp `[Unreleased]` with the version and date on release, and the GitHub Release notes are generated from it — so the changelog is the source of truth.
- Purely internal changes with no user-visible effect (refactors, formatting, tooling) don't need an entry.
