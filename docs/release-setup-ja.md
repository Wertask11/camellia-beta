# 年内リリースの設定手順（運営向け・まとめ）

コードはすべてmainに入っています。どの機能も「Vercelの設定」と「運営の承認（スクリプト）」の両方がそろうまで表に出ません。順番に進めてください。秘密の値はチャットやGitに貼らず、Vercelへ直接入れます。

## 0. 準備（パソコンで1回だけ）

1. このリポジトリを手元に用意して `npm ci` を実行します。
2. Firebaseのサービスアカウント（emusch-2a111）のJSONを、ターミナルで使えるようにします：`export FIREBASE_SERVICE_ACCOUNT_JSON="$(cat ~/Downloads/サービスアカウント.json)"`
   - JSONファイルは使い終わったら安全な場所に保管し、共有しないでください。
3. 以下の `node scripts/...` は、すべてこのターミナルで実行します。

Vercelの環境変数を変えたら、最後に **mainの最新Production deploymentをRedeploy** します（VITE_で始まる値は、ビルドし直さないと反映されません）。

## 1. Place（紹介掲載）を本番で公開する

| Vercel（Production） | 値 |
|---|---|
| CAMELLIA_PLACE_ENABLED | true |
| VITE_PLACE_ENABLED | true |

- 掲載を担当する人（あなた）に権限を付けます：`node scripts/place-operator.mjs --grant <あなたのUID>`
  - UIDはFirebaseコンソールの Authentication で確認できます。
- その後、Camelliaに入り直すと、Discover → Place → 掲載管理 から「紹介」を追加できます。
  - 候補一覧：/mnt/project-files/camellia/place-candidates-fukuoka.md
- 福岡の26件（オーナー承認済み、`data/place-introductions-fukuoka.ts`）：
  - Vercelに `CAMELLIA_PLACE_INTRODUCTION_BATCH=fukuoka-2026-11` を入れると、本番で最初にPlaceが開かれたときに1回だけ登録されます。
  - 公的な観光サイト（クロスロードふくおか）と公式サイトで住所・営業時間を確かめた14件は公開されます。出典は審査記録に残ります。
  - 残りの12件は下書きです。掲載管理で開き、公式サイトで確かめて公開してください。確かめることは各件の `check` に書いてあります。
  - すでにある場所は上書きしません。一度登録したあと、運営が非公開や削除にした場所は戻りません。
  - 手元から入れる場合：`node scripts/place-introductions.mjs`（確認だけ）／`--apply`（書き込み）

## 2. 決済（Camellia Plus 月500円）

[docs/stripe-setup-ja.md](stripe-setup-ja.md) の手順です。まとめると次のとおりです。

1. Stripeで「Camellia Plus」月500円の価格を作り、Webhookを登録します。
2. Vercelに `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`STRIPE_PLUS_PRICE_ID`、`CAMELLIA_APP_URL`、`CAMELLIA_BILLING_ENABLED=true` を入れて、Redeployします。
3. 承認します：`node scripts/billing-config.mjs --approve price_xxx "あなたの名前"`

承認すると、**パートナー共有もPlus会員に自動で開きます**。

まずテストモードの値で試し、テストカード `4242 4242 4242 4242` でPlusになることを確認してから、本番の値に入れ替えてください。

決済を始める前に必要なもの：
- 利用規約の「無料利用とCamellia Plus」の節を、決済を受け付ける内容に直すこと
- 特定商取引法の表示ページ

## 3. 友だち招待（両方にPlus 7日間＋椿の花の飾り、月3人まで、AI費用は月1万円まで）

| Vercel（Production） | 値 |
|---|---|
| CAMELLIA_REFERRAL_ENABLED | true |
| VITE_REFERRAL_ENABLED | true |

承認します：`node scripts/referral-config.mjs --start "あなたの名前"`
- 受付は既定で2027-03-31まで。変えるときは `--until 2027-06-30` のように付けます。
- 止めるとき：`node scripts/referral-config.mjs --stop`
- 招待中の会話の拡張（専用AI枠）は、Geminiの料金単価を `config/ai_observation` に登録するまで使えません。Plus 7日間と飾りは、それがなくても使えます。

## 4. 通知（Web Push、1日1回・週3回まで）

1. 鍵を作ります：`node scripts/vapid-keys.mjs`（出てきた2行をVercelへ）
2. Vercel（Production）に入れる値：

| Key | 値 |
|---|---|
| VAPID_PUBLIC_KEY | 手順1の値 |
| VAPID_PRIVATE_KEY | 手順1の値 |
| VAPID_SUBJECT | mailto:運営の連絡先メール |
| CRON_SECRET | 長いランダム文字列（`openssl rand -hex 32`） |
| CAMELLIA_NOTIFICATIONS_ENABLED | true |

3. Redeployし、承認します：`node scripts/notification-config.mjs --start "あなたの名前"`

承認後の動き：
- 利用者は My → 通知の設定で希望を保存し、「この端末で通知を受け取る」を押します。
- 毎日12:00（日本時間）に、Vercel Cronが送ります。
- 文面はいつも「今日は、自分のために何する？選択肢を見にいく。」だけで、個人の内容は出ません。
- iPhoneは、ホーム画面に追加したCamelliaでだけ受け取れます。
- 止めるとき：`node scripts/notification-config.mjs --stop`

## 5. Circleの運営権限

Circleは本番で有効になっています。通報を処理する人に権限を付けます。

`node scripts/circle-moderator.mjs --grant <あなたのUID>`

詳しくは [docs/circle-phase2a.md](circle-phase2a.md) を見てください。付けたあとは入り直します。

## 6. データの保存期間

承認します：`node scripts/retention-policy.mjs --approve "あなたの名前"`
- 利用回数や制限の記録：期限後90日
- 期限切れの共有リンク：30日
- 決済の記録：消さずに7年保存（税法）

実際の削除は、コレクションごとに `node scripts/retention.mjs <名前>` で件数を確認してから行います。そのあと `CAMELLIA_OPERATOR_CHANGE_APPROVED=true node scripts/retention.mjs <名前> <digest> --apply` を実行します。

退会（記録の削除）は、利用者がアプリの My → その他 から自分で行い、その場で削除されます。
