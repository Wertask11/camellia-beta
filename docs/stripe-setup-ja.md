# Stripeでの決済を始める手順（Camellia Plus 月500円）

コードは入っていますが、以下の設定をするまで決済は一切表に出ません（Plusの画面は「支払い受付は準備中」のまま）。秘密キーはチャットやGitに貼らず、Vercelへ直接入れてください。

## 1. Stripeのアカウント

1. https://dashboard.stripe.com/register で登録し、本人確認・口座・事業情報を入力して審査を受ける。
2. 特定商取引法に基づく表記（販売者名、連絡先、価格、支払時期、解約・返金の条件）をCamelliaの規約ページに用意する。返金方針：途中解約しても支払い済み期間の終わりまで利用でき、日割り返金はしない。

## 2. 商品と価格（まずテストモードで）

1. Stripeの「商品カタログ」→「商品を追加」。名前「Camellia Plus」、料金「継続」「月次」「500円」「税込」。
2. 作成された価格のID（`price_`で始まる）を控える。

## 3. Webhook

1. 「開発者」→「Webhook」→「エンドポイントを追加」。URL：`https://camellia-beta.vercel.app/api/camellia/billing-webhook`
2. イベント：`invoice.paid`、`invoice.payment_failed`、`customer.subscription.updated`、`customer.subscription.deleted`、`charge.refunded`
3. 作成後の「署名シークレット」（`whsec_`で始まる）を控える。

## 4. カスタマーポータル（解約・カード変更の画面）

「設定」→「Billing」→「カスタマーポータル」で有効化。解約は「請求期間の終了時」にする。

## 5. Vercelの環境変数（Production）

| Key | Value |
|---|---|
| STRIPE_SECRET_KEY | Stripeの秘密キー（`sk_test_`／本番は`sk_live_`）。制限付きキー`rk_`でも可 |
| STRIPE_WEBHOOK_SECRET | 手順3の`whsec_` |
| STRIPE_PLUS_PRICE_ID | 手順2の`price_` |
| CAMELLIA_APP_URL | `https://camellia-beta.vercel.app` |
| CAMELLIA_BILLING_ENABLED | `true` |

保存後、mainの最新Production deploymentをRedeployする。

## 6. 運営の承認（最後のスイッチ）

パソコンでFirebaseのサービスアカウントを使い、`node scripts/billing-config.mjs --approve price_xxx "承認者名"` を実行する。これでPlusの画面に「Plusにする · 月500円」が出る。止めるときは `--stop`（支払い済みの期間はそのまま有効）。

## 7. テストモードで確認してから本番へ

テストカード `4242 4242 4242 4242` でPlusにする → MyのプランがPlusになる → 「お支払いの管理・解約」で解約 → 期間の終わりまでPlusのまま、を確認。問題なければStripeを本番モードに切り替え、手順2〜6を本番の値でやり直す。

## 仕組み（運営向け）

- 申し込み：`/api/camellia/checkout`がログイン中の本人にStripeの顧客を1つだけ結びつけ、承認済みの価格でCheckoutを開く。ブラウザからUIDや価格は受け付けない。
- 反映：署名を確認したWebhookだけがPlusを付与する（既存の`lib/billing/webhook.ts`：重複・改変・返金順序・期間保護）。関係ないイベントは200で無視する。
- 返金：`charge.refunded`に請求書IDがない新しいAPI形式の場合は自動反映せず、Stripe側で運営が対応する。部分返金は運営確認に回る。

## 他の商品と同じStripeアカウントを使う場合

Webhookは、Camellia Plusの価格（STRIPE_PLUS_PRICE_ID）以外のイベントを200で受け流し、何も保存しません。Emuなど同じアカウントの他の商品の支払いでエラーにならず、Stripe側でWebhookが止まることもありません。Camellia Plus用には必ず専用の価格を作ってください（他の500円の価格を流用しない）。
