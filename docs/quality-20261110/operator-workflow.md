# 店舗運用の準備（まだ開始しない）

実在場所・掲載許可・写真利用許可は未準備。料金徴収、通知、来店確認は開始していない。

## 権限

- 運営：既存の `camelliaPlaceOperator` / `camelliaAdmin` custom claim。公開は運営だけ。
- 店舗担当：server-only `camellia_users/{uid}/admin/place_scope.slugs`。割当店舗だけを下書き保存・審査依頼・停止・集計確認できる。他店は拒否。一般利用者がこの文書を作れないことを既存Rules fixtureでも確認する。
- どの本番アカウントにもclaim/scopeを付与していない。必要な担当者・本人確認・担当店舗を運営が確認し、別途承認してから設定する。
- 店舗担当の資格から私的Circleの閲覧・参加資格は付与しない。Place側の自店イベント専用APIだけを分離。一般ユーザー側APIのbodyから権限を指定できない。

## 下書きから公開

`/api/camellia/place?operator=1`（本人の認証必須）で割当店舗だけを確認。POSTの `save` → `submit` → 運営だけ `publish`。`save`で公開情報を変更すると再度draftへ戻る。運営が実在・掲載許可・写真許可・内容の4項目と証拠参照を確認する。証拠は公開レスポンスに出さない。停止は`suspend`。公開flagがOFFでも管理APIは権限確認のうえ準備・撤回に使える。

現在の利用者向け画面は実在Place公開OFF時にデモを表示する。独立した店舗ログイン画面／営業導入は未提供で、管理API基盤と、Place公開時の管理パネルまでを実装。営業方法は未決定。

基本無料実証への同意は `acceptFreePilot`（`slug`, `agrees:true`）。0円・特典任意・自動有料移行なしを記録。有料オプション・来店確認APIは受付不可。料金を捏造しない。

自店イベントは `merchantEvent`（`slug`, `circleId`, `text`, `event:{title,startsAt,endsAt}`）。既存Circleと新しいPlace連携の両方の公開flagが必要。編集`merchantEventEdit`・撤回`merchantEventDelete`は本人のイベントIDのみ。他店・無関係な広告・私的Feed閲覧は拒否。

## 成果集計と保持

公開カタログ操作のみ `detail/official/booking/map/contact` を日本時間の日別に集計。同じeventIdの再送は加算しない。保存内容は公開slug・種別・時刻で、Check・会話・連絡先・個人UIDは受け付けない。店舗へは自店の直近30日集計だけを返し、来店・予約成立と呼ばない。公開操作なので不正なアクセスによる水増しを完全には判別できず、rate limitは通信上の制限で本人確認ではない。

rate limitは通信元識別子のhashだけを短期間の窓で保持。生IPは保存しない。受領記録とAI観測には32日のexpiresAtを付けるが、**FirestoreのTTLは設定していない**。運用開始前に対象collectionのTTLまたは承認済み削除ジョブが必要。日別操作集計は個人データを持たない。新しい運用データの保持・定期削除を承認するまでは新機能flagをONにしない。

## 通知・AI原価

通知は本人の希望・種類・頻度・停止をプロフィールへ保存するだけ。permission要求・配信SDK・送信処理なし。ロック画面は汎用コピーだけ。

`ai-usage.ts`は数値メタデータだけの重複防止台帳と、承認済み単価による見積りの基盤。**実Geminiランタイムには未接続**。請求書・thinking token・失敗リクエストの課金を含めた原価照合は未確認。料金未設定を0円実測としない。既存Free基本会話、Safety、共有rate limitは変更していない。
