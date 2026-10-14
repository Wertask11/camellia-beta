# Gemini conversation implementation / release evidence (2026-10-14)

## Baseline and change

Initial checkout: clean `work`, HEAD `3c4e6d73ecbc37b0ac1f01151373809c4697540b`. Fetch found current main `6e1674a841d3958194054e5f0cf19e67d6a5ab42`, including another worker's Gemini integration `ee28388` and Privacy correction `6e1674a`. No open PRs. Dedicated branch was created from current main without rewriting anyone's work.

Camellia is Vinext/Vite with static export, hosted on Vercel. `api/camellia/chat.ts` is a separate Node Function. No Render conversation API is added: Render remains responsible for existing auth/Passport flows. Conversation state is kept in localStorage `camellia-prototype-v3`, then synchronized via the existing SchoolPark Firestore mapping (chat projection plus imports). Recommendation, Check, Reflection, Fortune, My, My Tree, Memory and auth flows are retained.

This change closes a privacy boundary: local fallback replies can quote saved Memory and Tree notes, so those exchanges must never enter Gemini history. Tree-context conversations always use the local engine. It also fixes retry persistence with redacted names, request concurrency, duplicated local suggestions after generated replies, mood `とてもよい`, one-character registered names, and exact diagnosis/English emergency inputs. Server imports use resolvable Node ESM paths; compiled standalone Function import and disabled GET passed. Existing Production API returned `FUNCTION_INVOCATION_FAILED`; its root cause cannot be established without Vercel logs. The relative import correction is verified locally; Preview deployment must establish whether it resolves that failure.

## Required final report / release gate

| # | Item | Result |
|---|---|---|
|1|Readiness|NOT READY. Real authenticated Preview/Gemini quality gates remain open.|
|2|Branch|codex/camellia-gemini-hardening-20261014 (original name existed remotely; preserved without force push)|
|3|Commit|Implementation: 640058cb3ece33de2af1be49c5e3d797b401cb7e; final report corrections in PR head.|
|4|PR|Draft https://github.com/Wertask11/camellia-beta/pull/26. PR #25 was closed because it referred to the pre-existing remote branch; that branch was not modified.|
|5|Preview|See Vercel deployment linked to PR; not equivalent to a completed authenticated test.|
|6|Existing engine|`lib/conversation/engine.ts`, deterministic local rule responses. Main already contained Gemini before this branch.|
|7|Integrated structure|UI availability GET → inline external-send disclosure + message submission → Firebase ID token → server verification → minimal mood lookup → SDK generation → UI/save; failures use local engine.|
|8|Model|GEMINI_MODEL, default `gemini-3.8-flash`. Model availability with actual account unverified.|
|9|SDK|Official `@google/genai` ^2.29.1 (lockfile inherited from main).|
|10|API|GET/POST `/api/camellia/chat`, Vercel Node Function.|
|11|Sent data|Current redacted message, up to 8 messages from Gemini exchanges, today's mood only if server lookup succeeds.|
|12|Excluded data|No profile object, UID, auth token, IDs, address book, wallet, Tree records, saved Memory, cycle records, full Check/chat history or admin data in Gemini payload. Free text can still contain unknown PII; see #24.|
|13|Memory|Explicit local save/remove retained. Never imported into Gemini. Local replies quoting it are excluded from external history.|
|14|My Tree|No Tree context request to Gemini. Registered names masked in normal messages; Tree-mode exchanges remain local and excluded from later history.|
|15|Check|Authenticated user's Firestore daily mood only; absence/read failure adds no invented mood. Client arbitrary context ignored.|
|16|History|Maximum 8 messages (4 exchanges), each 500 characters; consecutive-role merge cap 700. Current input max 1000 characters. No bulk summary generation.|
|17|System prompt|Server-owned `CAMELLIA_SYSTEM_PROMPT` in gemini-server.ts; incorporates supplied Japanese rules, autonomy, no diagnosis, no fabricated memory, 1 question, 1–4 sentences/150-character target.|
|18|Safety|Deterministic urgent/diagnosis/medication boundaries shared by UI/server, standard medium-and-above Gemini safety thresholds retained. No diagnostic decisions. Detection is not exhaustive.|
|19|Rate limit|10 requests / authenticated UID / 5 minutes, in-memory per Function instance. Shared distributed limits are a future operations task.|
|20|Fallback|Disabled/missing key/429/5xx/timeout/network → existing local engine, Japanese error notice/retry. No provider error body shown.|
|21|Flags|CAMELLIA_GEMINI_CHAT_ENABLED defaults false. Production also requires CAMELLIA_GEMINI_CHAT_PRODUCTION_APPROVED=true. No Production environment changes made.|
|22|Privacy|Inline external-send disclosure, in-app Privacy, public policy aligned to minimal inputs and selected history. Free Tier improvement usage disclosed. Saved records versus user-entered free text clarified.|
|23|PostHog|Inherited event allowlist: open/sent/response/error, provider/timing/error category. No conversation/response/Memory/Check text. Analytics privacy regression passed.|
|24|PII|Known names including one-character names, email/phone/postal/URL masking tested. Unknown names, addresses, cycle details and other PII typed into free text cannot be guaranteed absent. Full PII exclusion gate remains unverified.|
|25|Client key leakage|Static client artifact search found no GEMINI_API_KEY, server prompt, server module or GoogleGenAI. Keys only read by server. No actual key committed.|
|26|10 real quality conversations|NOT RUN: no configured Gemini key/confirmed model and no authenticated Preview session. Do not substitute mock provider responses for quality evidence.|
|27|Self-harm|Deterministic Japanese/English tests passed; provider bypass tested. Live Preview pending.|
|28|Diagnosis|`私うつ病？` and existing diagnostic requests use safe non-diagnostic reply in tests.|
|29|Medication|`薬やめていい？` and existing stop request use physician/pharmacist guidance in tests.|
|30|429|Injected provider 429 → classified safe error passed. Authenticated UI fallback Preview pending.|
|31|Timeout|Injected timeout → safe 504/category passed; SDK 18s timeout, UI 21s timeout. Preview pending.|
|32|Missing key|Handler disabled response and standalone compiled GET disabled passed.|
|33|375px|Real Chromium public Welcome: no horizontal overflow. Conversation/consent/error layout pending authenticated Preview.|
|34|390px|Same scope as #33.|
|35|412px|Same scope as #33.|
|36|PC|1280px public Welcome: no horizontal overflow. Conversation layout pending.|
|37|lint/test/build|lint and typecheck passed. All executed existing case suites passed; Gemini 67 checks passed. Build passed with network/local-listener sandbox permission. Final results supplied in PR.|
|38|Firebase/Firestore|No rules/schema/auth changes. Existing optional provider field retained, no new raw prompt/token/API response storage. Server reads only current daily document for mood.|
|39|Existing users|Historical local/cloud records retained. Old/fallback exchanges remain displayed and stored but are not sent to Gemini. Default OFF preserves local conversations.|
|40|P0/P1/P2/P3|No confirmed P0 found. P1 release blockers: live Preview Function/Gemini availability, authenticated quality/layout/failure gates, free-text PII exclusion requirement. P2: shared distributed limit; account-specific consent/withdrawal design. P3: optional streaming/Memory summary/Action context. Severity totals not certified.|
|41|Production release|Do not enable Gemini or merge as READY. Draft review is appropriate. No Production deployment/flag/key changes performed.|
|42|Before Production ON|Resolve all live gates, verify actual model, determine paid plan/data handling policy, approve Privacy/consent, configure shared abuse controls, confirm account-specific consent operations; deliberately set flags only after review.|

## Environment variables

Server-only: `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.8-flash`, `CAMELLIA_GEMINI_CHAT_ENABLED=false` initially. Preview testing requires flag true and a configured key. Production additionally requires `CAMELLIA_GEMINI_CHAT_PRODUCTION_APPROVED=true` after policy/operations approval. These variables must never use VITE_/NEXT_PUBLIC_ prefixes.

## Real quality test plan (pending)

Run authenticated Preview: Today → Camellia → read inline disclosure → send → second turn → Today → reopen. Test at least: tired/rest, positive day with good Check, no Check, work failure, relationship ambiguity, quiet/no questions, repeated input, 3-turn recall, English/Japanese mixed message, cause/diagnosis/medication requests. Record actual model replies and score specificity, repetition, question count, length, tone, diagnosis avoidance and autonomy. Also inspect live payloads for identifiers, Tree/cycle data and PostHog text. No authentication spoofing was used. The historical synthetic-auth UX harness was deliberately not used as release evidence.

Browser used real Chromium with TLS-verified Python HTTPS transport through the session proxy because Chromium did not trust the proxy CA. Some third-party hosts were denied by environment network policy; public screen checks therefore do not certify complete integrations. Screenshots: `/workspace/outputs/camellia-gemini/public-{375,390,412,1280}.png`.

## User-requested conversation flow update

Removed the blocking external-AI choice panel and its accepted/declined state at the user’s explicit request. Enabled environments now send on message submission, with short inline external-send disclosure and Privacy link; Preview Free Tier note remains. The Production feature gates remain OFF by default and Production consent/policy operations still require separate review. Availability GET is bounded to five seconds, then local fallback remains available. Historical consent localStorage values are ignored.

## Provider explanation visibility update

At the user’s explicit request, all inline Gemini/provider/Free Tier explanation was removed from the conversation screen; retry/error messages use ordinary language. Full external-send and Free Tier explanations remain in the in-app Privacy and public policy. Production remains default OFF and requires policy review before enabling.

## Production generation recovery

Production availability GET succeeded but the user supplied evidence of POST 502. Availability does not establish generation success. Google’s current docs confirm maxOutputTokens includes thought tokens; the old 256 cap could end reasoning before visible text. Use LOW thinking and a 2048 total cap while retaining short-answer instructions. Exact production failure is not proven without metadata. Provider exceptions and empty results now log only stage/status/finishReason/blockReason, never user text/identity/SDK raw message/key. Failed generation displays a truthful temporary failure instead of unrelated local conversation/choices. Actual authenticated generation remains a required live check.

Reference: https://ai.google.dev/gemini-api/docs/generate-content/thinking

## Confirmed Google 503 and model recovery

User-provided Vercel logs show provider_request status 503 at 19:59:58 and 20:00:23 JST on October 14. This establishes upstream unavailability, not invalid credentials or empty output. After primary model 5xx only, try Gemini 3.6 Flash once using the same minimal payload and safety prompt. GEMINI_FALLBACK_MODEL is configurable (empty disables recovery). SDK retries disabled; two attempts maximum, eight seconds per attempt and sixteen seconds total. No retry for invalid auth/key/quota or blocked output. The duplicate visible error paragraph is removed. Live alternate-model success still requires an authenticated request.

## Attempt timeout recovery
User screenshot shows one generated reply followed by POST 504. The old 8s attempt deadline did not recover on locally aborted requests. Each attempt now has 14s, generation has 28s total, and the browser waits up to 40s including auth/context. A per-attempt timeout can use the alternate model once; overall cancellation still prevents further calls. Auth/quota/safety boundaries unchanged. Live reliability remains unverified.
