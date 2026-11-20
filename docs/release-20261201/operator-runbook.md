# 運営手順（新規運用はOFF）

この文書は操作手順であり、Productionでの実行承認ではない。秘密鍵・token・メール・本人の記録をチャットやGitへ貼らない。作業前に対象project/環境/SHA、承認者、停止/復旧手段を記録する。

## 店舗

掲載募集→本人確認→非公開申請→運営確認→非公開draftと対象店舗scope→掲載/写真許可の4証跡→審査→運営公開→更新/再審査/停止。詳細は [place-intake.md](place-intake.md)。申請承認だけで公開しない。一般担当者にModerator/Admin claimを付けない。担当解除はslug単位、認証IDの削除/再利用の前にもscopeを解除する。公開実績・予約成立・来店はクリック数と区別する。店舗の読み取り/公式/予約/地図/問い合わせは自店の集計だけ確認する。

## 支払い

[stripe-runbook.md](stripe-runbook.md) のtest/live分離・Price/Invoice/PaymentIntent検証・生Webhook署名・冪等台帳を使用。販売者表示/有料提供内容/保持の承認不足ではcheckout停止。本人の明示申込だけStripeへ進める。新規受付停止はconfig/billing.checkoutEnabledを使い、既払いの正規WebhookとPortalを維持する。billing.enabledやStripe接続自体の停止とは分ける。すでに発行されたStripeの有効な決済セッションも止める必要があれば、Stripe側で未払いセッションを失効させる。新規受付停止時も既存顧客のPortalから解約できることを確認する。返金・異常/遅延イベントは署名された正規イベントと台帳で照合し、フロントから権利を変更しない。実決済・契約が未準備なら公開合格にしない。

## 紹介・装飾

[referral-runtime.md](referral-runtime.md)、[trial-token-budget.md](trial-token-budget.md)、[referral-ai-lanes.md](referral-ai-lanes.md)。本人確認済み新規IDとサーバー登録proofを使う。無料利用開始だけで特典を付けない。本人の明示操作でリンクを発行し、LINE/Google/メールの既存IDを誤統合しない。紹介自体は無制限、紹介者の装飾だけJST月3件、新規側7日体験に自動課金しない。予算/期間/AI枠/保存/装飾承認が不足すれば新規受付を停止し、既存特典は消さない。

自己紹介・重複・登録急増・予算予約・未精算・価格期限を日次確認する。期限切れ専用AI予約は、usageがすべて判明した場合だけdry-run→digest承認→明示精算で未使用見積を返却する。取得済み装飾の削除を台帳整理の代わりに行わない。

## 共有

[partner-sharing.md](partner-sharing.md)、[release-controls.md](release-controls.md)。本人が定型内容・相手・時期・期限を選びプレビュー→発行→本人の送信操作。原文や連絡先を自動送信しない。公開URLの第三者閲覧・期限/取消404を確認する。新規発行停止と既存リンク閲覧・本人取消を区別する。期限削除は本体と本人履歴を処理する。

## 通知

[notifications.md](notifications.md)。公開前に対応端末/ブラウザ、VAPID・サーバーフラグ・protected承認・保持・配信担当を確認する。本人の希望保存→明示許可→登録のみ。Myの停止後に配送先URL/鍵が除去され、配信直前にも停止が確認されることを検証する。ロック画面は固定の一般的案内だけ。dispatchは既存notification-settings API内の保護されたoperator操作で、ジョブは自動設置しない。HTTP受付と実OS表示を区別。不明な結果の再送をしない。410等は購読を除去して再許可を本人に依頼する。

## AI原価・監視

無料はJST日30回、モデル/会話切替で枠を増やさない。会話本文を監視・原価ログへ送らない。既存 `scripts/ai-cost-report.mjs` でモデル/attemptの入力・出力・thinking/cache、失敗・再試行・中断、unknown usage、価格未設定/期限を確認する。料金設定は一次資料と通貨・適用日を照合し、推定と請求書を別に記録する。原価異常時は専用拡張や新規受付から停止し、既存無料機能全体を未決定の事業条件で止めない。無料日30回を全部使えば500円の収入を超える可能性を proposed-settings.md に明記した。

## 保持・障害

`node scripts/retention.mjs <許可済みcollection>` はdry-runのみ。対象digest・保持承認・環境を照合し、`CAMELLIA_OPERATOR_CHANGE_APPROVED=true` と `--apply` を伴う別操作だけで実削除する。未決定期間の仮設定、個人原本の期限削除、期限フィールドだけでの削除完了報告は禁止。保持一覧は release-completion-report.md。個人記録削除と事業者台帳・認証・解約は別。

障害時は migration-and-rollback.md に従い、原本・削除tombstone・正規決済台帳を保持する。[billing-analytics.md](billing-analytics.md) の支払い計測は別承認・dry-run/digest・固定送信先を使う。PostHogの送信受付を実着信・実購入やD7/D30実績と読み替えない。新計測の実着信が取れない項目は未検証のまま扱う。


## 支払い管理の直接入口

`/?open=billing` はプロフィール再作成・個人記録の引き継ぎを要求しない本人確認専用入口。販売者情報からも開ける。以前と同じメール・LINE・Googleを使い、別IDへ自動統合しない。ローカル合成検証と、Stripe Sandbox/実Authの受入を区別する。詳細は[billing-management.md](billing-management.md)。Stripe接続障害時の解約窓口と受付手順も、課金前に運営が確認する。


## Plus会話条件の承認と契約保護

plus-conversation-policy.mdの型/承認/versionを必要とし、数値未決定では新規checkoutを開けない。無料30回・旧Plusを維持する。billing_contractsと確定Invoiceの参照を照合し、現在のグローバル値で既存契約を改変しない。新契約発行後のロールバックはこのserver互換性を維持する。支払い分析の同意時刻は実際に作成した申込みへだけ紐付け、停止/重複/既存契約による申込拒否で更新しない。


追加枠付きの新規Plusを承認する場合は、両provider modelの実単価と有効期限・出典/通貨・paidExpansionApprovedを確認する。無効/期限切れは追加枠と新規申込みだけ停止し、無料30回/旧権利を保護する。camellia_plus_cost_unavailable の監視と、翌年単価更新・契約条件・提供表示を運営が確認する。設定数値の提案は未適用のまま。
