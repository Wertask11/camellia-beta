# 保存・失効・物理削除の一覧

期間は未決定のものを勝手に確定しない。推奨値はproposed-settings.md。技術的な期限、閲覧不能、原文除去、物理削除を分ける。本番TTL/定期削除ジョブは開始していない。

|データ/所有者・目的|保存とアクセス|失効/保持|削除実装と残ること|
|---|---|---|---|
|本人のCheck/会話/Tree/Memory/Reflection/私的Place体験|無料の端末領域、本人のv4 Firestore。本人と既存server管理権限|非利用を理由に自動削除しない。端末消去等のリスクを明示|個別削除/tombstone/export/復元/個人記録削除の回帰済み。新sourceの実端末再受入待ち|
|Circle本文/通報/Block/監査|server rootから参加者へ安全な公開名/本人入力だけ投影。通報/監査は運営のみ|退出/個人記録削除と別。新しい保持数値は未承認|本人/運営の本文除去は既存機能。全監査の期限消去は未接続/方針待ち|
|Place公開情報/許諾/担当scope/監査|server root/本人admin。私的証拠とUIDは公開しない|停止時非公開。保持数値は未承認|審査/変更/解除は接続。全事業記録の期限消去には残件|
|掲載申請/私的連絡先/申請監査|place_applications/place_application_audit。本人と運営だけ|保持承認前は受付OFF。進行中を期限だけで消さない|取り下げで本文/連絡先除去。閉じた案件のdry-run/digest/物理削除をemulatorで実行。実ジョブ未稼働|
|共有本文/本人履歴|partner_sharesと本人のpartner_shares。tokenはhashのみ|本人選択1日/7日または取消で閲覧不可。保持期間は別承認|失効/本文除去、承認済み期限処理による本体+履歴の物理削除はローカル試験済み。実ジョブ未稼働|
|紹介intent/code/grant/Identity HMAC/予算/AI予約/監査|非公開server root。本人へ必要な権利だけ投影|proof10分/試用7日と台帳保持は別。HMACは匿名化ではない|新規受付の保持gate、枠精算/未使用見積返却は接続。成立/HMAC/予算/全監査のライフサイクル物理削除は未接続/方針待ち|
|永久装飾と選択権|本人adminのprotected権利、本人Treeの装着|永久保有の確定方針|紹介処理の整理で権利を消さない。ID全閉鎖時の扱いは別判断|
|Stripe顧客/checkout/event/receipt/subscription|billing_customers/owners/checkouts/events/receipts、本人admin。serverだけ更新|保持/販売条件/Plus内容未承認なら新規購入OFF|署名・順序/取消/返金/履歴は接続。法定保存対象の削除は未接続・専門確認待ち。個人記録削除で契約を消さない|
|支払い分析Outbox/計測停止|billing_analytics_outbox/preferences。非公開、配送はallowlistだけ|申込帰属45分、本人停止/原本世代変更で送信抑止。保持は別承認|Outboxの承認済み期限物理削除は試験済み。停止設定の完全消去は共有Auth/契約との範囲判断待ち。実PostHog着信は未確認|
|AI使用量/原価/重複/無料枠|server root。本文なし・ID hash。運営だけ|価格/JST日次の境界と保存期間は別。既存無料を支える最小制限台帳は維持|許可済み期限処理あり。全月次台帳のライフサイクル/実請求照合は未完了|
|通知希望/購読先と鍵/配信履歴/claim|本人設定と非公開server root。本人へ必要statusだけ|停止時URL/鍵除去。履歴の技術最小32日、35日は未承認提案|明示許可/停止/無効購読除去/承認済み期限処理は合成検証。実OS/本番ジョブ未開始|
|分析イベント|端末配送queue/Project594848。本文なしのallowlist|DNT/opt-out/ID変更/原本削除を考慮。Project保持は未照合|端末抑止/payload試験済み。既送信person/イベントの削除、実着信/保持設定は未検証|

ログインIDそのものの削除、個人記録削除、支払い解約、公開Circle本文、永久権利は別の操作/運営判断として扱う。設定を承認するだけで未接続の全種類の削除が完成するとはしない。共有Firebase Auth自体を自動削除する機能は未実装・範囲判断待ち。
