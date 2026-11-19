# 現行コード監査（2026-11-19）

|機能|分類|確認したコード/残る接続|
|---|---|---|
|登録不要・Today/Check/Discover/Fortune|実装済み・実環境検証待ち|FreeExperience/useCamelliaStore、JST・Check後Fortune・条件調整を維持。新しいsourceで回帰検証。Free公開表記が一部残る|
|Camellia ID・保存・同期|実装済み・実環境検証待ち|email-id/handover/syncのUID固定・同意・CAS・控え・v3/v4・tombstone。個人記録削除と共有Firebase Auth閉鎖は別。全面閉鎖のCircle/法定保持方針未決定|
|Camellia会話/原価|部分実装|server/runtimeに実SDK usage/attempt/見積計測あり。無料30回を保持。Plus専用枠・単価承認・実請求照合・保持未決定|
|共有|実装済み・未接続|PartnerShareServiceにopaque token/hash/公開projection/取消/論理失効。share API createを二重にhard stopし、Dialog previewOnly既定true、membership sharingReady強制false。paid/referral entitlementとの整合も必要|
|紹介|実装済み・未接続|Registration/Service/AI lane/装飾選択・永久権利あり。compile-time falseで受付停止。verifiedReferralIdentityはメール単独IDに未対応。原価/終了日等の未決定・装飾実asset未用意|
|Circle|実装済み・実環境検証待ち|既存投稿/コメント/通報/Block/反応/運営監査あり。新Place linkは既定OFF。新sourceで実アカウント受入を分けて記録|
|通知|部分実装|希望・revision・停止/配信claim/重複/不明結果の保護は存在。実transport driver/PushSubscription登録/worker/実配信が未接続|
|Place|部分実装・外部準備待ち|operator scope、証跡、draft/review/published/suspended、比較、metrics、私的体験あり。公開募集〜申請入口/実店舗受入/リンク実動作が不足|
|Plus/Stripe|部分実装・外部準備待ち|500円、支払/試用の保護判定、generic webhook冪等・更新/失敗/返金は存在。Stripe SDK/Checkout/customer binding/署名adapter/portal/history未接続。webhook endpoint常時503|
|運用/保持|部分実装・承認待ち|retention.mjsの固定collection/dry-run/digest/承認一致あり。実期間・実job/TTL未承認。期限fieldだけを物理削除成功にしない|
|Rules/Index|実装済み・実環境検証待ち|repoに共用本番Rules全文はなく、tests/fixtures/schoolpark.firestore.rulesとsecurity/firestore.indexes.jsonを保持。本番Rules/claim/Indexesを勝手にdeployしない|
|PostHog|実装済み・実環境検証待ち|許可属性、DNT/opt-out、匿名/IDの分離。11/18の既存外部ID Check6種の受領と、会話/ID受領未確認を区別。billing analytics outboxのraw UID相当識別も接続前に是正する|

過去のAndroid/LINE/共有前Preview/無料Gemini受入は各過去sourceの記録として保持する。今回の本番や最新sourceの合格とはしない。テスト・公開GET証拠は別ファイルへ記録する。
