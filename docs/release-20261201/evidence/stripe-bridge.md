# Stripe bridge — 2026-11-19

基点: foundation b8bef2350516db5a00b68cf7fba7423426cc6e2e。

- lint / typecheck PASS
- unit 67/67 PASS（追加: 実Stripe SDK署名とraw bytes、mode誤用、canonical請求/500JPY月額/支払い照合、返金snapshot、Checkout完了のみでは無権限）
- Firestore emulator既存15 scripts PASS（支払済み/未払い/期限/全額・部分返金/順序/並列冪等/旧権利、pseudonymous UUIDとUID非送信を追加確認）
- VERCEL_ENV=production npm run build PASS

隔離fixture: StripeへのAPI通信、実決済、実Webhook配達、PostHog送信は行っていない。実Stripe Sandbox E2E、Previewでのraw body設定確認は未検証。Production変更なし。

UUIDのない旧bindingでも権利付与は妨げず、UIDを代替のanalytics identityとして使わない。outboxのPostHog配送自体は未接続。
