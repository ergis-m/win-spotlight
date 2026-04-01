# Project Rules

## No useEffect

Do not use `useEffect` in this codebase. Instead:

- **Data fetching** — use TanStack Query (`useQuery`, `useMutation`)
- **Derived state** — use `useMemo` or compute inline during render
- **Event listeners** — use ref callbacks or event handler props
- **Subscriptions** — use `useSyncExternalStore` or TanStack Query subscriptions
