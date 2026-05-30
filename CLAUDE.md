# Project Rules

## No useEffect

Do not use `useEffect` in this codebase. Instead:

- **Data fetching** — use TanStack Query (`useQuery`, `useMutation`)
- **Derived state** — use `useMemo` or compute inline during render
- **Event listeners** — use ref callbacks or event handler props
- **Subscriptions** — use `useSyncExternalStore` or TanStack Query subscriptions

## One component per file

Each file exports a single React component. Helpers (non-component functions), types, and constants may live alongside it.

- **Exception — compound components.** A component and its sub-parts (e.g. `Tile` with `Tile.Icon` / `Tile.Label`) are one logical unit and belong in the same file. Attach parts as properties (`Tile.Icon = TileIcon`) and add a scoped `/* eslint-disable react/no-multi-comp */` at the top.
- Enforced by oxlint's `react/no-multi-comp` (currently a warning; vendored `src/components/ui/**` is exempt). Pre-existing multi-component files are being split incrementally — don't add new ones.

## Compose, don't pass big prop bags

When a component starts accumulating presentational props (icon, label, colors, flags…), prefer composition over widening the prop list:

- Expose a shell plus sub-components (compound pattern) and let callers assemble the content as children.
- Keep behavior on the shell (click/disabled/state) and apply styling/config at the call site via `className`/`style`/children, not via dedicated props for every visual detail.
- Use `asChild` (radix `Slot`) when a primitive needs to render as a different element (e.g. a `<button>`) instead of duplicating its markup.

## No unnecessary comments

Write code that reads on its own; don't narrate it. Skip comments that restate what the code already says (JSDoc that echoes the signature, "renders X" above a component, labels for obvious blocks).

- Keep a comment only when it explains *why* — a non-obvious decision, a workaround, a gotcha — not *what*.
- Functional directives are not comments and stay (e.g. `/* eslint-disable ... */`, `@ts-expect-error`).

## Tailwind: use canonical classes

Prefer Tailwind's built-in spacing/sizing utilities over arbitrary values. For example, use `w-50` instead of `w-[200px]`. Only use arbitrary values when no canonical class exists.

## Changelog: record every change

Every user-facing change must be added to the `## [Unreleased]` section of `CHANGELOG.md`, under the appropriate `### Added`, `### Changed`, or `### Fixed` bucket. Do this in the same change that makes the edit — don't defer it.

- Write one concise, user-facing bullet (what changed, not how).
- The release scripts (`scripts/release.ps1` / `release.sh`) stamp `[Unreleased]` with the version and date on release, and the GitHub Release notes are generated from it — so the changelog is the source of truth.
- Purely internal changes with no user-visible effect (refactors, formatting, tooling) don't need an entry.
