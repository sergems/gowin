---
name: Wouter render-prop hooks violation
description: Using React hooks inside a wouter Route children render-prop causes "Rendered fewer hooks than expected"
---

## The Rule

Never put React hooks directly inside a wouter `<Route>` children function. Wouter calls the children callback as a plain function call (not via `React.createElement`), so any hooks inside run in the *Route component's* fiber. When the path stops matching, the hook count in Route's fiber drops → React error #310.

**Wrong:**
```tsx
<Route path="/live">
  {() => {
    const [, nav] = useLocation();   // ← these hooks land in Route's fiber
    useEffect(() => { nav("/"); }, []);
    return null;
  }}
</Route>
```

**Right:**
```tsx
function LiveRedirect() {
  const [, nav] = useLocation();
  useEffect(() => { nav("/live-betting"); }, []);
  return null;
}
// ...
<Route path="/live" component={LiveRedirect} />
// OR simply render the target page directly:
<Route path="/live" component={LiveBetting} />
```

**Why:** When rendering `<SportRedirect>` or any JSX from the children function (e.g. `{() => <SportRedirect />}`), React creates a fiber for SportRedirect, so SportRedirect's hooks are in *its own* fiber. But when calling hooks directly inside the children function body, those hooks go into Route's fiber.

**How to apply:** Any time a wouter `<Route>` uses `children` (function form) that directly calls hooks, convert to either the `component` prop or extract a proper named component.
