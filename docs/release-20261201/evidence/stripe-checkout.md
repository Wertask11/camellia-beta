# Checkout/Portal検証 — 2026-11-19

基点: Stripe bridge 2be3daf。

- lint/typecheck PASS
- unit 68/68 PASS
- Firestore emulator 16 scripts PASS
- Production相当build PASS
- 実Chromium、375/390/412/768/1280: 同意前購入不可、明示同意、通信失敗時に同じrequest再利用、plus_start重複抑止、画面横溢れなし、Escape、準備中/Portalの各状態PASS。認証と決済APIは隔離fixture。

実装: サーバー500円Price/承認済み販売者情報/利用規約version/Origin、顧客Auth作成時刻の保護、Checkout作成とStripe冪等、pending再開、既存Plus/体験/未完了subscriptionの重複課金防止、Portal解約と履歴、私的データを返さない履歴API。

未実施: 実Stripe Sandbox購入/Webhook/解約/返金、固定Preview実ログイン、OS実機、Production反映。新しい販売条件の運営承認・Privacy/Termsの公開文レビューは別途必要。billing outboxの実PostHog配送は未接続。
