# 共有・紹介の基盤と開始条件

## 現在の公開状態

本人の回答どおり、決済準備までは共有内容のプレビューのみ。`COMMERCE_PREVIEW_ONLY=true`、共有createは503、匿名readは404。既存の取消し・一覧は本人のみ。未認証で開ける専用画面はあるが、今はリンクを発行せず内容も公開しない。shared tokenは認証tokenと別の乱数、保存はhashだけ、URL fragmentで扱い、Check/Memory/Reflection/氏名をURLへ含めない。内容は固定の気持ち・既存Action・公開Placeから本人が選ぶ。自由な私的本文の自動転記はしない。

紹介の公開APIはstatusのみ、POSTは常に受付不可。`REFERRAL_INTEGRATION_READY=false`。登録完了hook、拡張AIランタイム、原価計測はまだ接続していない。環境変数を変えるだけでは開始しない。今回は装飾を公開・生成せず、My Treeの既存デザインを変更しない。

## ローカル検証済みの内部基盤

- Admin Authの作成時刻とFirestoreのserver createTimeでキャンペーン中の新規登録を確認。
- token署名やproviderをbodyから信用せず、Admin Authと既存backendのprotected identity mapのみを照合。
- 自己紹介、同じ連携ID、再取得、同時送信を拒否／冪等化。保護台帳はcamellia_adminかuser/admin配下で、本人も書き換えられない。
- Plus体験は正確に7日・自動課金なし。現在のpaid/operator trialを勝手に上書きしない。read-time期限・取消を判定。
- 紹介者の装飾選択権はJST暦月3件、永久保有、承認catalogから一度だけ選択。競争・ランキング・木の成長点なし。
- 月予算は最悪原価の予約額でatomicに制限。実測原価とは別。月上限で新受付が止まっても付与済みtrialは期間内有効。
- trial専用AI予約は回数・費用ともtransactionで制限。同じrequestIdの`reused:true`では再生成してはいけない。既存Free基本AIはこの枠で遮断しない。実生成との接続は未提供。
- 価格照合済み数値原価のsettleとoverrun review flag、確認済み不正／privacy incidentの対象trialだけを止める内部操作を分離。疑いだけでアカウントを削除しない。自動停止や運営への通知送信はしない。

未連携のLINE/Googleが同じ人かは断定できない。端末指紋・本人確認書類・Check・Memory・Reflectionは不正判定に使わない。大量登録を実環境で検知する運営監視と閾値は未提供。

## 開始前に必要な本人の決定・別の実装

protected `config/referral` は月予算、1人当たり原価予約額、trial AI枠、開始・終了日時、開始数値（体験価値／継続／原価）、装飾catalog、紹介者上限超過時の新規側方針、既存trialとの重複規則、正式公開／原価／Privacy／価値／継続／不正対策の承認がすべて必要。未設定の数値は補完しない。テストの数値・装飾名はローカルfixtureだけで事業方針ではない。

加えて実生成への原価・専用枠連携、新規登録完了hook、実装済みの本人認証／利用資格確認への接続、監視・運用、データ保持／削除方針、公開Privacy・Termsの承認が必要。特典濫用防止のidentity hashを個人記録削除後にどう扱うかは現段階では運用未決定。今は紹介データを本番で生成しない。

共有は取消・期限・owner削除／再作成時の失効と本文scrubをローカルで検証。既存の未接続共有機能にも、実際の送信開始前に保持期間・定期削除・本番資格・匿名ページの受入試験が必要。`expiresAt`という名前だけでTTLが有効になったとは扱わない。
