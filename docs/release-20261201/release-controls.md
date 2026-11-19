# 新規受付と既存権利を分ける公開前チェック

新規共有URLの発行は、サーバーフラグ・共有機能の承認・`partner_shares` の承認済み保持期間を同時に確認する。作成トランザクション内でも再照合し、停止と競合する発行を防止する。保持設定を変更・未設定にしても、公開停止スイッチ自体がONなら既存URLの閲覧と本人の取消・履歴は引き続き利用できる。全体の緊急停止では既存公開URLも閲覧不能にする。共有レコードの承認済み期限削除は、非公開の本人向け履歴も一緒に除去する。

Stripe新規購入は従来の料金・価格ID・販売者表示・規約・test/live分離に加え、`config/billing.benefitsApproved` と `conversationPolicyReviewed`、決済関連の保持方針を必要とする。未決定のPlus回数・文脈を暗黙の有料特典にしない。`config/retention.collections` の billing_customers/billing_checkouts/billing_events/billing_payment_receipts/billing_analytics_outbox それぞれの approved/approvedBy/approvedAt/正のretentionMsを必要とする。これは削除実行の証拠ではない。法定保存対象の判断をせずに削除ジョブへ加えない。新規受付停止中も既存顧客のPortal/履歴を保持する。

紹介は今回の確定回答に合わせ、公開ランタイムの `newcomerAfterCap` は `grant` だけを許可する。紹介回数自体は無制限、紹介者の永久装飾だけJST暦月3件。紹介された新規IDは予算・期間・本人確認・重複判定が満たされれば7日体験。旧内部サービスの互換形式は残すが、公開入口から `decline` を使わせない。無料利用や既得権を未設定の新規受付条件へ結びつけない。

以上の承認・数値は本番へ設定していない。本番フラグ・Rules・claims・課金・公開は変更しない。
