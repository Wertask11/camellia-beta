# Conversation transient recovery — 2026-10-19

The owner reported a Production chat 502 on the first send and success on the second. The supplied public GET confirms Admin configuration presence and Firestore limiter mode; it is not the failed POST response. The specific live failure category remains unverified. No claim is made that this was a cold start or that every 502 is resolved.

Two concrete gaps in the existing recovery path are addressed:

- Transport failures with known transient codes, including a bounded nested `cause`, now use the already-configured alternate model within the same request.
- Empty/malformed provider output is validated inside each attempt. It can recover with the alternate model, and is never marked healthy before validation. The handler still applies the actual message's action filtering.

The existing maximum of two model calls and 28-second generation deadline remain. The browser does not automatically replay the POST, shared limiting is reserved once, and no duplicate chat messages are written. An absent or identical alternate remains a single call. Unknown programming errors, invalid keys/requests, quota responses and Safety blocks are not retried. Safety-blocked partial text is rejected as well; an alternate model cannot bypass the block.

Failure logs add only a fixed reason label. Prompts, replies, tokens, SDK exception text and identities are not logged. No rate-limit, model, environment, data-policy or Safety threshold settings are changed.

Regression tests cover direct/wrapped transport failure, malformed and empty output, partial Safety output, non-retryable failures, total deadlines, two-call bounds and one reservation/one Gemini reply at the API boundary. All use synthetic dependencies; real provider reliability still requires authenticated Production verification.

## Already-published Circle appeared closed

The owner then reported that Circle had returned to “公開準備中”. Production API status remains enabled/configured/initialized with a ready feed query. The UI instead uses a separately compiled `VITE_CIRCLE_ENABLED` flag, so the two publication decisions can disagree.

Vite now compiles a single public boolean from the existing `CAMELLIA_CIRCLE_ENABLED` server switch, including explicit OFF. Legacy `VITE_CIRCLE_ENABLED` is used only when the server switch is absent. Discover, route selection, My and recommendations all consume the same destination set. No credential or signing value is exposed. Place remains unchanged. This restores the owner's already-authorized Circle publication; it does not enable a disabled backend or change access-control Rules.
