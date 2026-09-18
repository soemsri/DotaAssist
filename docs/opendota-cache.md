# OpenDota response caching

Validated successful responses from heroStats, hero matchups and itemPopularity are stored in local storage under `dotaassist.opendota.v1:<endpoint>`. Each record contains response data, its original UTC fetch time, and the supported app rules patch at fetch time. Endpoint keys keep different heroes/resources isolated.

On each requested load or manual Refresh, the app attempts a network request, sharing concurrent requests for the same resource. A 15-second timeout, HTTP error, malformed response, or other network failure falls back to a validated saved response only when its patch tag matches the current bundle. The original fetch time is retained, and the UI labels the response stale. If no matching response exists, data is unavailable. Records from another patch remain excluded until replaced by a successful current request. No age-only expiration is applied within a matching patch.

The patch tag describes the app at fetch time; it is not a claim that OpenDota aggregates are patch-filtered. Updating the app's supported patch requires fresh responses even if older cached data exists.

Refresh buttons are provided for ranked hero statistics, matchups and item popularity, including the HUD. Cached results are labeled with their fetch time. Storage failures do not discard successful live data: the session retains it and the UI reports that persistence failed. Saved response corruption is ignored. Cache data is local to each browser/WebView profile and is not synchronized between browser development and the desktop app.

Tests: `npm run test:cache`. Existing integration and gameplay checks remain part of `npm test`.
