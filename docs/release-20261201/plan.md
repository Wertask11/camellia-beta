# 12月1日正式リリース：実装計画

監査基点：main fe7f85947a0799f9b4d4097e34c389839c3f7ec1。PR62〜83は統合済み、11/18以降の追加commitなし、開始時open PR0。過去の報告は証拠の日時/sourceを保持し、現コードの成功へ流用しない。

## 承認済み・未決定

運営回答（2026-11-19）：Stripe、Plus月500円、無料AI1日30回、紹介新規のPlus7日体験/自動課金なし、紹介者はJST暦月3件まで装飾選択・永久保有。紹介自体の回数上限は設けない。

月予算/専用AI回数・token・費用/紹介終了日/Plus会話上限・文脈/データ別保持期間は未決定。推奨値は提案として記録し本番値へ流用しない。未設定の受付・配信・削除は停止する。既存無料経路・既得権・記録は保護する。

## 担当ファイルと依存関係

|作業|所有する主なファイル|依存/検証|
|---|---|---|
|WS1 基盤・無料表記・現状監査|components/PlanCard,PlusOffer,TreeDecorations、docs/release-20261201|main上でAPI公開GET、元PR/CI/Rules/Indexを再照合。内部free enum/既存データは変更しない|
|WS5 Stripe|lib/billing、api/billing-*、PlusOffer、membership|raw署名/500円price検証/顧客binding/既存Webhook service再利用。サンドボックスキー・本番公開は別承認|
|WS2 共有・紹介|lib/partner,referral、share/referral API、PartnerShareDialog|WS5の保護された有料/試用権利と整合。既定OFFで準備し、HTTP発行/第三者閲覧/取消/失効を隔離emulatorで検証|
|WS3 通知・Circle|lib/notifications、notification API/worker、Circle連携|標準Web Push等を比較。通知本文は固定の非機微情報。配信登録/明示許可/停止を接続し、実送信は別承認。Circleの既存権限は保護|
|WS4 Place受入|lib/place、PlaceEditor/募集入口、operator tools|実店舗資料は運営準備。実在/掲載/写真証跡を非公開に保持し、一般applicantは公開不能|
|WS6 統合・運用|security/fixture Rules/index、release docs、operator/readiness、retention|未決定保持期間では削除せず、dry-run/承認digest/実行証拠を分ける。新sourceごとにlint/type/unit/emulator/build/必要な5幅を実行|

独立したPRで管理。後続は前段のbranchをbaseとし、main/Productionへの統合・配信は今回実行しない。固定Preview URLを維持し、LINE callbackを増やさない。外部契約が不要な実装は進め、実証できない工程は未検証/外部待ちとして保持する。

## 点数の定義

機能の評価は人間の点数ではない。実装20/認可・データ保護20/当該source自動試験20/Preview実受入20/本番運用受入20。未検証0、部分10、証拠の揃った範囲20。前回報告には同一尺度の数値がないため「前回数値なし」と記載し、架空の前回点・改善幅は作らない。正式Goは点数合計で自動判定せず、必須受入と承認の全件確認を要する。
