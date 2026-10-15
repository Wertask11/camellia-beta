# Camellia β2 — Release Phase 1

女性の日常のウェルビーイングを支える、4タブ（Today / Camellia / Discover / My）のサービスです。診断・治療・健康状態の断定は行いません。

## 実装済み

- LINE Login / Google Login（Primary）、既存利用者向けSchoolPark Passport連携。本人確認なしのアカウント統合なし。
- localStorage v3、既存SchoolPark Firestore同期・復元・削除、プロフィール、My Tree、明示保存Memory。
- Today One Flow：Check → 今日のあなた → 過ごし方 → 今日の一枚 → 今日どうする？ → 明日のCamellia。
- JST日次比較と月曜始まりの週比較（今週5日以上の記録がある場合のみ週表示）。原因を推測せず、任意入力がない項目は比較しません。
- Discover：74候補、6カテゴリ。Todayの提案を除き、表示・選択・完了・興味なし・保存履歴を順位に反映。短い行動はsteps → できた / あとで / やめる。
- Gemini会話：Vercel Node Function、認証・最小文脈・短い履歴・Safety・有界なmodel recovery。既存ルールengineはOFF時に利用可能。
- Circle MVPのコード：6テーマ、参加/退出、専用表示名、投稿/編集/削除、コメント、やさしいreaction、通報、ブロック/解除、運営削除。**Release Gate未達のため初期OFF。現在LIVEとは認定しません。**
- PlaceはComing Soon。店舗・予約・決済・位置情報は提供しません。

## 開発・検証

Node.js 22.13以降。`npm ci`、`npm run dev`。`npm run lint` / `npm run typecheck` / `npm test` / `npm run test:gemini` / `npm run test:phase1` / `npm run test:firestore` / `npm run build`。

Vite devはVercel `api/` Functionsを実行しません。実認証/Functionsの確認にはVercel Previewが必要です。テスト用エミュレータはdemo projectのみを使用し、本番認証を偽装しません。既存のsynthetic-auth UX harnessを実認証のRelease Gate証拠には使いません。

## Gemini / Privacy

`api/camellia/chat.ts`は軽量な状態確認・flag判定を担当し、POST時に`lib/conversation/gemini-runtime.ts`を読み込みます。状態確認の失敗だけで端末内会話へ固定しません。公式 `@google/genai`。Primaryは`GEMINI_MODEL`（default `gemini-3.8-flash`）。5xx/試行timeout時は`GEMINI_FALLBACK_MODEL`（default `gemini-3.1-flash-lite`、空で無効）へ最大1回。SDK内retryなし、14秒/試行・28秒全体・40秒client。失敗モデルは同一Function instance内で2分避けます。Liteはminimal thinking/512 token、他はlow/2048 token（内部思考込み）。

送信するのは今回の本文、Geminiで返答した直近最大8メッセージ、serverから取得した今日の気分・Today stage・カタログで検証したActionのみ。保存Memory・My Tree・生理記録・プロフィール・UID・token・全履歴をGeminiへ送りません。既知名と連絡先を伏字にしますが、本人が本文へ直接入力した未知の個人情報は送信され得ます。Treeから開く会話は端末内限定。ログはstage/statusなどのみ、本文・key・raw responseは保存しません。PostHogもallowlistのみ。

`GEMINI_DATA_POLICY=free|paid|unknown` は実際の利用契約を確認して設定します。Preview/Productionから契約プランを推定しません。無料枠ではGoogleの製品改善利用の可能性があります。実契約・実運用の確認なしにPaid扱いやREADYとしません。Privacy/Terms/Community Guidelinesはpublic/にあります。

## 共有Rate Limit

既存Firestoreのclient拒否領域`camellia_admin/release_phase1/rate_windows`を使い、**userと全体の予約を同じFirestore transactionで確定**します。初期値20 requests/user/5分、全体1000/5分。`CAMELLIA_CHAT_RATE_USER` / `CAMELLIA_CHAT_RATE_GLOBAL` / `CAMELLIA_CHAT_RATE_WINDOW_SECONDS`で変更可能。固定window方式です。

server credentialsがあれば共有制限を使用します。`CAMELLIA_SHARED_RATE_LIMIT_REQUIRED=true`なのに未設定・障害ならfail closed。移行前の既存環境でcredentialsもrequired flagもない場合のみ従来のinstance limitを維持し、本番共有化PASSとはしません。GET APIの`rateLimitMode`で選択方式を確認できます。独立した2クライアントが同じ実Firestore emulatorへ並行予約するテストで共有を検証します。

## Circleと権限

全データは既存保護領域`camellia_admin/release_phase1`配下。テーマはコード内catalog、他は`circle_memberships/posts/comments/reactions/reports/blocks/moderation_audit`。client直接アクセスは拒否し、verified Firebase ID tokenとserver APIで権限を判定します。匿名認証を拒否、プロフィール同意が必要。投稿には本人が入力した文章のみ、公開IDはHMACでUIDと分離。通報/ブロックは相手へ通知しません。参加者でなければfeed/投稿/コメント不可、他人の編集/削除不可。運営削除はtrusted `camelliaModerator: true` custom claimのみ。本文のmoderator属性や表示名では権限は変わりません。

`VITE_CIRCLE_ENABLED=true`（build）と`CAMELLIA_CIRCLE_ENABLED=true`（server）を、実認証・複数ユーザー・deployed Rules・index・moderation・Privacy・5サイズのgate通過後に設定。初期OFFのままではDiscoverのCircleはComing Soonです。Placeはflagに含めません。

## Server環境変数とリリース手順

`.env.example`を参照。鍵をVITE_/NEXT_PUBLIC_へ入れないでください。

- 既存：GEMINI_API_KEY、GEMINI_MODEL、GEMINI_FALLBACK_MODEL、CAMELLIA_GEMINI_CHAT_ENABLED、CAMELLIA_GEMINI_CHAT_PRODUCTION_APPROVED。
- 共有ストア：FIREBASE_SERVICE_ACCOUNT_JSON（emusch-2a111用、server only）、CAMELLIA_SHARED_RATE_LIMIT_REQUIRED、Rate Limit設定。
- Circle：CAMELLIA_CIRCLE_SIGNING_SECRET（安定した32文字以上のserver secret）、CAMELLIA_CIRCLE_ENABLED、VITE_CIRCLE_ENABLED。署名secretの変更には公開ID/ブロック対応の移行が必要。
- 契約確認：GEMINI_DATA_POLICY。まだ不明ならunknown。

`security/README.md`に既存Rules境界・必要なindex・TTL・moderator設定を記載。snapshot rulesを他サービスの本番Rulesへ上書きしないでください。実credential・index・TTL・deployed Rulesを確認し、本人ログインでPreviewの全導線と複数ユーザー操作を検証してから有効化します。このPhase 1 PRは自動merge/本番ONを行いません。

### Server SDK互換性

`firebase-admin`は`13.10.0`へ固定しています。14系の認証依存（jwks-rsa4→jose6）は同期require(ESM)に依存し、これが無効なserverless runtimeでERR_REQUIRE_ESMになります。更新時は`node tests/server-sdk-compatibility.mjs`とFirestore emulatorを通してください。Gemini公式SDKは変更していません。
