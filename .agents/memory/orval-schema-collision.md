---
name: Orval schema name collision
description: Orval generates Zod schema names as <operationId>Response; component schema names in the spec must not match these or index.ts re-exports conflict.
---

Orval generates two outputs from the OpenAPI spec:
1. TypeScript interfaces in `lib/api-zod/src/generated/types/<name>.ts` — named after `components/schemas` entries
2. Zod schemas in `lib/api-zod/src/generated/api.ts` — named after the operation (e.g. `verifyOtp` → `VerifyOtpResponse`)

Both are re-exported from `lib/api-zod/src/index.ts` via `export * from`. If a component schema is named `VerifyOtpResponse`, both exports share the same name → TS error: ambiguous re-export.

**Why:** orval's naming convention for endpoint response Zod schemas is `<operationId>` + `Response` (PascalCase). Component schemas generate TypeScript interfaces with the same case. When they collide, `index.ts` can't re-export both.

**How to apply:** When adding a new response schema component, name it something OTHER than `<operationId>Response`. For example, the `verifyOtp` operation's response component should be named `ResetTokenPayload`, not `VerifyOtpResponse`. The `adminResetPassword` operation's response should be `TempPasswordPayload`, not `AdminResetPasswordResponse`.
