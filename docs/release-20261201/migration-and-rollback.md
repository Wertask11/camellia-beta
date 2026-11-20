# v3/v4保護と復旧（2026-11-20）

## 2026-11-20 最終候補

最終候補でv4形式の破壊的変更・既存Firestore全件migrationは行わない。新規紹介grantにprivate ownerUid、コードにAuth作成世代、紹介の端末pendingにrandom analyticsIdを追加するだけで、旧形式は読取defaultまたは保守的なhold/レビューへ落とす。過去会話のmodelを付け替えない。

保持処理は通常のアプリdeployとは別のprivate CLI。source/依存lockをpinし、operator承認がない限りdry-run。削除前の復元可能なバックアップ/hold/対象件数/復元可否を運営が確認し、digestとcursorを記録する。成功auditの再実行はidempotent。実際に消したデータをロールバックのgit checkoutだけで復元できるとは言わない。

障害順序: (1)新しい受付/課金申込/配信/cleanupを停止（cleanupはconfig/retention.paused=true） (2)既存Free/支払い管理/個人原本を保護 (3)Webの前版へ戻す場合もv4・tombstone/CAS/記録削除後Portalとsecurity修正を維持 (4)必要なデータ復元は専用テスト環境で検証してから運営承認。旧expiryのhold/pause未対応版でジョブを再開しない (5)個人記録削除でStripe契約を消したり、紹介台帳整理で永久装飾を消さない。

本番のバックアップ/restore、Rules適用、TTL、cleanup/通知cron、Stripe契約移行は未実行。ローカルemulatorで原本保護、同時更新、削除・復元、legal hold、依存版変更、同digest再実行を確認する。実データ復旧の成功へ読み替えない。


### Stripe分離の追加（候補 38dd2be）

[模式分離の手順](stripe-mode-isolation.md)を優先する。PreviewのStripeテストはテスト専用rootのconfig/billing、retention、ai_observationを使い、本番のconfigをテスト値へ上書きしない。本番顧客/契約/権利/売上をテストで更新しない。テスト台帳の削除は--stripe-testが必要。旧unscoped台帳はmodeを推測して一括移行・削除しない。408073fより前のmode未分離版へ決済バックエンドを戻さない。現在の本番にStripe契約があること/本番設定済みであることは未確認。

削除CLIの実行sourceは408073f以降にpinする。不明なusage/旧lease/親期限を保護する共通判定を含む（retention-runtime-shape.md）。Web/APIとCLIの復旧は分離し、古い削除処理を再開しない。
