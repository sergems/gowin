---
name: api-server dev script runs the built bundle, not source
description: The api-server workflow's dev command executes dist/index.mjs — editing src/ files has no effect until a rebuild.
---

`artifacts/api-server`'s `dev` script is `node --enable-source-maps ./dist/index.mjs` — it runs the pre-built esbuild bundle, not the TypeScript source directly (unlike a typical `tsx watch src/index.ts` dev setup).

**Why:** Restarting the workflow after editing files under `artifacts/api-server/src/` will NOT pick up the changes — it just restarts the stale bundle. This can look like a fix "didn't work" (e.g. same buggy behavior after restart) when actually the new code was never loaded.

**How to apply:** After editing any file in `artifacts/api-server/src/`, run `pnpm --filter @workspace/api-server run build` before `restart_workflow`. Verify behavior changed post-rebuild before concluding a fix failed.

**Related wrinkle:** `lib/db` is a separate TS project referenced by `api-server` (project references). If you edit `lib/db/src/schema/*` and `api-server`'s `tsc --noEmit` still shows stale/wrong types, the cause is often `lib/db`'s own stale `dist/*.d.ts` — its `tsconfig.tsbuildinfo` thinks the build is current even though source changed. Fix: delete `lib/db/tsconfig.tsbuildinfo` and run `tsc -b tsconfig.json` inside `lib/db` to regenerate `dist`, then re-check `api-server`.
