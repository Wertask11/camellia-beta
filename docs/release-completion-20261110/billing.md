# Plus・決済の準備（2026-11-11）

## 現在の停止

決済サービスの契約・選定は未準備。checkoutReady=false、パートナー共有はpreviewのみ。新しいbilling-webhook APIも常に503で、支払い成功の自己申告を受け付けない。決済キー、環境変数、外部契約、本番権限を変更していない。

## 選定に依存しない実装

- 署名検証済みprocessor adapterだけが内部の正規化イベントを渡す境界。未設定・署名不正・形式不正・未承認設定は停止。
- 500円・JPY・月額の承認されたprice IDのみ。顧客はcheckout時にサーバーで確認したFirebase identityへprotected領域でひもづけ、bodyのUIDを受け付けない。個人記録のresetと契約のidentityを分離する。
- event IDと内容digest、invoice receiptでtransactionの冪等性を保証。改変再送、他人へのreceipt流用、旧期間の上書きを拒否。
- paid期間の取消は支払済みの権利を期限まで保持。未払い・更新失敗からPlusを付与しない。新しい権利は開始日時・期限とsourceを確認する。
- 旧invoiceの返金で新しい期間を取り消さない。全額返金を先に受信したinvoiceは、遅れて届くpaidで復活しない。同一receiptの旧形式verified_paymentにも全額返金を反映する。部分返金は自動で権利方針を決めず、運営確認へ回す。
- operator/legacy trialを新決済recordの変更で消さず、既存の長い有効権利を優先。個人記録resetは契約取消ではない。
- 支払確認後だけ既存名`plus_complete`のoutboxをinvoiceごとに1件作成。属性はcurrency/amount、既存と同じpseudonymous distinct ID、固定insertId。テストからPostHogへ送信せず、実課金と誤認させない。

## 外部準備後に必須の接続

この内部基盤を実際の決済成功と報告しない。選定したprocessorのSDKで、改変前raw body・署名時刻・invoiceのcanonical状態・キャンセル・返金累積額を検証するadapterが必要。実checkout、顧客binding、署名secret、再送、取消/返金、障害復旧、PostHog outboxの実配信をsandboxと実受入で確認する。本番APIを内部基盤へつなぐのは、契約・総額500円/税/法定表示・規約・返金方針・保持方針・公開承認後。汎用JSONを支払証明として信用してはならない。

invoice・顧客binding・event台帳・outboxの保持期間は未決定。法的保持年数を勝手に設定しない。利用者の投稿・Check・会話を決済イベントへ送らない。未照合の推定原価と決済請求書は別。

## 試験範囲

`completion-billing-cases`: processorなし・不正署名・偽UID/payment API停止。
`completion-billing-firestore`: 合成adapter＋実emulatorで、同時再送、改変、500円、取消、未払、更新、返金順不同、期限、将来開始、旧trial保護、outbox重複を確認。実カード・課金・processor・請求書・PostHog着信の証拠ではない。

再実行：機能コード4129121を変更せず、2026-11-11 UTCにunit59/59、Firestore全13エントリー、typecheck/lint/buildを確認（すべてexit0）。ログwork/billing-*。署名検証・gatewayは合成adapterであり、実決済・実請求書・実PostHog着信は未検証。
