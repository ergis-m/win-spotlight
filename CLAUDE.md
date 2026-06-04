# Project Rules

## State & data: use Legend-State

All client state and data fetching go through **Legend-State v3** (`@legendapp/state`). Do **not** add Zustand, TanStack Query, Redux, or other state/data libraries — they were removed and must not return.

- **Stores / shared state** — module-level `observable()` singletons (see `src/stores/`). Mutate with `.set()` / `.assign()`; expose named action functions rather than mutating from components.
- **Data fetching** — `synced({ get, set, subscribe })` from `@legendapp/state/sync`, wrapped in `observable()` (see `src/services/`). `get` wraps the `invoke()`/`fetch` call and re-runs when observables it reads change; the observable itself is the cache (previous value is kept during a refetch).
- **Loading / error / refetch** — `syncState(obs$)` for `.isGetting` / `.isLoaded` / `.error` / `.sync()`. Polling and window-focus refetch live in `subscribe` via the `poll` / `onFocus` helpers in `src/lib/sync-helpers.ts` — not in components.
- **Derived state** — prefer a **computed observable** (`observable(() => ...)`) over `useMemo` when the inputs are observables; it computes outside React and only re-renders consumers of the values they read.
- **Reading in components** — `use$(obs$)` (a.k.a. `useValue`) from `@legendapp/state/react`; read without subscribing via `.peek()`.
- **Cross-observable side effects** — `observe()` at module scope (setting an observable from there needs no `useEffect`/microtask hop). Persisted state uses `syncObservable` + `ObservablePersistLocalStorage`.

## No useEffect

Do not use `useEffect` in this codebase. Instead:

- **Data fetching** — Legend-State `synced` observables read via `use$` (see "State & data" above)
- **Derived state** — a computed `observable(() => ...)`, or `useMemo` / compute inline during render
- **Event listeners** — use ref callbacks or event handler props
- **Subscriptions** — `use$` on an observable, or `synced`'s `subscribe` for the source side

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
