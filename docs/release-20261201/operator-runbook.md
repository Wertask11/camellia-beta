# 最終運用手順（2026-11-20）

本番の公開・課金・紹介・通知・削除ジョブは運営の明示承認前に開始しない。数値はproposed-settings.mdの未承認提案と区別する。

## 最終候補の運用

lifecycle-retention.md と stripe-mode-isolation.md を基準にする。現在のコードで処理できる範囲と、期間・法的義務・実環境受入/承認を分ける。

### 店舗

目標4店舗。申請受付の公開承認/保持設定→本人の無料IDで /?open=place-operator →掲載相談→運営審査→非公開draftと自店scope→本人の修正→実在/掲載/写真/情報の証跡→運営published→保存/公式/地図/予約/問い合わせのクリック確認→停止/再審査。実デモのpublic flagを実店舗公開の証明にしない。担当解除はscope-serviceの既存手順で、他店権限やconsumer権利を付けない。メトリクスは閲覧/クリックで、来店/予約成立/購入と呼ばない。

### 保持・削除

種類別期間と法的根拠を運営が確認するまでpaused/未承認を維持。private CLIの固定collectionごとにdry-run→held理由/件数/digest/次ページ確認→必要なら版付き個別レビュー→新しいdry-run→承認digestでapply。CLIの承認envは運営の実行承認であり、本人認証や保存義務の代わりではない。config/retention.paused=trueが緊急停止。active hold、進行中契約/通報/申請、不明provider使用量、未精算紹介は保留。原本変化で再審査。期限を待てば自動削除されるとは案内しない。Stripe本体やPostHog既送信の削除は別の事業者操作。

### 紹介

予算/専用AI/終了日/重複方針/最終catalog/正式公開承認を揃えてから新規受付を検討。通常Free30/既存試用/永久装飾を止めない。Myのhistory/revokeは受付OFF中も本人が使え、取消で既得特典は消えない。装飾は100件ごとの続きを開ける。unknown費用を0円にせず、trial-token-budgetのdry-run精算を行う。grant/Identity/予約を順序整理する前に期間・照合方針を確認。

### 通知

許可は本人操作、固定の非機微本文のみ、設定/希望/頻度/停止/原本世代をdispatch直前に確認。購読先/鍵を公開しない。無効404/410は除去。unknownは勝手に再送しない。停止/未承認は配信しない。実OS受入・VAPID・配信承認がないため本タスクでは送信/cronを開始していない。

### AI原価・障害

モデル別input/output/thinking/cache/total、成功/失敗/再試行/中断を観測する。provider token estimateと請求額は別。価格の承認/期限がない新規拡張を止め、既存Free30を誤停止しない。原価急増時は新規紹介/有料拡張の受付を止め、unknownを保全、請求と照合して承認後に再開。401/403は本人の再確認、503/timeoutはエラー表示と明示retryで、話し方の変更を復旧と呼ばない。

### 計測

Project594848。referral_view/link_created/link_revoked/link_shared/trial_granted、tree_decoration_claimed/equippedを追加。grantedはserver成功のみ、同じ成立は同じrandom insert ID、Auth切替後は送らない。本文/token/intent/UID/送り先は送信しない。SDK queued→HTTP accepted→実PostHog着信を別に照合する。connectorが復旧するまで最後の段階は未検証。JST日次/月次、同意、dedup、匿名→IDのプロフィール境界を確認し、既存Insightsを上書きしない。

### リリースとロールバック

最終候補のCI/同じ固定Preview受入→運営がmain/Production/Rules/index/envを個別承認→本番smoke→公開機能を段階承認。現在はどれも開始していない。詳細は migration-and-rollback.md。障害時は新規受付/dispatch/cleanupをまず停止し、支払い管理・既存Free・原本の読取を保護する。以前の脆弱依存やv4未対応版へ戻さない。


### Stripe分離の追加（候補 38dd2be）

[模式分離の手順](stripe-mode-isolation.md)を優先する。PreviewのStripeテストはテスト専用rootのconfig/billing、retention、ai_observationを使い、本番のconfigをテスト値へ上書きしない。本番顧客/契約/権利/売上をテストで更新しない。テスト台帳の削除は--stripe-testが必要。旧unscoped台帳はmodeを推測して一括移行・削除しない。408073fより前のmode未分離版へ決済バックエンドを戻さない。現在の本番にStripe契約があること/本番設定済みであることは未確認。

不明なAI原価は実際のusage/estimate.statusで判定する。旧lease、不明なtrial期限も保全する（retention-runtime-shape.md）。取得不能を0とせず、必要な版付き終了レビューが終わるまで削除を保留。
