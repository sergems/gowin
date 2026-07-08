---
name: i18n translation pattern
description: How EN/FR translations work in this codebase and the rules for adding new keys safely
---

## Where translations live
- Single file: `artifacts/gowin/src/lib/i18n.ts` — exports `translations` object with `en` and `fr` sections
- `TranslationKey = keyof typeof translations.en` is exported from i18n.ts
- `t(key: TranslationKey)` is provided by `useSiteSettings()` from `SiteSettingsContext`

## Rules for adding new keys
1. Add to **both** `en` and `fr` sections of i18n.ts — adding only to one section creates a runtime mismatch (TypeScript won't catch it since FR section is not part of TranslationKey).
2. Avoid `t(key as any)` — it bypasses compile-time checking. Instead, cast to `TranslationKey` (`import type { TranslationKey } from "@/lib/i18n"` then `t(someVar as TranslationKey)`) or ensure the string literal is a valid key.
3. For string templates with placeholders (e.g., "Amount ({currency})"), either: (a) keep them as literal template expressions in JSX (`${t("common.amount")} (${currency})`), or (b) add a key and use `.replace("{x}", value)` — but the key must exist in both EN+FR sections.

## SiteSettingsContext fallback
- The API error fallback on line 37 must include ALL fields of SiteSettings interface: `{ currency, language, exchangeRate, maxWin }`. Missing maxWin caused undefined behavior when the API was down.

**Why:** The `maxWin` field is used in bet placement logic — if it resolves to `undefined`, bets can be improperly rejected or accepted.

## Pre-existing TS errors (do not fix unless explicitly asked)
- `oddsId` missing from `BetSlipItem` type (LiveBetting.tsx, sports.tsx, fixture-detail.tsx) — pre-existing, does not affect runtime since Vite doesn't type-check
- `BetSlipItem` missing `selection`/`odds` fields (BetSlipBody, Shell) — same, pre-existing
- TS6305 for `api-client-react/dist` — only occurs when dist is not built; build with `pnpm --filter @workspace/api-client-react run build`
