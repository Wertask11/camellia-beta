# 保持・削除の実行基盤（2026-11-20）

本番の期間・TTL・定期ジョブは設定/開始していない。法定保存や期間は運営承認が必要。既存の個人記録削除は別であり、支払い・永久装飾を削除しない。

Stripe Sandboxは固定の別rootで、dry-run/レビュー/applyすべてに `--stripe-test` を付ける。本番のconfigをテスト値にしない。scope別の保持と本番global pauseを尊重。詳細 [stripe-mode-isolation.md](stripe-mode-isolation.md)。

## 実装

`lib/server/lifecycle-retention.ts` と private CLI `scripts/lifecycle-retention.mjs`。固定コレクションだけ、20件のdocument IDページング、全readを同一transaction内で再確認、config/対象/関連記録の版と削除先をdigestへ含める。dry-runに本文やUIDを出さない。apply時にdigestが一致しなければ停止。成功auditの同digest再実行は再削除せず既存結果を返す。

`config/retention.paused=true` が既存expiryと新lifecycleの緊急停止。各collectionに approved、approvedBy、approvedAt（過去）、正のretentionMs、下記のmode、トップにlifecycleVersion=lifecycle_v1が必要。期間の既定値はない。設定例の数値を承認済みとして扱わない。

|固定対象|mode|保護/順序|
|---|---|---|
|referral_codes|revoked_only|稼働中の原本世代と一致する有効コードを保護。取消/原本世代消失後のみ|
|referral_ai_reservations|settled_trial|7日終了、予算精算済み、既知のsettled/releasedのみ。unknown保留|
|referral_identities|closed_identity_window|キャンペーン停止/終了、identityWindowDeletionApproved、精算済み。HMAC削除後の永久重複防止は保証しない|
|referral_grants|reconciled_trial|予約/HMACを先に処理。ownerをhash照合、期限切れ本人trial mirrorのみ同時削除。永久装飾は対象外|
|referral_rewards / referral_budgets|closed_month / closed_budget|JST前月以前。予算は原本版に紐づくbudgetClosureReviewedと未精算grant不存在の確認が必要|
|referral_audit / referral_budget_audit|closed_campaign|キャンペーン停止/終了、精算確認。原本不明はtrialClosureReviewedが必要|
|circle_reactions→circle_comments→circle_posts|removed_parent / removed_content|公開中の本文、対応中の通報、残った子を保護。親削除後コメントの整理はparentCascadeReviewedが別途必要|
|circle_moderation_audit→circle_reports|resolved_case|caseClosureReviewedと処理完了。監査を先に処理|
|place_audit / place_agreements→places|closed_place|停止済み、permissionEvidenceClosureReviewed。Place原本は担当scope解除の版付きレビューと子の不存在が必要|
|place_application_audit→place_applications|closed_application|withdrawn/declined/archived、scope解除、closedAt。親不明auditは版付きapplicationClosureReviewed|
|place_scope_audit|closed_scope|現在の担当scopeが空、版付きscopesRevokedReviewed。権限をこの処理で付与/変更しない|
|place_metric_days / ai_attempt_days|closed_day|JSTで閉じた日だけ。クリックを来店に変えない|
|notification_subscriptions|revoked_only|有効な原本・購読を保護。失効購読と一致するprivate registrationだけを整理|
|ai_request_receipts / ai_usage_receipts|closed_request / closed_usage|startedやusageIncompleteは版付きproviderUsageReviewedがない限り保留|
|billing_customers / owners / contracts / checkouts / events / receipts / analytics_preferences|closed_payment|collectionのlegalReviewApproved/legalBasisと各記録のproviderClosed/managementNoLongerRequired/legalReviewApproved/理由/終了日時。版変更で再審査。現在のPlus/不明な契約期限/残る契約・履歴・outboxを保護|
|retention_audit|closed_audit|承認された監査保持期間。監査自身の新規削除も別auditに記録|
|retention_dispositions / retention_holds|closed_review / released_hold|固定対象とのhash対応と原本消失を確認。active holdは削除しない。旧形式の不明対象は保留|

`retention_holds/{sha256(対象document完全path)}` にactive=true、または対象のlegalHold=trueで保全。解除時はactive=false/releasedAt/targetCollection/targetIdを非公開で記録する。reviewファイルはrepositoryにcommitしない。レビューはAdmin SDK資格情報を持つ承認済み運営だけがCLIで書ける。client/APIからは不可。

## 手動操作

1. 運営が期間/法的根拠/停止対象を承認し、運営管理下でconfigを設定。ここでは設定していない。
2. `node scripts/lifecycle-retention.mjs <固定collection>` はdry-run。scanned/held理由/eligible/documentDeletes/digest/nextCursorを確認。
3. 個別レビューが必要なら、private JSONに reviewedBy、reason、closedAt、および表の必要なbooleanを記入。ownerUidは必要なlegacy/支払い所有者確認だけ。`CAMELLIA_OPERATOR_CHANGE_APPROVED=true node scripts/lifecycle-retention.mjs <collection> --review=<private-file> --record=<id>`。現在の原本版を記録し、原本変更で無効化。
4. 新しいdry-runを取り直し、運営が削除先/件数/holdを承認した同じページだけ `CAMELLIA_OPERATOR_CHANGE_APPROVED=true node scripts/lifecycle-retention.mjs <collection> <digest> --apply`。続きは同じ `--after=<nextCursor>` をdry-run/apply双方へ渡す。全件を一括自動承認しない。
5. 未知の値、100件超の参照、原本変更、法的確認不足はheld/停止。調査して再dry-run。戻る必要があればpaused=true、実行ログと安全なバックアップを確認して復旧手順に従う。削除前バックアップも新しい保持義務に従う。

既存 `scripts/retention.mjs` はexpiresAt付きの技術台帳用。active AI lease、不明usage、進行中の店舗申請audit、legal holdを期限だけで削除しないよう補強した。旧application削除で孤立したauditは新lifecycle側の個別審査で扱える。

## 検証範囲

`tests/lifecycle-retention-firestore.mjs` はdemo-camellia/127.0.0.1:8085だけで実データを削除する合成試験。未承認停止、pause、hold、版変更拒否、再実行、紹介精算/永久権利保護、Circle子/通報、支払い法的審査/有効権利保護、店舗審査、ページングを検証。クラウドの削除やStripe側の顧客削除を行っていない。実行結果は最終test-evidenceへ記載する。
