# 保存・失効・物理削除の最終分類（2026-11-20）

全ての行はCamelliaの範囲。共有Firebase Authや他サービスの記録を一括削除しない。期間は未決定のため新しい自動削除/TTLを開始していない。以下の「削除テスト」はlocal demo Firestore/fixtureの区分であり、Productionデータの削除実績ではない。新lifecycleのmodeと実行順は [lifecycle-retention.md](lifecycle-retention.md)。既定でdry-run、承認digest一致時だけapply、holdと緊急停止を利用できる。

|データ|保存先|所有者|アクセス権限|保持期間|削除条件|削除方式|法的・契約上の保持|本人削除との関係|既存データへの影響|削除テスト|
|---|---|---|---|---|---|---|---|---|---|---|
|個人プロフィール|端末Free領域 / camellia_users本人profile・root|本人|本人 / 認可server|非利用による自動削除なし・方針承認待ち|本人操作|既存個人記録削除・root lock→子削除→root|運営のPrivacy確定が必要|原本を削除。Auth ID / 支払いは別|v3/v4維持、CASと原本世代保護|completion-sync / billing-management / email-id emulator|
|Check|端末 / 本人daily・v4|本人|本人|本人削除までの提案、未承認の期限削除なし|個別/個人記録削除|tombstone / v4同期 / export復元|機微記録として必要最小限|本人削除対象|削除済み記録の復活を防ぐ|completion-sync / check-first emulator|
|Memory|端末 / 本人v4|本人|本人|期間未決定|明示保存後の個別/全記録削除|tombstone / CAS|自動公開/モデル送信なし|削除対象|v3 read-time移行・v4保護|completion-sync / backup unit|
|Reflection|端末 / 本人v4|本人|本人|期間未決定|本人削除|tombstone / CAS / export|私的原文の外部共有なし|削除対象|復元時もtombstone優先|completion-sync / lifecycle永久権利保護|
|AI会話|端末 / 本人v4|本人|本人 / 明示送信の直近限定provider|期間未決定|本人削除|既存個別/全記録削除|Gemini利用契約/データ利用区分は外部確認|本文削除と原価台帳を分離|legacy message/model attributionを維持|conversation / delete / sync tests|
|My Tree|端末 / 本人v4|本人|本人|期間未決定|本人削除|既存個別/全記録削除|人物原文を自動共有しない|Tree内容を削除。永久装飾権は別|点数/ランキングなし、復元/同期維持|completion-sync / Tree UI / lifecycle emulator|
|共有内容・履歴|partner_shares / 本人partner_shares|発行者|リンク知得者は公開投影だけ、本人は履歴/取消|閲覧は本人選択1/7日、物理保持は承認待ち|取消/期限/原本世代終了|本文scrub・閲覧不可 + 既存expiryの本体/本人mirror削除|転送/受信者のコピーを回収できない|全記録削除で取消・mirror削除|受付OFFでも本人取消を保護|share-runtime local HTTP + emulator|
|紹介コード・intent|referral_codes / referral_intents|発行者 / 運営|serverのみ、本人historyは日付/状態|期間未決定、intentの技術期限は10分|コード取消/原本消失、proof期限|lifecycle revoked_only / expiry|HMACは匿名化ではない|本人取消を維持、台帳保存は別|Auth birth + root世代、旧コード安全default|referral-history / lifecycle / referral-id emulator|
|紹介成立・Identity HMAC・予算・監査|referral_grants / identities / rewards / budgets / audit / budget_audit|運営・特典対象本人|serverだけ、本人に必要な権利だけ|方針/期間未決定、試用7日と別|キャンペーン停止/終了・精算済み・必要な個別審査|lifecycleの順序削除、承認digest、hold|HMAC削除後の永久1人1回を保証しない|原文削除で特典を破壊しない。全ID閉鎖は別判断|旧hashだけのgrantはownerレビューが必要|lifecycle / trial-token / referral history emulator|
|装飾権利・装着|本人admin/referral_decorations/items / tree_decoration_equipment|本人|権利更新serverのみ、本人読み取り|永久保有の確定方針|装着解除は本人操作。全ID閉鎖時の扱いは未決定|periodic cleanupの対象外|確定済み永久権利を保護|Tree本文削除/紹介台帳整理で権利を消さない|100件以降もページング/装着可能|referral-history 103件 / lifecycle emulator|
|Circle投稿・コメント・反応|circle_posts / comments / reactions|投稿者・参加者|公開投影はserver認可、所有者編集、運営削除|保持数値未決定|本文removed/deleted、open通報なし、子依存なし|既存本文scrub→lifecycle順序物理削除|通報/証拠保全はhold|個人記録削除と公開投稿の管理は別|既存公開本文を期間だけで消さない|phase1 / quality-circle-place / lifecycle emulator|
|Circle通報・moderation|circle_reports / circle_moderation_audit|運営 / 通報者|Moderator/Admin server認可、一般非公開|期間/保全方針未決定|caseClosureReviewed + resolved/dismissed|監査→通報をlifecycleで削除|証拠保全/法的確認を優先|通報者の記録削除だけで証拠を消さない|未処理通報を保護、claimsは変更しない|phase1 / lifecycle emulator|
|Place保存・私的体験|端末 / 本人place_saves / v4|本人|本人|期間未決定|本人操作|個別/全記録削除・tombstone|店舗へ私的原文を提供しない|個人記録削除対象|Memory/Reflectionとの安全な復元|completion-sync / free browser|
|店舗情報・許諾・担当scope・監査|places / place_agreements / place_audit / place_scope_audit / 本人admin/place_scope|運営・店舗|公開はpublished投影だけ、私的証拠/担当server認可|掲載終了後期間など承認待ち|停止/許諾保存義務確認/担当scope解除|lifecycle closed_place / closed_scope、scope自体は既存運営解除|契約/許諾保存義務は運営確認|個人記録削除で店舗証拠/権限を誤削除しない|旧版/進行中/再公開で削除審査を失効|quality-place / operator / lifecycle emulator|
|店舗申請・連絡先・審査|place_applications / place_application_audit|申請者・運営|本人/運営のみ、公開Placeと分離|受付前に保持承認、期間未決定|withdrawn/declined/archived、scope解除、closedAt|取り下げscrub、audit→申請のlifecycle、旧expiry補強|掲載同意/写真許諾の保全と分離|消費者の個人記録削除とは別|進行中auditを期限だけで消さず、孤立auditは個別審査|place-intake / lifecycle emulator|
|Stripe顧客・契約・支払い履歴|billing_customers / owners / contracts / checkouts / events / receipts、本人admin/billing_subscription|運営 / 支払本人|署名検証server、本人確認後の履歴/Portal|対象/保存義務/期間は専門確認待ち|providerClosed/managementNoLongerRequired/legalReviewApprovedと版付き理由|lifecycle closed_payment、現在権利と子台帳/未知期限はhold|法定年数を推測しない。Stripe上の保存/削除は別操作|個人記録削除で契約/履歴を消さない|既存権利/不変契約条件/再ログイン後Portal保護|billing / Stripe SDK fixture / lifecycle emulator（実Stripe未確認）|
|AI使用量・原価・枠|ai_usage_receipts / ai_request_receipts / ai_attempt_days / referral_ai_reservations / Free日次counter|運営|serverだけ、本文なし|種類別期間未決定|日次終了、既知usage、trial精算、unknownは人の確認|expiry + lifecycle closed_day/request/usage/settled_trial|見積と請求書を区別、原価照合に必要な保全|本人本文削除と分離、既存Free日30を維持|active lease/不明usageを期限で消さない|AI / member-free-limit / trial-token / lifecycle emulator|
|通知設定・購読・配信履歴|本人notification_preferences、notification_subscriptions / deliveries / push_attempts / rate_windows|本人 / 運営|本人設定、private driverのみ配信|期間未決定。配信重複抑止の技術下限32日|本人停止/無効購読、期限承認|停止時endpoint/鍵除去、失効購読lifecycle、配信履歴expiry|通知許可/頻度/停止尊重、ロック画面に機微本文なし|個人記録削除の前に停止|default OFF、unknown送信は勝手に再送しない|web-push / lifecycle emulator、実OS未確認|
|PostHog待ちデータ・支払い分析|端末queue / billing_analytics_outbox / preferences / Project594848|運営 / 同意本人|allowlist payload、DNT/opt-out/本人帰属|期間/Project設定未照合|同意停止/原本世代終了/承認期限|端末queue破棄、Outbox expiry、停止設定closed_payment|既送信person/eventsの削除はPostHog側手順/承認が必要|原本削除/計測停止後の再送を抑止|既存Insightは未変更、重複insert_idを維持|analytics unit + billing-analytics HTTP/emulator、実着信未確認|
|削除審査・hold・実行監査|retention_dispositions / retention_holds / retention_audit|運営|Admin SDK/IAMのみ|未決定、active holdは保全|原本消失、hold解除、監査期間承認|lifecycle closed_review / released_hold / closed_audit|法的保全を優先、削除にも監査|通常本人削除と別、公開しない|旧形式の対象不明はhold、全件スキャンなし|lifecycle emulator（対象/依存版/digest/pause/retry）|

実際のTTL設定・定期実行・クラウド削除・PostHogの既送信データ削除・共有Auth削除は未実施。運営が保存義務/範囲を決め、dry-run結果を確認してから実行する。

Stripe Sandboxはbilling_sandboxes/stripe_test配下の専用台帳/config、本人admin/billing_test_subscription。本番台帳とmodeを混ぜず、既存path/旧権利を維持する。private cleanupの--stripe-testは固定範囲だけを扱い、本番global pauseも尊重。テスト権利で本番Plusへ昇格せず、テスト売上を本番Outboxへ送らない。保持の期間/義務/レビューはテスト側にも別途必要。
