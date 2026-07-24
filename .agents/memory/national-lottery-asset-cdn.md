---
name: National Lottery asset CDN
description: Access constraint for South African National Lottery logo assets
---

The South African National Lottery website currently returns an edge-level 403 for both its homepage and public `/assets/*.png` logo URLs from the Replit agent environment.

**Why:** Browser captures and command-line requests both received the CDN error page, so saving those responses would create broken image assets.

**How to apply:** Do not treat a successful file write or screenshot as proof that the logo downloaded. Validate the response content type and image dimensions; prefer user-uploaded logo files or an accessible public mirror before updating lottery records.