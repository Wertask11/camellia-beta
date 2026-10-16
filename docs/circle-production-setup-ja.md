# Circleを本番で開く手順

2026-10-16：本人から一般公開・確認の指示あり。公開の承認と、接続・運営・実操作が成功したかの検証は別に記録する。秘密鍵・UID・tokenをチャットやGitへ貼らない。

## 1. Firebaseの接続をVercelへ保存

[Firebaseサービスアカウント](https://console.firebase.google.com/project/emusch-2a111/settings/serviceaccounts/adminsdk) → Firebase Admin SDK → 新しい秘密鍵を生成。プロジェクトIDはemusch-2a111。保存したJSONをパソコンのテキストエディターで開き、全文をコピーする。

[Vercel環境変数](https://vercel.com/school-park/camellia-beta/settings/environment-variables) → Add Environment Variable。Key=`FIREBASE_SERVICE_ACCOUNT_JSON`、Value=JSON全文、Environment=Production、Save。値を公開変数のVITE_へ入れない。

## 2. Circle用の設定

同じVercel画面で、以下をProductionへ追加する。

|Key|Value|
|---|---|
|CAMELLIA_CIRCLE_SIGNING_SECRET|32文字以上の、専用のランダム文字列|
|CAMELLIA_CIRCLE_ENABLED|true|
|VITE_CIRCLE_ENABLED|true|
|CAMELLIA_SHARED_RATE_LIMIT_REQUIRED|true|

専用のランダム文字列は本人のパソコンのターミナルで `openssl rand -hex 32` を実行すると生成できる。結果はVercelのValueへ直接コピーし、チャットへ送らない。設定後は同じ値を保持する。後から変更すると投稿者の公開IDに影響する。

すべて保存したら、mainの最新Production deploymentをRedeployする。Previewや古いbranchのデプロイを選ばない。

## 3. Firestoreの確認

実際のRulesがcamellia_admin以下への直接clientアクセスを拒否することをFirebase担当者が確認する。テスト用Rules snapshotを本番へ上書きしない。

ProductionでCAMELLIA_CIRCLE_ENABLED=trueの場合、build後のscripts/circle-indexes.mjsがsecurity/firestore.indexes.jsonのCircle用6定義を確認し、不足分だけ追加する。既存indexの削除・変更、Rules・IAM・claim・利用者データの操作は行わない。Preview・local・Circle OFFでは実行しない。結果は本番の/circle-setup-status.jsonで確認できる。buildingの場合は作成完了まで待つ。setup_failedの場合、権限を自動変更しない。

担当者が[Firestoreのインデックス](https://console.firebase.google.com/project/emusch-2a111/firestore/indexes)で不足分を追加する場合の定義：collection scope。circle_posts(circleId昇順,createdAt降順)、circle_comments(postId昇順,createdAt昇順)、circle_reports(status昇順,createdAt降順)、circle_posts(uid昇順,createdAt降順)、circle_comments(uid昇順,createdAt降順)、circle_memberships(circleId昇順,active昇順)。既存のSchoolPark用indexは保持する。

/api/camellia/circle?status=1&check=feedは、固定の投稿検索についてexplainOptions.analyze=falseで検索計画のみ確認する。投稿・利用者情報は取得せず、固定の成否ラベルだけ返す。初期化成功や検索計画成功は、認証・投稿・2-user・Moderationの実確認の代わりにはならない。

運営担当者へのModerator claimは既存のscripts/circle-moderator.mjsとdocs/circle-phase2a.mdの手順を使い、信頼できる本人を確認して設定する。今回の画面公開やbuildで自動付与しない。

## 4. 本人のスマホとPCで確認

[Circle入口](https://camellia-beta.vercel.app/?open=circle) またはDiscoverのCircleから開く。スマホとPCで別アカウントを使い、参加→投稿→相手が見る→コメント→Reaction→通報→Block/解除、編集・削除・退出を確認する。運営の通報処理と対応記録は別に確認する。同一アカウント2台は同期テスト用。

Placeは実在掲載0件のため、[公開デモ](https://camellia-beta.vercel.app/?open=place)で掲載イメージを確認する。デモを実在店舗として公開しない。実在Placeのserver flag・運営権限は、このCircle設定と一緒に自動変更しない。
