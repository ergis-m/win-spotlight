# Project Rules

## No useEffect

Do not use `useEffect` in this codebase. Instead:

- **Data fetching** — use TanStack Query (`useQuery`, `useMutation`)
- **Derived state** — use `useMemo` or compute inline during render
- **Event listeners** — use ref callbacks or event handler props
- **Subscriptions** — use `useSyncExternalStore` or TanStack Query subscriptions

## Tailwind: use canonical classes

Prefer Tailwind's built-in spacing/sizing utilities over arbitrary values. For example, use `w-50` instead of `w-[200px]`. Only use arbitrary values when no canonical class exists.
