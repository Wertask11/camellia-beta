# 外部準備・未決定事項（2026-11-11）

本人回答：実店舗と決済サービスは未準備。Android Chromeと消してよい専用テストアカウントは用意済み。秘密情報をチャットへ送る必要はない。

|区分|現在|運営が必要とする具体的な対応|依存中の処理|
|---|---|---|---|
|実店舗|未契約/許可未確認|名称・公式URL・実在確認、掲載同意と写真権利の証跡を非公開で保管、情報/営業時間/体験/各リンク確認。担当者のLINE/Google identityを運営が照合|本物の公開掲載・実リンク・店舗集計の受入|
|店舗の任意有料|金額/価値未決定|基本無料を維持したまま、必要なら別に内容/契約/金額を決定|有料店舗受付は停止|
|決済|契約/サービス未選定|月500円の総額/税/法定表示/解約/返金方針、processor契約、sandbox、署名secretを安全な設定先へ登録。raw body署名adapter・checkoutを選定後に接続|checkout、実Webhook、サーバー権利、plus_complete実配信|
|AI料金/請求|実usage・単価承認・請求照合なし|現在のprovider条件/無料・有料のデータ方針、公式モデル別単価/通貨/確認日/承認、usage欠落と実請求の照合方法、保持・監視担当を決定|課金0や実原価の確定を表示しない。Free既存経路は維持|
|紹介条件|未決定|月予算、AI専用枠数値、正式開始の数値基準、装飾の最終デザイン、月3件超過時の新規側特典、他trialとの重複規則、期間、異常監視/停止担当|紹介受付・専用lane公開は停止。既定値で開始しない|
|装飾|最終デザイン未決定|承認した同一origin assetを配置し、実画像を確認してprotected catalogを登録。不可逆選択の説明も受入|未承認catalogから選べない。取得済み権利は保護|
|通知|方式/事業開始判断未決定|Web Push等の方式、本人の希望と許可取得/解除、driverの冪等key/配信照会、停止/不明結果の手順、保持と担当を決定|実driver/登録先作成/スケジュールは未実装・配信OFF|
|保持・削除|下表の保持期間/閉鎖方針未決定|データ種別ごとに責任者/期間/法的根拠/アクセス/削除を承認。個人記録resetと共用Firebase Auth/Camellia ID閉鎖を別に決定|cleanup/TTL/定期送信/全面閉鎖は開始しない|
|実環境アクセス|本executorから固定PreviewへCONNECT403|同じ固定URLを本人の端末で確認。開発環境の許可先を変更する場合はこのhostnameだけを追加し再確認|自動Preview実ブラウザ証拠なし。新しいLINE callbackの追加は不要|
|実機|Android用意済み、他未確認|下記の順で専用アカウントの結果を確認。iOS/Samsung/VoiceOver/TalkBackは使える実機で別途|合成Chromiumを実機PASSにしない|
|本番運用|未承認・未適用|PR順序/Rules/indexes/保持監視/rollbackをレビューし、具体的適用を承認|本番技術判定Bは保留|

## Android受入の順序

すべて固定Preview：
https://camellia-beta-git-codex-camellia-alpha-relea-161533-school-park.vercel.app/

更新commitとVercel成功を確認してから実施する。別PreviewやLINE DevelopersへのURL追加は不要。普段の大切な記録を削除しない。

1. Android Chromeの専用アカウントでPlaceのデモを選び、Myの「この体験を振り返る」へ「同期テスト」とだけ入力。保存表示と再読込後の表示を確認。
2. PCも**同じ専用アカウント**で同じ固定Previewを開く。上の記録が見えること、PCで短い追記→Android再表示を確認。ログアウト/再ログインでも確認。
3. Myのexportを本人端末へ保存。テスト記録を追加した後に不足記録だけを復元し、現在の記録が消えず、個別削除した記録も復活しないことを確認。別アカウントのexportを読み込ませない。
4. 両端末が同じ専用アカウントであることを確認してから、本人が消してよいテスト記録だけの個人記録削除を実行。古いタブを開いても復活しないことを確認。失敗したら操作を止め、成功と表示されていないか確認。
5. Circleは**別の2アカウント**を使う。投稿/コメント/リアクション/変更/取消/通報/ブロック/解除/自分の文章、権限を確認。新Place連携はOFFなので本番で勝手に有効にしない。
6. 実OSキーボードで会話入力/モデル選択/送信/閉じる、Chromeの戻る/再読込/低速/オフライン、画像、TalkBackの読み順/ボタン名を確認。

端末・provider・commit・成功/失敗だけを記録。氏名、投稿本文、UID、Headers、token、export原文はチャット/PRへ送らない。破壊テストの本人実行は専用アカウント限定。こちらから本人として認証しない。

## データ取扱い一覧

場所の `ADMIN` は `camellia_admin/release_phase1`、`USER` は `camellia_users/{uid}`。hashも匿名化済みと断定せず、アクセス制限された仮名データとして扱う。

|データ・所有者|目的/保存場所|アクセス|保持期間・実削除の現状|
|---|---|---|---|
|Memory/Reflection/私的Place体験・本人|本人の記録、端末v4・USER配下|本人client Rules。運用Admin資格は厳格管理|本人の個別削除/tombstone/個人resetはAndroid/PCで本人確認済み。実同時競合は未検証。端末export/原本backupは本人保管、cloudresetだけでは端末ファイルを消せない|
|Tree/会話/Check・本人|既存個人記録、同上|本人。Circle/店舗へ自動共有なし|既存削除とv4互換を維持。共用Auth閉鎖とは別|
|店舗証跡/操作ログ・運営/店舗|実在/掲載/写真権利の審査、ADMIN places等のprivate資料/audit|運営のみ証跡、担当者は自店の許可範囲。一般公開しない|保持期間未決定。一般personalresetで削除しない。実証跡まだなし|
|店舗scope/同意・運営/担当者|自店操作と無料掲載同意、protected role/agreements|運営が付与/解除、本人は自scopeのみ|解除CLIあり。監査保持未決定。実付与未実施|
|Placeクリックreceipt/日別集計・運営|重複排除と自店の閲覧/公式/予約/地図/問合せ件数、ADMIN place_metric_receipts/place_metric_days|server書込、担当者自店集計のみ|receiptの既存expiresAtは論理期限、実削除未開始。集計保持未決定。来店/予約成立ではない|
|紹介台帳/identity hash/intent・運営/本人|一度限り/自己紹介/重複抑止、ADMIN referral_*、本人protected trial/権利|serverのみ書込、本人には必要な権利だけ|intent10分は論理有効期限。その他期間未決定。承認cleanup未設定。hashを公開しない|
|装飾権利/選択・本人|永久保有、protected本人record|本人確認server API、client直接書換不可|プラン/受付終了で消えない。アカウント閉鎖時の扱いは別決定。未承認assetなし|
|AI request receipt・運営|二重dispatch抑止、ADMIN ai_request_receipts。ownerhash/日時/状態|serverのみ|40秒は実行境界、保持期間ではない。通常会話で保存されるため本番適用前に保持とcleanupを承認。実TTL未設定|
|AI usage receipt/日別数値・運営|token/試行/見積/不明、ADMIN ai_usage_receipts/ai_attempt_days|server、運営集計CLI。本文/UIDを集計へ出さない|個別数値保存はapproved retention必要。集計/ログの保持も未決定。invoice未照合|
|共有リンク・本人/明示受取人|本人が選ぶ最小内容、ADMIN partner_shares＋USER参照|server認証/opaque token、現在公開読取・発行OFF|取消/期限scrub/個人reset連携。expiresAtのみを削除証拠にしない。cleanup承認待ち|
|通知希望/登録先/配信receipt・本人/運営|希望/頻度/停止/重複防止、USER admin/通知関連protected record|本人設定は認証server、配信serverのみ|停止で登録先を削除、個人reset前停止。送信履歴保持未決定、driverなし、実配信なし|
|請求顧客binding/event/invoice/権利/outbox・本人/運営|検証済み決済と権利/分析、ADMIN billing_*、USER admin/billing_subscription|server/運営のみ。支払body UID不採用|期間/返金の事業・法務承認待ち。実processor未接続、外部へ送信なし|
|Circle公開文/通報/対応履歴・投稿者/運営|明示投稿・安全運用、既存protected server storage|公開範囲/Block/運営認可。通報は一般非公開|既存個別削除を維持。全面閉鎖で削除/匿名化どちらかを勝手に決めない|
|分析・運営|利用経路・価値、本人端末queue→PostHog594848|本文不送信、allowlist、DNT/optout。運営read権限|pendingqueue個人削除で消去。既着信PostHogはcloudresetで自動全消去しない。project保持/削除手順は運営確認待ち|

承認cleanupの対象は固定9collection。dry-run、digest一致、createdAt/期限/承認期間の再照合をemulatorで実削除まで検証した。これを本番TTLの稼働実績とはしない。未決定の保存期間をコードの論理期限から推定しない。
