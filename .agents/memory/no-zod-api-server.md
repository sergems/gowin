---
name: No zod in api-server
description: zod is not a direct dependency of api-server; esbuild cannot resolve it. Use plain JS guards for request validation in route handlers.
---

`artifacts/api-server` bundles via esbuild. `zod` is NOT listed in its `package.json` dependencies. Importing `zod` or `zod/v4` directly causes a build error: `Could not resolve "zod"`.

**Why:** Other packages (`@workspace/api-zod`, `@workspace/db`) do have zod as a dep and export pre-built schemas. The api-server relies on those rather than importing zod itself.

**How to apply:** In any api-server route handler, use plain JS for request body validation:
```ts
const { email } = req.body as { email?: string };
if (!email || typeof email !== "string" || !email.includes("@")) { ... }
```
For more complex schemas, import from `@workspace/api-zod` (e.g. `RegisterBody`, `LoginBody`).
