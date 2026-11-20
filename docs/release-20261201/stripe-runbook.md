# Stripe接続・受入・障害対応（最終候補）

本番の課金開始は運営の明示承認まで行わない。キー/カード/メール本文をチャットやgitへ送らない。ここに記載した未決定値を自動適用しない。

## 1. 環境を分ける

|環境|Vercel secret設定|専用Firestore root|権利|
|---|---|---|---|
|Preview / Stripe Sandbox|CAMELLIA_STRIPE_ENABLED、CAMELLIA_BILLING_MODE=test、sk_test_で始まるSTRIPE_SECRET_KEY、STRIPE_WEBHOOK_SECRET|camellia_admin/release_phase1/billing_sandboxes/stripe_test|本人admin/billing_test_subscription|
|Production / 本番Stripe|別承認後にmode=liveとsk_live_、本番用Webhook secret|既存camellia_admin/release_phase1|本人admin/billing_subscription（旧path維持）|

Preview/live・Production/testをコードで拒否。テストのconfigを本番rootへ書かない。販売者表示APIも環境に合うrootを使う。テスト権利を本番が読まず、返金/削除がlive権利へ影響しない。テストの売上は本番Outboxへ送らない。既存未分類台帳を推測で移行/削除しない。詳細stripe-mode-isolation.md。

## 2. Stripe側の準備

1. Sandboxを用意。JPY500/月・数量1・税込総額500の固定Priceを作る。税/割引で500円以外にならないよう確認。
2. Customer Portalは有効、解約は期間末、支払い方法/請求履歴を管理可能にし、subscription_updateは無効。承認したPortal configuration IDを取得。
3. CheckoutのTerms URLを承認済みの正確なoriginのterms.htmlへ設定。
4. Webhook送信先は同じ固定Previewの `/api/camellia/billing-webhook`。invoice.paid、invoice.payment_failed、customer.subscription.updated/deleted、charge.refundedを登録。SDK/APIはStripe23.2.0 / 2026-11-18.endiveと合わせる。
5. 署名secret等はVercel Previewへ直接保存し、同じ固定branchをredeploy。Productionや新しいLINE callbackを追加しない。

## 3. テスト専用configの承認

上記のテストroot/config/billingに設定。未確認のapprovedをtrueにしない。

- approved/enabled/provider=stripe/mode=test、monthlyPriceId、priceYen=500/currency=JPY/interval=month、approvedBy/approvedAt。
- checkoutEnabledは新規受付だけのスイッチ。止めてもWebhookとPortalを保持する。
- checkoutOriginは固定Previewの正確なhttps origin（末尾slashなし）。termsVersion/disclosureVersion/portalConfiguration。
- disclosuresApprovedとdisclosure。version/approved/approvedBy/approvedAt、実際に公開してよいseller/representative/address/contact/paymentTiming/cancellation/refund。利用者の情報やキーを入れない。
- benefitsApproved/conversationPolicyReviewed、承認済みconversationPolicy（version/dailyLimit/historyMessages/historyChars/approvedBy/approvedAt/approved）。Plusの数値は未決定なので、承認前は購入を開始しない。無料日30の仕様は変更しない。
- テストroot/config/retentionでbilling_customers/contracts/checkouts/events/receipts/analytics_outboxの保持を承認。法的保存対象を仮の年数で削除しない。
- 新しい有料枠を30回より増やす承認がある場合だけ、テストroot/config/ai_observationへpaidExpansionApprovedとprimary/fallbackの有効な承認単価を設定。設定不足で既存Free30を止めない。

型とvalidationの正本はcheckout.ts / conversation-policy.ts / retention-policy.ts。設定だけで実Stripe受入PASSにしない。承認された表示はbilling.htmlから確認できる。Test表示があることと、本番の公開表示が混ざらないことも確認する。

## 4. Sandbox受入（実接続は未確認）

専用の消してよいテストIDで行う。実カード・普段の利用者の契約を使わない。

1. 同じIDでMyのPlus表示→条件/販売者情報/500円/月/自動更新/解約条件を確認→明示同意→Checkout。
2. Stripe公式のテスト支払い→実署名Webhook→Previewで権利。return URLだけで権利を付けない。本番でそのtest権利が付かないことも確認。
3. 同じeventをDashboardから再送し冪等。更新、支払い失敗、古いinvoice順序、解約予約、期限切れ、全額/部分返金を検証。部分返金はreviewRequiredで、勝手な按分をしない。
4. 個人記録削除の前に専用テストIDと確認し、削除後も `/?open=billing` から同じ本人確認で履歴/Portalへ到達できることを確認。契約/台帳を個人記録削除で消さない。
5. Testの顧客/契約/返金/cleanupが本番台帳/権利を変更しないこと、Test売上が本番PostHogへ入らないことを確認。
6. 日時/source SHA/実操作者/非公開のtest event照合/権利・台帳結果を残す。公開資料に鍵・カード・メール・顧客IDを残さない。

実接続/購入前のSDK署名fixture、local HTTP、emulator、画面遷移は実Stripe成功に数えない。実キー/設定をこちらで確認できていない。

## 5. 障害・停止・復旧

新規購入だけ止めるならcheckoutEnabled=false。処理中セッションが即取消になるわけではない。運営がStripe Dashboardで未完了sessionのexpire/処理中支払いを照合する。Webhook/Portalを止める全面停止は再送/未処理回収計画を伴う。

ネットワーク切断後は同じprotected intent / Stripe idempotency keyを再利用。14分以上の未確定intentは運営照合へ。45分のsession期限前に別requestで二重購入しない。incompleteを含む既存subscription/Plus/試用があれば新規請求を拒否する。

署名不一致は400、同一重複は200、Stripe正規参照/DB障害は503で再送対象。customer/Auth作成世代の不一致は409として調査し、別UIDへ自動付替しない。任意にpaidイベントを偽造/再署名して復旧しない。

500円/正規Invoice/InvoicePayment/PaymentIntent/Priceとcustomerを再確認して付与。更新失敗で未払期間を作らず、支払済期間は保持。解約予約で期間を消さず、全額返金は該当期間だけを無効化。旧権利を守る。

削除はlifecycleの運営承認/終了レビュー/holdを経る。Sandboxは--stripe-test。Stripe自体の保存/顧客閉鎖は別操作。408073f以降のmode分離・v4対応・security修正を保った版をrollback下限とし、古い混在版へ戻さない。

## 6. 再現用のローカル検証

`npm run lint` / `npm run typecheck` / `npm test` / `npm run test:firestore` / `npm run build`。

`python tests/run-final-release-browser.py` はinstalled Python Playwrightと/usr/bin/chromiumを使い、localhostにfixtureを起動して5幅を検証する。Auth/Stripe/Gemini/OSは合成。一般公開しない。実操作と合成結果を区別した証拠はtest-evidence.md。

計測には本人同意と独立したanalytics UUIDが必要。未設定の旧顧客へFirebase UIDを代用せず、正規支払いの権利は付与し、計測が欠けることを別に扱う。
