# α Release Candidate — 2026-10-19

Baseline: main `da68c0f32f7c684b00bce55e9b63435a77bcdabe`.
This branch fixes P1-01–04. It does **not** certify α READY or change Production.

## Record protection

- Every personal collection is checked before use. Invalid records are excluded only from the in-memory recovery projection; the original localStorage blob stays untouched.
- A recovery state stops persistence, analytics forwarding and account preparation/sync. It does not silently clear data or upload a partial archive.
- The recovery screen exports both original blobs and readable records, with a warning about personal content. Export files are private user-managed backups, not public diagnostics.
- Retry after a read failure reads the preserved source again. Retry after a save failure saves the current in-memory state, preserving edits that could not be stored.
- Successful cloud deletion remains a prerequisite for local cleanup. Circle public content and audit retention have not changed.

## Fortune migration

Answers use the existing random local profile ID and JST date, not an added Firebase UID.
Date-only legacy keys have no provable owner: quarantine them under `unassigned`, never attach them to whoever logs in next. If quarantine cannot be written, retain the original and ignore it. Existing scoped answers take precedence. Explicit personal deletion clears scoped, legacy and quarantined answers inside the existing ownership-checked deletion callback.

## Server eligibility

Circle and conversation share Admin SDK `verifyIdToken(token, true)` plus anonymous rejection, profile existence and valid `agreedAt`. This includes signature/issuer/audience/expiry, revoked-token and disabled-user checks. Rejected requests do not reach generation. A missing Admin setup fails closed; do not fall back to signature-only verification.

Conversation requires the existing server-only Firebase Admin setup in Preview as well as Production. No credentials belong in `VITE_` variables, source, reports or chat. Production shared limiting now fails closed without Admin configuration even if the optional required flag is absent.

`camellia_provider_text_received` logs only model, primary/fallback route and elapsed milliseconds. It does not log prompts, replies, tokens or identities. Provider text arrival is **not** a quality or Safety PASS. Existing urgent local Safety responses remain `provider=fallback` and must not be counted as real Gemini successes.

## Local verification

```sh
npm run lint
npm run typecheck
npm test
npm run test:firestore
VERCEL_ENV=preview npm run build
node tests/alpha-layout.mjs
# In another terminal (Python Playwright + Chromium):
python tests/alpha-browser.py
```

The browser fixture is local-only and synthetic. It covers five corruptions, quota/export/retry, delete dialog keyboard/focus/background behavior and profile-scoped Fortune selection at 375/390/412/768/1280. It is **not** authenticated Preview/Production acceptance. `ALPHA_PORT` and `ALPHA_BROWSER_OUTPUT` select a local test port and evidence directory.

Use only demo Firestore emulator projects and the test Rules snapshot for automated fixtures. Never point these fixtures at the live project. A build uses Preview conditions so the existing production index migration is not invoked during local verification.

## Remaining real-environment gates

| Audit ID | Required evidence before PASS |
|---|---|
| P1-05 | Read the deployed Rules; real nonmember/member/owner/other/moderator/admin permission matrix; post and comment Block/unblock; OAuth return to original Circle; authenticated five widths. Prior owner-confirmed reactions/own content/moderation are retained as prior evidence, not proof for this new build. |
| P1-06 | Run all 30 fixtures with real authenticated API access. Record provider, primary/fallback, response time, quality, Safety. No major Safety failure and at least 90% quality PASS. Report measured average/p95/max and unexecuted cases honestly. Do not bypass urgent local Safety to force sensitive prompts into the provider. |
| P1-07 | Confirm actual user/global/window values and shared store, independent deployed instances, limit/recovery and fail-closed behavior. Defaults and emulator clients are not proof of live setup. Avoid exhausting Production global budgets; use an approved isolated Preview test. |
| P1-08 | Owner stated **free API use** on 2026-10-19. Privacy now states free-tier processing. Owner must verify/set `GEMINI_DATA_POLICY=free` in the intended Vercel environment; no contract or environment changes were made here. Confirm actual processing terms before admitting sensitive real content. |
| P1-09 | Owner stated no permission-cleared venue yet. Keep live Place OFF and the demo clearly labeled. Obtain venue/publication/photo permission, official details and usable links; then operator draft→review→published and actual save/external flow. No fictional published data. |
| P1-10 | Real LINE/Google/Passport new/existing/cancel/link/conflict; same-account two-device personal sync; backup/remote-newer/conflict; test-only Delete→logout/login→no resurrection; authenticated full flow and all five widths. Never delete ordinary users' records for testing. |

The existing public `/api/camellia/chat` reports `dataPolicy` and `rateLimitMode`; these are not credentials and do not establish successful generation or actual rate-limit reservations. Obtain actual limit values from authorized Vercel settings; never infer them from defaults.

## Changes requiring owner authorization

No Production deploy, PR merge, feature flag, environment variable, Rules, moderator/operator claim, real data deletion or user creation is part of the unattended work. Preview configuration must be confirmed by the owner; then review acceptance results before authorizing Production deployment.

Do not recruit, post on SNS or advertise until the α gates are met. Place can be shown in store sales only as a clearly marked demo while permission-cleared venues are unavailable.
