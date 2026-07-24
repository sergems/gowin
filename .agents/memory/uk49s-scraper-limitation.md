---
name: UK 49s scraper limitation
description: Why UK49sScraper returns NO_RESULT — site uses Firebase JS SDK, not accessible server-side
---

## Rule
UK 49s live draw results are NOT accessible server-side from 49s.co.uk.

**Why:** The site (Firebase project: sis-49s-app) is a React Native Web app. The JSON-LD in SSR HTML is a stale snapshot — on the DB-import it contains March 2026 results only. Live results load via Firebase JS client. Firestore REST API is disabled (403). RTDB (sis-49s-app-default-rtdb.firebaseio.com) returns 404.

**Staleness guard added:** UK49sScraper returns null when the most-recent JSON-LD event is >14 days old, so ScraperManager logs NO_RESULT instead of re-serving stale data.

**How to fix:** Find the Firebase RTDB region URL from the JS bundle on 49s.co.uk, or switch to an alternative data source that serves UK 49s results as static HTML.
