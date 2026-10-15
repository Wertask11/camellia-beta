# Camellia Release Phase 1 — verification, 2026-10-15

Status: **NOT READY for full Production release**. Implementation is reviewable; Circle stays OFF. No production settings, deployed rules or existing Render services have been modified. The existing production chat configuration is not changed by this branch.

## Scope and evidence

Base: origin/main `02197e576494028c4e60988d5d3b914d7324e778`. Initial worktree clean, open PRs absent; existing same-name remote branch avoided. Dedicated branch `codex/camellia-release-phase1-20261015`. No force push or changes to another worker's branch.

Vercel hosts the app and Node Functions. Existing Render `emu-realtime` handles SchoolPark authentication; five existing free services share that repository, no shared Redis was found. User authorized inspecting My Workspace. No new Render service is required. Shared state uses the existing Firestore project, not instance memory.

Automated suites: 20/20 existing + Phase 1 suites passed. Gemini handler/recovery: 88 checks including no key, OFF, Check present/absent, history, PII guards, Japanese/special/mixed-language input, empty/long input, medical/safety routing, 429, timeout, 5xx, network, safety block, invalid response, shared limiter exhaustion/failure. These are controlled tests, not real Gemini quality conversations.

Firestore emulator: **23 checks passed**, real local demo project with the full existing SchoolPark rules snapshot. Anonymous/regular/moderator client access to protected community/counter documents denied. Two independently initialized Admin SDK clients share a transactional budget: 8 simultaneous requests for one identity permit exactly 3; a separate global budget permits 3 identities then denies the fourth; next window resets. This proves implementation sharing in the emulator, not deployment configuration.

Chromium: Today → Discover → concrete Action steps → completion at 375/390/412/768/1280. All five passed no horizontal overflow and no page errors. Local real components only, no auth/API response replacements. Reproduce with `node tests/phase1-layout.mjs` and `python tests/phase1-browser.py`. Images now use local decorative assets. Actual production public welcome page was also loaded with TLS verification; no signed-in session is available.

`npm run lint`, `npm run typecheck`, `npm run build` pass. Browser build scan finds no GEMINI_API_KEY, FIREBASE_SERVICE_ACCOUNT_JSON, CAMELLIA_CIRCLE_SIGNING_SECRET or private-key markers. No real credentials were added. PostHog properties use explicit allowlists and strip private content.

Vercel Preview deployment succeeded: https://vercel.com/school-park/camellia-beta/8i76MPdbeXJvjv5MUVyTNSSebEnB . Direct access to the Preview host from this workspace fails with `Tunnel connection failed: 403 Forbidden`; no Preview browser PASS is claimed.

## Required live acceptance (not passed)

- Vercel Preview network access and本人 login (LINE / Google / existing Passport); verify restoration, Today, conversation continuity and cloud sync. ログインしてください。
- Actual primary/fallback availability and 10 real quality conversations. This workspace has no Gemini key or authenticated user token; no claims about Google availability or production billing tier are made.
- Preview-only server FIREBASE_SERVICE_ACCOUNT_JSON for emusch-2a111; appropriate Firestore/Auth IAM. Verify actual deployed rules deny the protected root, install the three composite indexes, and test the queries.
- Set CAMELLIA_SHARED_RATE_LIMIT_REQUIRED=true once storage is configured, verify `rateLimitMode: firestore`, and prove the same user/global budgets across deployed function instances. Configure rate_windows.expiresAt TTL for cleanup.
- Set stable server-only Circle signing secret. Assign moderator claim to an identified trusted operator through Firebase administration; agree moderation response/retention process. Verify two real users' ownership, leave, reports, blocking, moderation and five screen sizes.
- Confirm actual Gemini data contract and GEMINI_DATA_POLICY; policies cannot infer the plan from Preview/Production.
- Only then enable both Circle flags. Place remains OFF.

## Forty-item release report

| # | Item | Result |
|---|---|---|
|1|READY / NOT READY|NOT READY: live acceptance above remains|
|2|branch|codex/camellia-release-phase1-20261015|
|3|commit|PR implementation HEAD; see Git history|
|4|PR|https://github.com/Wertask11/camellia-beta/pull/31|
|5|Preview URL|https://camellia-beta-git-codex-camellia-release-pha-1d8abb-school-park.vercel.app/ (Vercel SUCCESS; workspace tunnel403 blocks direct access)|
|6|Today Before / After|Loose seven-record week → actual JST Monday week, five recorded days; optional yesterday fields and three-record trends are factual; proposal impressions no longer reshuffle cards|
|7|Discover Before / After|14 candidates → 74; excludes unavailable destinations and Today cards, six populated categories, existing behavioral ranking retained|
|8|Added Actions|60; 74 total, 71 usable with Circle/Place OFF|
|9|Conversation|Authenticated server mood + allowlisted daily stage/action; up to eight Gemini-context messages, no invented Memory|
|10|Primary / Fallback|gemini-3.8-flash / gemini-3.1-flash-lite defaults; env-changeable; existing bounded recovery retained|
|11|Rate Limit|Atomic Firestore transaction for user+global fixed windows, defaults20/user and1000/global per300s; configurable; required mode fails closed|
|12|Sharing evidence|Two Admin clients, concurrent user/global quota tests on real emulator PASS; deployed sharing pending|
|13|Privacy|Google/LINE/Passport/Firebase/Gemini/Vercel/Render/PostHog, actual contexts, free-tier conditional, Circle public/private/delete scope|
|14|Terms|Auth linking, community obligations/reports/moderation/deletion; Place preparation state|
|15|README|Actual architecture, 4 tabs, tests, flags, credentials, deployment gates and constraints|
|16|Circle architecture|Verified Vercel API + Admin SDK under existing client-denied Firestore root, HMAC public IDs, flags OFF|
|17|Circle list|Six themes in server catalog; membership from Firestore|
|18|Join / leave|Separate pseudonym + versioned guidelines; active membership checked server-side; own deletion after leave|
|19|Posts|500 characters, own edit/delete; others forbidden; five-second transactional posting cooldown|
|20|Comments|Parent circle and active membership checked; own edit/delete|
|21|Reaction|わかる / そっと応援 / 参考になった, toggle, no counts or rankings|
|22|Report|Six reasons; one report per reporter+target; reporter not public|
|23|Block|Hide author's posts/comments, unblock management, no target notification|
|24|Moderation|Verified Firebase camelliaModerator claim only; private queue, text removal + audit|
|25|Firestore collections|camellia_users/{uid}/daily_context; protected rate_windows, circle_memberships, circle_posts, circle_comments, circle_reactions, circle_reports, circle_blocks, circle_write_limits, circle_moderation_audit|
|26|Rules|Existing SchoolPark snapshot tested, no deployed-rule overwrite; deployed version must be verified before LIVE|
|27|PostHog|circle_view/join/leave/post_create/comment_create/reaction/report/block; six-value circle_id allowlist; no text/name/private identity|
|28|PII|Explicit public projections and server context allowlists; key markers absent from browser build; arbitrary PII typed into chat cannot be guaranteed absent, policy states this|
|29|Place|Coming Soon, excluded from suggestions; no new destination enabled|
|30|375|Local component browser PASS; authenticated Preview pending|
|31|390|Local component browser PASS; authenticated Preview pending|
|32|412|Local component browser PASS; authenticated Preview pending|
|33|768|Local component browser PASS; authenticated Preview pending|
|34|1280|Local component browser PASS; authenticated Preview pending|
|35|lint|PASS|
|36|typecheck|PASS|
|37|tests|20 suites PASS, Gemini88, Phase1 core13, Firestore23; live acceptance pending|
|38|build|PASS; public bundle contains no server secret markers|
|39|P0 / P1 / P2 / P3|P0=0, P1=3 verification gates, P2=2 limitations, P3=0. P1 release blockers: deployed credentials/rules/shared quota, actual authenticated Preview & Gemini quality, operator setup/acceptance. P2: feed40/comments60/own-list pagination and full abuse operations need further work. Gate is NOT cleared|
|40|Production reflection|Do not merge/activate the complete release yet; keep Circle OFF until required acceptance. No automatic production deployment performed|

## Known limits

Posting keyword/contact checks are a first guard, not complete moderation or complete PII detection. Moderation is not staffed 24/7 by this implementation. Feed is limited to latest40 posts and first60 comments; older posts remain accessible in one's own deletion list. No pagination/DM/follow/ranking is implemented. Fixed-window quotas permit boundary bursts; the global counter is a transaction contention point and defaults should be tuned to real usage. Missing Admin config retains the old per-instance chat limit unless REQUIRED=true, and must never be reported as deployed shared enforcement.

Circle content is separate from personal My deletion: users can delete their own text in Circle even after leaving; reports/audits remain for operations and deletion requests. Personal daily_context is included in existing My cloud deletion. Existing user records are not migrated or erased. No user Check, conversation, Memory, My Tree or cycle records are automatically shared to Circle.

## Follow-up: 2026-10-16 JST

The user reports LINE login succeeded on Preview. Their screenshots show the new Discover catalog, but conversation acceptance **FAILS**: responses are local templates, and the console shows GET /api/camellia/chat HTTP500. This is distinct from browser-extension warnings. Exact deployed runtime cause requires Vercel execution logs; the workspace cannot access the Preview host/logs.

Fixed an independent confirmed client bug: failed/invalid/timed-out GET was treated as an explicit OFF flag for the entire mounted session. Now only a valid enabled:false selects local mode; a failed probe permits POST, where server flags/auth remain authoritative. No flag or consent boundary is bypassed. Added isolated UI regression for500/timeout/invalid JSON/OFF (four passes; fake dependencies, no real-auth evidence).

Split API status/feature gating from optional SDK/Admin runtime imports. GET can return status without loading those dependencies; failed runtime initialization returns a safe structured503 and logs only stage/code. Bootstrap tests cover missing configuration, OFF, enabled status, unauthenticated request rejection, and deliberately broken runtime isolation (five passes). Real Gemini and authenticated Preview acceptance remain pending.

Packaged-function check: official @vercel/node24.0.1 builder produced1367 files. Extracted output imported in Node24; test-only flags/key placeholder (no real credential), GET200 with enabled:true, SDK/Admin runtime loads and unauthenticated POST401. No provider call or authentication impersonation occurred. This does not prove the deployed500 cause or live Gemini availability; fresh Preview GET/POST and Vercel logs remain required.

## Confirmed runtime failure: 2026-10-16 JST

User supplied deployed POST503 log: runtime_initialization / ERR_REQUIRE_ESM. Reproduced the exact failure using the previously packaged Function with `node --no-experimental-require-module`: jwks-rsa4.0.1 CommonJS requires jose6 ESM via firebase-admin14.5.0. Default local Node24 permits this require and masked the incompatibility; the earlier smoke test was insufficient.

Pinned firebase-admin13.10.0 exactly (jwks-rsa3.2.2 uses its jose4 dependency). Added a permanent import regression with synchronous require(ESM) disabled for Google GenAI and all used Firebase Admin entrypoints. Same restrictive import succeeds after the pin. Gemini SDK/model, feature flags, user data and existing services are unchanged. Packaged-function restrictive-mode, emulator and regular validation results are recorded in the PR after completion. Live generated conversation remains a separate acceptance gate.

After-pin verification: restrictive-mode packaged Function1044 files, GET200 / unauthenticated POST401 PASS; direct server SDK import regression PASS; Firestore emulator23 PASS (ownership, moderation, same-user/global shared quotas); Gemini88 PASS; API bootstrap5 PASS. Default local import success is no longer used as sole runtime compatibility evidence.

## Discover / conversation presentation, 2026-10-16 JST

User video (15.6 seconds) confirmed generic placeholder-looking Discover art and a single long scrolling conversation. Added six original category illustrations as local960px WebP (about800KB total), lazy/asynchronous thumbnails. Discover now places Circle prominently above category filters, with an explicit preparation state while the existing release gate keeps Circle OFF. No production/Circle flag change.

Added conversation library: new conversation, local title search, dated history selection, back/new toolbar. First user message supplies the title; titles/search are not sent to analytics. Existing v3 conversations are retained verbatim, not automatically split or summarized. Save and retry target a stable selected conversation ID; new conversations never inherit another thread's Gemini history. Existing Firestore archive format already supports multiple IDs and is unchanged. Messages scroll within a viewport-sized panel and the composer stays above bottom navigation.

Validation: pure thread cases5 PASS (legacy preservation, targeted append, targeted retry, provider-history isolation, titles); local UI/store interaction3 PASS (new vs legacy append, correct selected thread, both persisted); existing availability4 and SchoolPark sync PASS; Phase1 core13 and analytics privacy regression. Chromium at375/390/412/768/1280 PASS for library search/switch/new, forty old messages retained, scrollable history, composer above navigation, no starter overlap, no horizontal overflow or JS errors. Local component fixtures have no live-auth/API acceptance claim. Discover/Today/actions at all five sizes PASS. Runtime Gemini/Circle readiness gates remain separate.
