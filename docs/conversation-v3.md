# Camellia Conversation v3

## Preflight — 2026-10-19

- Previous worktree: `fix/camellia-chat-transient-recovery-20261019`, HEAD `6bca6176c17b4edd129705265cdf8ea581d4ec52`, clean. Open PRs: 0.
- Local `main` was stale (`3b1cbe1`); fetched remote main/HEAD `98797cdbb33ec91baa9de91abb356b89fdff1181`. This branch starts there: `feat/camellia-conversation-v3-20261019`.
- `ConversationWorkspace`: separate threads, title/search, 30-item Library pages. `CamelliaScreen`: 40-entry message pages and same-thread retry.
- `AIConversation` has no active style; `AIMessage` supports user/assistant only. Local validation and cloud archive restoration currently reject system markers; both must change together.
- Gemini: server-owned prompt, Admin eligibility, shared Firestore limiter, bounded provider recovery, current-thread sanitized history capped at eight entries. No client-owned prompt or provider choice.
- Memory is saved only after explicit confirmation. Tree/local fallback content is excluded from external history. Action cards use the existing server catalog allowlist.
- Safety is shared on client and server. Both styles must use it before persona generation; Safety thresholds and retries stay unchanged.
- Privacy describes the same free Gemini provider, data/context boundaries, optional local Memory and Firestore archive. Analytics has event/property allowlists and no conversation text.
- Cloud archive stores full thread/profile JSON. `profile/chat` is a separate compatibility summary; markers must not be inserted there as assistant messages.

No Production deploy, API key, environment variable, feature flag, Rules or claim change is authorized for this feature. Preview and explicit owner login/verification precede a separate Production decision.

## Implementation

- `models.ts` contains only public metadata. `model-server.ts` owns two fixed instruction sets following the existing common Safety prompt. Client requests carry only `modelId`; omitted means YURA for old clients, any other value returns 400 before quota/context/generation. The same provider, provider-recovery path and user/global shared limiter serve both styles.
- YURA explores the user's actual feelings without rushing into solutions. Lactone gently narrows the situation, priorities or choices. Both request 1–4 short sentences and at most one question. YURA's catalog card additionally requires an explicit wish to act; Lactone may offer one suitable allowlisted card. Listening-only/medical exclusions and the Action catalog remain common. No extra provider, character asset, tier or auto-switch.
- A native modal dialog provides checked text choices, arrow/Home/End focus navigation, Escape, Tab containment, background inertness and restored focus. Selection is explicit and disabled during an in-flight reply. Changing a selection neither sends a request nor clears a provider error. Retry keeps the style of the failed request, with explanatory text if the header has since changed.
- Optional `AIConversation.activeModel`, `AIMessage.assistantModel`, and `Profile.lastConversationModel` use `yura | lactone`. A switch after conversation has begun appends `{role:'system',type:'system_model_switch',text:'',from,to,id,createdAt}`. Empty drafts need no marker. Last selection initializes new chats; reopening a legacy thread defaults to YURA without altering old message attribution.
- New assistant labels require verified response `modelId` plus `provider:gemini` and no Safety fallback. Old/unattributed, local Tree/offline, errors and shared Safety responses remain labeled Camellia. We do not invent YURA attribution for past chats.
- Both local validation and full cloud archive restoration accept the added optional metadata/typed markers. Existing version/key/archive collections are unchanged; no bulk migration or Firestore rewrite. The compatibility chat projection and Gemini context exclude system markers. Gemini history still contains at most eight sanitized same-thread entries; no all-thread/Memory/Tree expansion.
- Library retains search, dates, 30-row paging and 40-entry thread paging, adding a small style path badge. Existing Today entry points stay unchanged. Memory still requires explicit preview/confirmation; no automatic save and no unnecessary `sourceModel` field.
- Both Privacy surfaces describe two Camellia styles sharing Gemini. New `conversation_model_selected`/`conversation_model_switched` events accept only enum model IDs. No message/title/Memory/Check text or identity fields are added.

## Validation and remaining acceptance

- `npm run lint`, `npm run typecheck`, and all 40 `npm test` suites PASS, including existing Gemini/provider recovery, SDK compatibility, Safety, Action, Memory, archive/deletion/privacy and Circle/Place regressions.
- Chromium local component fixture: 375, 390, 412, 768, 1280 PASS. Covers Library search/pagination, legacy records, 80-entry history, YURA 3 turns → Lactone 3 turns → YURA, both style labels/markers, reload/reopen/preference, keyboard focus/Escape/inertness, composer and no root horizontal overflow. Synthetic auth/API are explicit; this is not live Gemini/OAuth/Firestore evidence. Reduced-height input focus simulates a keyboard viewport, not a physical OS keyboard.
- The 20-pair matrix in `tests/fixtures/conversation-v3-pairs.json` records expected differences. The server tests prove 20 distinct prompt routes and shared boundaries using synthetic generation; they DO NOT prove live reply quality. Six urgent boundaries × two styles produce identical existing Safety replies before model generation.
- Required before Production approval: owner-authorized Preview login, actual Gemini results for all 20 pairs reviewed for meaningful differences/naturalness/shortness/Safety, both-direction same-thread live switching and real logout/login restoration. No owner credential/session or Gemini API secret exists in this execution environment. Do not substitute local responses, public GET status or past Production confirmations for this new acceptance.
- Physical mobile keyboard and screen-reader acceptance remain manual checks. No Production deployment is part of this change.
