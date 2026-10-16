# Circle Phase 2A

Base: main 03ff2cc (PR31). Production Circle flags remain OFF; no Rules deployment or claims assignment performed.

## Implementation

- Existing API/service reused: six Circles, membership, manual-text posts/comments (500 characters), owner edits/deletion, three gentle reactions, six report reasons, block/unblock.
- Membership count uses Firestore aggregate count, no public member list. Joined filter and My entry. Counts are small secondary text, feed remains chronological.
- Posts, comments, own content, reports and audit history paginate at 20 raw records with timestamp/document-ID tie breaks. Deleted/blocked rows are filtered after pagination, so a page may be empty while a next cursor remains available. Old posts have independent detail reads; leaving does not prevent own-content deletion.
- Reaction selection persists and is shown with aria-pressed; no popularity totals.
- Server authorization requires verified non-anonymous Firebase user and agreed Camellia profile. Only `camelliaModerator: true` or dedicated `camelliaAdmin: true` grants moderation; generic admin/body fields do not.
- Moderator queue includes target kind/content, author public ID, reason/time. Dismiss preserves text; remove clears text. Both resolve once transactionally and record action/note/operator/time. Concurrent repeat resolution returns a safe conflict. Audit API is moderator-only and exposes pseudonymous operator IDs, never raw UID. User suspension is not part of this MVP.
- Reports are idempotent per reporter/target; at most ten new targets per five-minute window. Existing post cooldown remains five seconds. Protected report-limit collection is under the same server-only root.
- No automatic Check, sleep, mood, stress, body, cycle, conversation, Memory, Tree, Fortune or Action sharing.

## Links and retention

`/?open=circle&circle=tired` (or another catalog slug). Public slug only. Registered OAuth callbacks remain `/`; a pending public destination is stored for 30 minutes, restored after login/profile, then consumed. My opens joined-only filter. Unrelated callback/query parameters are preserved. These are client navigation links, not public feeds.

Circle views contain allowlisted circle_id and whole JST calendar days_since_join. D1/D7 can be analyzed by circle_join cohorts and subsequent circle_view events with the existing stable pseudonymous analytics identity. No text, name, Firebase UID or Tree/Check is included. Rejoining starts a new participation interval. D1/D7 are analysis events, not a claim that retention has improved.

## Preview setup (operator actions, not performed automatically)

1. Server-only `FIREBASE_SERVICE_ACCOUNT_JSON` for emusch-2a111 with the minimum Firestore/Auth permissions. Set a stable `CAMELLIA_CIRCLE_SIGNING_SECRET` of 32+ characters. Never prefix secrets with VITE_.
2. Verify currently deployed Rules deny all direct clients under camellia_admin/release_phase1. The checked-in Rules snapshot is only for emulator regression; do not overwrite SchoolPark Rules with it.
3. Review/apply the composite indexes in security/firestore.indexes.json, including own-content uid/createdAt and membership circleId/active. Emulator success does not prove deployed indexes exist.
4. Set Preview-only CAMELLIA_CIRCLE_ENABLED=true and VITE_CIRCLE_ENABLED=true; redeploy Preview. Keep Production flags OFF.
5. An authorized Firebase administrator can run `node scripts/circle-moderator.mjs --grant <UID>` with server credentials in that local shell. The script validates project/account and preserves other custom claims. Revoke with --revoke. Do not send UID/credentials through chat or commit them. Only assign a trusted named operator; have them sign in again. No claims are set by app code or builds. Claims revocation may require token expiry/sign-out to take effect.
6. Ensure operator coverage, escalation, handling/retention policy, and contact details match Privacy/Guidelines. Safety keywords are only a minimal guard, not moderation staffing.

## Acceptance still required

Two real users A/B: membership, post/comment/edit/delete, reaction persistence, report, block/unblock, own deletion after leave; non-member/other-owner denied; moderator dismiss/remove/history; no raw UID/PII in responses/DOM/PostHog. Verify links through real LINE/Google/Passport callbacks. Test 375/390/412/768/1280 with keyboard and touch. Do not call Circle OPEN READY or enable Production until all pass.

Shared Gemini limits and Gemini live quality remain independent prerequisites: current Production was instance-limited, not proven Firestore-shared. This Circle PR does not alter Gemini flags or model calls.

Deletion policy is unchanged: personal-data deletion does not erase Circle content/reports/audit; users can delete their own text even after leaving. Other erasure requests go to the disclosed operator contact. No new automatic deletion policy has been chosen.

## Local verification (2026-10-16)

lint / typecheck / all 26 unit suites / build PASS. Firestore emulator 27 checks PASS, including separate-client shared budget, tie-break pagination, old post lookup, cursor scope, reaction persistence, moderator dismiss/idempotency/audit and report-spam limit. Chromium component fixture at 375/390/412/768/1280 PASS for join, reaction, comment, report, dismiss and audit history; zero page errors/horizontal overflow. The fixture is explicitly labeled and never authenticates or calls Firebase; this is NOT the mandatory two-real-user acceptance. Actual Preview connectivity and operator configuration remain release blockers.
