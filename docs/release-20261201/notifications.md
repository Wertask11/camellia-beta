# Web Push実装・運用（未配信）

## 方式の選定

|方式|利点|条件/限界|今回|
|---|---|---|---|
|Web Push/VAPID|ブラウザ標準。メール/SMS事業者の契約が不要。端末の明示許可を利用|HTTPS、対応ブラウザ、端末の省電力/通知設定の影響。実OS検証必要|実装。まだ配信しない|
|メール|広い端末対応|送信ドメイン・事業者・配信停止/到達管理が必要。登録用メールを宣伝用へ勝手に転用しない|未採用|
|LINE公式通知|利用者が慣れた経路|公式チャネル/同意/費用/送信制限が別途必要。LINEログインを配信同意と扱わない|未採用|

料金契約を増やさず準備できるWeb Pushを接続。暗号化と署名はweb-push 3.6.7を固定し、既存Node/CommonJSパッケージ相当からの読込を試験。4.0.0はESM構成のため今回の保守対象へ入れず、3系の型定義と揃えた。実際の配信成功はライブラリの導入では証明しない。

## 既定OFF・公開前の設定

この作業では鍵生成/保存・通知許可の要求・配信・スケジュール登録を行わない。例示値を本番設定に流用しない。

- server env: `CAMELLIA_WEB_PUSH_ENABLED=true`、`CAMELLIA_PUSH_PUBLIC_KEY`、`CAMELLIA_PUSH_PRIVATE_KEY`（一度作ったVAPID対を安全に保持）、`CAMELLIA_PUSH_SUBJECT`（運営のmailto連絡先）、`CAMELLIA_NOTIFICATION_DISPATCH_SECRET`（暗号学的乱数32byteの64hex）。秘密鍵とdispatch secretにpublic prefixを付けない。
- server config/notification_delivery: approved/enabled/permissionReviewed、driver=web-push、approvedBy/approvedAt、timeToLiveSeconds（60〜86400、提案3600。保存期間ではなく配送TTL）。
- config/retention.collections.notification_subscriptions: approved/approvedBy/approvedAt、mode=until_revoked。購読中は配送に必要、停止/無効時はURLと鍵を除去。
- 同notification_deliveries/notification_push_attempts: approved/approvedBy/approvedAt、retentionMsを運営決定。月次の重複抑止を途中で消さないため32日以上が技術条件（提案35日）。
- 未設定ではready=false。既存の希望の保存・無料機能は止めない。上述の設定が揃ってもschedulerは自動登録しない。

## 本人の操作

Myで通知の好み・種類・頻度を保存→「この端末への通知」を開いて公開状態を確認→本人が許可ボタンを押す→OS許可→購読を本人IDへ登録。開いただけ/未公開時は許可を求めない。許可はクリックに直接結びつけ、古いstatusは再確認する。匿名利用で基本機能をロックせず、通知に必要なIDの理由を案内する。

1IDの最後に登録した1端末を対象。別端末への切替を表示し、異なるIDの購読を上書きしない。希望をOFF、明示停止、個人記録の削除、購読無効のいずれかで配送先URL/鍵を除去する。停止はアカウント利用停止後もverified identityで可能。

ロック画面は常に「Camellia / 今日は、自分のために何する？選択肢を見にいく。」だけ。incoming payloadの本文/URLはworkerが信用せず固定表示・固定Discover導線。SWにはfetch handlerや個人記録のoffline cacheを作らない。

## 運営の送信手順（別承認が必要）

`POST /api/camellia/notification-settings?dispatch=1`、Authorizationにdispatch secret、bodyは既知topic=place/circle/reflectionと任意after cursorのみ。任意の宛先/UID/本文をクライアントから送らせない。topicを選んだ運営の汎用案内の配信であり、未実装のCircle即時コメント通知と誤認させない。初回は承認された専用アカウント・端末だけの検証環境を使う。

登録済み配送先を50件ずつ読み、JSTの日/週/月の本人設定・種類・全topic共通の期間claim・停止/削除/凍結状態を再確認。実行時間で一旦止めた場合は最後に処理したcursorを返す。nextCursorを次の呼出へ渡し、nullで終了。今回cron/自動送信は設定しない。正式な配信タイミング・内容対象・開始判断は運営が決める。

送信の重複はFirestoreのclaimで抑止。driverでも最終claimを確認。providerの同一key処理を無条件で信用しない。不明/タイムアウト/5xxは保留し、再送しない。明確な拒否だけ運営が原因修正して制御下で再試行。404/410は購読URL/鍵を除去し再登録が必要。配信サービスへの受付をOS表示成功と呼ばない。

本人画面は直近状態を表示。全履歴は非公開notification_deliveries/notification_push_attempts台帳で運営確認する。本文・名前・テーマは保存しない。停止操作が送信済み/既に処理中の通知を取り消すことは保証しない。

## 保持と物理削除

通知rate/配信claim/driver attemptは既存の承認済みcleanup allowlistへ追加。createdAt/expiresAtを評価し、dry-run→対象digest→承認applyで処理する。TTLやcronは未デプロイ。expiresAtだけで削除済みとは報告しない。月次claimを途中削除して再送可能にしない。

## 実機の未検証事項

Android Chrome、iPhone Safariの実OS通知許可/表示、Samsung Internet、バックグラウンド、機内モード、省電力、音・バッジ、端末間切替。iPhone Safariは通常ホーム画面追加等の条件がある。ブラウザの対応は実OSで確認する。FCM/Mozilla/Apple/Windows通知hostをallowlistにするが、query付き等の未対応endpointは安全に拒否。サポートするOSの保証は実機受入後。

ローカルの実ChromiumではUIを5幅操作するが、Notification/ServiceWorker/PushManager/Auth/サーバーはfixture。これはOS許可・実購読・実通知ではない。実SDKの暗号化生成とCommonJS読込、emulatorでの登録/二重送信/停止/不明結果/失効は別の自動試験。実送信・実表示は未確認。

## Previewでの経路整理

最初のPreviewはデプロイに失敗。APIファイルが14本となったため、新しいpush/dispatch入口を既存notification-settingsのqueryで分岐させ、認証と秘密鍵の境界は別の内部handlerに維持した。公開APIは12本へ戻し、機能追加で関数本数を増やさない。初回失敗の詳細ログは接続がなく参照できないため、元の原因を断定せず修正後のVercel結果を別途確認する。
