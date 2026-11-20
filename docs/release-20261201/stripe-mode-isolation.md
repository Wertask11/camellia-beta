# Stripe Sandboxと本番の分離（2026-11-20）

## 修正理由

候補f93ac2aまではAPI key/Stripe resourceのlivemodeを検証していたが、Firestoreの顧客/契約/支払い権利が共通だった。Previewのテストを、本番のpaid権利や売上と混同しないため保存先と読取を分離した。実Stripe契約/購入前に発見したコード不具合で、クラウドの台帳書換え/過去データの一括移行は実施していない。

## 保存先

- 本番/既存互換: `camellia_admin/release_phase1` 配下の既存billing_*、本人admin/billing_subscription。既存pathは変更しない。
- テスト: `camellia_admin/release_phase1/billing_sandboxes/stripe_test` 配下のconfig/billing、config/retention、config/ai_observation、billing_customers/owners/contracts/checkouts/events/receipts等。本人の権利はadmin/billing_test_subscription。
- PreviewのStripe設定はtestだけ、Productionはliveだけ。読取モードは信頼したVERCEL_ENVから決め、clientの指定やlocal planフラグを信用しない。本番はtest権利を読まず、Previewでも既存live/legacy権利を保護する。
- 本人Auth/個人記録は既存のまま。Sandbox権利でProductionのPlusへ昇格させない。テストの返金/削除/Portalは本番顧客/契約に触れない。
- Sandboxの支払いで本番plus_complete Outboxを作らず、Previewから本番売上dispatcherを実行しない。ブラウザのPreview行動イベントは$hostで本番と分離して集計する。
- 個人記録削除は契約/台帳/永久装飾を従来通り保護する。テスト履歴/管理画面にはテスト表示を出し、実請求・本番契約と呼ばない。

## 運営のテスト準備

Stripe Sandbox用のVercel Preview環境変数だけを準備し、上記の**テスト専用config**へ承認済みの販売表示/500JPY月次Price/Portal/会話条件/保持を設定する。実店舗・本番のconfig/billingやconfig/retentionへテスト用の値を上書きしない。秘密値はチャットやgitに入れない。新規購入の開始条件はStripe/Plus/保持の既存承認gateを維持する。

実テストには専用アカウントを使い、購入→署名Webhook→Preview権利→更新→支払い失敗→解約→返金→個人記録削除後Portalを確認し、Productionでそのテスト権利が付かないことを確認する。テストカードを本番画面で使わず、実カードで検証しない。

過去のunscoped台帳はmodeを推測して消したり再分類しない。既存の正規権利を保護し、実運用に古いテスト台帳がある場合はStripe側のmode/顧客/期間と照合して個別承認する。旧候補で本番Stripeテストを完了した証拠はない。

## 保持

private lifecycle CLIの `--stripe-test` は固定のテストrootだけを使う。billing_* とretentionの審査/hold/audit以外は拒否。本番とテストの保持承認/法的終了レビュー/digestを分離し、本番のglobal paused=trueもテスト削除を停止する。テスト削除で本番billing_subscriptionを消さない。period設定やクラウド削除はここでは実施していない。

## 試験

stripe-mode-cases / stripe-mode-firestore：同じcustomer/event/invoice IDを両環境へ置いても台帳が衝突しない、Productionがtest権利を無視する、Previewで旧live権利を保護、テスト返金/削除がlive権利を維持、テスト売上イベントを抑止、configと保持の分離。stripe-checkout/billing-managementの既存試験もテストrootへ正しく接続し、assertionを弱めていない。実Stripe SDK/providerは合成、実購入は未確認。
