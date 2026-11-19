# Stripe接続・受入手順

この変更は公開許可ではない。Productionの設定変更/課金/送信は別承認。担当者は秘密値をチャットやGitへ送らずVercelの対象環境へ直接保存する。

## 現在の実装範囲

公式stripe 23.2.0、API 2026-11-18.endiveを固定。raw bytesにStripe-Signatureを検証。invoice.paidだけでも金額を信用せず、canonical invoice/単一500JPY月額price/paid InvoicePayment/succeeded PaymentIntentの同一customerを確認する。署名付きでもcheckout.session.completedだけではPlusを付けない。

customer→UID→Auth作成日時のサーバー専用bindingで誤付与を防止。既存webhook台帳のtransaction/idempotency/旧期間/返金順序/有効期限/既存operator権利保護を再利用。ブラウザ申告やURLのsuccessは権利の根拠にしない。

全額返金は該当期間のPlusを無効化。部分返金はreviewRequiredとして記録し、独自の権利按分規則を作らない。更新失敗で未払い期間を付けず、既に支払い済みの期間は消さない。解約予約後も支払済み期間の期限を維持。期間終了後の権利はread-timeでも失効。

支払い通知の解析/Stripe通信/DB障害は503にしてStripe再送対象とする。秘密・本文をログへ出さない。署名不一致は400、重複同一イベントは200。公式署名テストは実際の鍵や決済の成功証明ではない。

## 準備項目（この作業では設定しない）

1. Stripeアカウント/本人・事業審査、入金口座、公開事業者表示、規約・返金/解約方針を運営確認。
2. SandboxでJPY500/月/数量1の固定priceを作成。税込価格の扱いを確定し、別途税額を加算して500円を超えないよう確認。
3. Previewにのみtest鍵、Productionにのみlive鍵。`CAMELLIA_STRIPE_ENABLED=true`、`CAMELLIA_BILLING_MODE=test|live`、`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`。Preview/live・Production/test混在はコードで拒否。キーはpublic prefixを絶対に付けない。
4. サーバー専用 `camellia_admin/release_phase1/config/billing` にapproved/enabled/provider=stripe/mode/monthlyPriceId/priceYen=500/currency=JPY/interval=month/approvedBy/approvedAt。設定欠落では503。一般利用者は書けないRulesが必要。既存共有Firebase全体Rulesをテストfixtureで上書きしない。
5. `/api/camellia/billing-webhook` を登録。対象invoice.paid、invoice.payment_failed、customer.subscription.updated/deleted、charge.refunded。WebhookのAPIバージョンを固定SDKと合わせる。raw body parser無効を実デプロイで確認。
6. Checkout/Portalは後続PRで接続。ここまでのPR単独では購入UI/顧客bindingの自動作成はまだ提供しない。

## Sandbox受入（未実施）

購入→署名付き実Webhook→500円/Plus付与→更新→支払失敗→解約予約→期限切れ→全額/部分返金→同じWebhookの再送→古いinvoiceの返金順序→障害復旧。テスト用アカウントだけを使用し、普段の利用者に請求しない。

実行日時、source SHA、Stripe test event IDの非公開証拠、権利と台帳の結果、実操作者を残す。実カード番号/鍵/本文/メールを公開ドキュメントへ残さない。Checkout遷移/署名fixture/emulatorを実Stripe決済PASSに数えない。

## 障害・復旧

- 新規購入を止める場合、まずcheckout受付を止める。既存権利と署名検証付きWebhookの処理は維持して更新/返金の取りこぼしを防ぐ。全面緊急停止はStripe側再送と未処理台帳の回収計画を伴う。
- 成功URLから復帰しただけなら「確認中」と表示。ユーザーに連打/再購入を促さない。
- 回復後はStripe Dashboardの未配達イベントを同一IDで再送し、台帳の重複防止を確認。任意の再署名/偽のpaidイベント作成で復旧しない。
- 不明なcustomer/別Auth作成日時は409として運営調査。自動で別UIDへ結び直さない。
- Plus完了イベントの送信先はpseudonymous UUIDがある場合のみ。Firebase UIDへのfallbackを禁止。UUID未設定の旧顧客も支払い済みの権利は正常に付与し、計測が欠けることを別に扱う。outboxを作っただけでPostHog着信済みとしない。
- 既存v4対応mainをロールバック基点として維持。customer/receipt/idempotency台帳を消して旧コードへ戻さない。

## Checkout/Portal接続（後続PR）

購入は同じサーバー設定に加え、`checkoutEnabled=true`、`checkoutOrigin`（固定Previewまたは本番の正確なorigin）、`termsVersion`、`disclosureVersion`、`disclosuresApproved=true`、`portalConfiguration`が必要。

`disclosure`にはversion/approved/approvedBy/approvedAtと、seller/representative/address/contact/paymentTiming/cancellation/refundの実際の公開表示文を設定する。秘密値や利用者の情報を入れない。未設定なら購入停止。`/billing.html` は承認済みの項目だけを公開APIから取得し、準備中なら購入できないことを表示。元のbilling設定や鍵・顧客IDは返さない。

Stripe DashboardでTerms URLを設定し、Portalは解約を期間末、支払い方法/請求履歴管理を許可、subscription_updateは無効の承認済み構成を用意する。コードは構成を再検証してからPortalへ移動する。解約は個人記録削除や利用停止後もverified identityから到達可能。

テスト用Priceは税込総額500円（exclusive税を追加するPriceは拒否）。Checkoutはカード/数量1/プロモーションコードなし/自動trialなし。顧客metadataにUID・メール・健康/会話記録を送らない。Stripe自身が決済に必要な情報を購入者から受け取ることは別途Privacyへ正確に記載する必要がある。

通信が切れてもprotected intentとStripe idempotency keyで同じ手続きを再利用。Myで開き直した場合、本人の未期限切れpending requestを返して再開。古い未確定intent（14分以上）は新規発行で回避せず運営照合へ。Checkout作成後に応答だけ失われた場合、同じcustomerとopaque client_reference_idをStripe Dashboardで確認する。45分のsession期限前に新規requestで二重購入しない。既存subscription（incomplete含む）/有効Plus/試用があれば新規請求を拒否。

新規受付停止は`checkoutEnabled=false`。既にStripeで開かれたセッションまで即時取消になるとは言わない。必要なら承認済み担当者がStripe Dashboardで未完了セッションをexpireし、処理中支払いを照合する。Webhook処理とPortalは新規受付と分離して維持する。

## 自動検証の再現

- `npm run lint && npm run typecheck && npm test && npm run test:firestore`
- `VERCEL_ENV=production npm run build`
- `node tests/browser/stripe-checkout-server.mjs` （ローカル4181、認証/計測はfixture、実APIへの接続なし）
- 別端末コマンドで `python tests/browser/stripe-checkout.py` （実Chromium、375/390/412/768/1280、支払いAPIもfixture）

テスト用fixtureサーバーを一般公開しない。これは実ログイン/Stripe Sandbox/実機の代替PASSではない。実Stripe受入までは支払い公開不可。


## 支払い管理の直接入口

`/?open=billing` はプロフィール再作成・個人記録の引き継ぎを要求しない本人確認専用入口。販売者情報からも開ける。以前と同じメール・LINE・Googleを使い、別IDへ自動統合しない。ローカル合成検証と、Stripe Sandbox/実Authの受入を区別する。詳細は[billing-management.md](billing-management.md)。Stripe接続障害時の解約窓口と受付手順も、課金前に運営が確認する。
