# 記録と独立した支払い管理

入口は `/?open=billing`。固定Preview・将来のProductionとも同じpathを使用し、LINEの新しいcallback URLは追加しない。MyのPlus案内と公開販売者情報 `/billing.html` に入口を置く。Stripe Checkout/Portalからもこの画面へ戻る。return queryだけで支払い済み・Plusとは判定しない。

## 実装

- メール・LINE・Googleで、支払い時と同じIDを確認する。consumerプロフィール、招待、利用再開、個人記録引き継ぎを要求しない。一般利用停止からの復帰操作でもない。
- メールのpendingには`purpose=billing`を保存。記録用と相互に流用しない。別端末では本人が受信アドレスを入力して確認する。女性対象の同意やconsumerプロフィールを偽って生成せず、記録を自動で結合しない。
- LINEの戻りは10分以内の支払い管理intentで振り分ける。intent/queryは表示先のヒントだけで、権限を与えない。認証・顧客所有者・Auth作成日時はサーバーが照合する。
- 履歴・Portalはverified tokenだけで確認できる。新規受付停止や個人原本削除と分離する。本人の料金・カード情報やUIDをURLへ載せない。
- 画面では日付・支払い状態・支払い済み金額だけを投影。申込・購入ボタンは置かない。新規購入は既存の別フローで明示同意と承認設定を必要とする。
- ログアウトしても端末の個人記録を消さない。アカウント変更後の旧リクエスト結果を表示しない。
- 接続失敗を「契約なし」「料金は発生していない」と扱わない。直前に取得済みの履歴はPortal失敗でも維持する。
- 支払い完了計測の将来送信停止もこの画面から可能。解約やPlus失効とは別操作。

## 検証と制限

専用UIは実Chromiumの375/390/412/768/1280で操作した。プロフィール原本のない状態、利用停止fixture、履歴→Portal失敗、ログアウトで原本保持、同端末/別端末形式のメール確認、callbackの秘密値除去、未課金IDにPortal/購入を表示しないことを確認した。Auth・メール・Stripeは合成。証拠はevidence/billing-management。

実APIをFirestore emulatorに接続し、verified-only/他UID/偽UID/作り直したAuth identity拒否、consumer原本なしの履歴/Portal、新規受付停止と履歴保持を検証する。Stripe Sandbox/実メール・実LINE/Google/固定Previewの受入は別工程。

接続自体の緊急停止・Stripe鍵の無効化・Portal設定欠落では、外部管理画面も開けない。運営は支払い開始前にサポート窓口を実値で設定し、接続障害時の解約受付手順を実際に確認する。個人記録削除を解約として案内しない。
