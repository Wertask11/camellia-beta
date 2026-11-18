# 登録・装飾・通知の接続（2026-11-11）

## 紹介登録

受付flagはfalseのまま。公開APIはstatusのみで、POSTは503。内部にはopaqueな紹介token→サーバー時刻付き10分intent→LINE/Google認証→初回の正常な個人記録同期→登録完了→既存grant transactionという接続を追加した。本文やCheckを渡さず、クライアントのUID・作成日時・provider自己申告を信頼しない。Firebase Adminのidentity、backend連携ID、Firestore createTimeで新規登録を照合する。既存アカウントが後から特典を取得する場合や、他アカウントへのintent再利用は拒否する。

リンクのtokenは分析開始前にURLから除去。受付OFFなら保存も受付もしない。ON後にもStrictModeの再実行でcaptureを二重作成せず、capture確認前にログインへ進めない。候補は同じ認証UIDへ固定し、成功・期限切れ・拒否・ログアウト時に消去。7日・月3件・一度限り・予算・重複・停止の判定は既存server基盤を再利用し、未決定設定に既定値を入れない。

既存SchoolPark等の古いFirebase identityを新規と同一扱いで自動認定しない。正式開始時には運営が対象条件と実LINE/Googleの新規登録を確認する。実キャンペーン・実特典は未開始。

## My Treeの装飾

取得済みの永久選択権はprotected記録から本人だけが取得。承認済みcatalogの最終デザインだけを画像確認後に選び、1権利1選択をtransactionで保証する。選んだ装飾はTree画面へ表示し、再読込で復元、外しても所有権は消えない。Free/Plusと新規紹介受付の停止から独立。木の人名・振り返り原文を送らず、private Treeの保存形式も変更しない。

catalogはapproved/approvedBy/approvedAtと固定の同一origin `/decorations/` assetを要する。デザイン未決定の今は準備中。最終デザインを勝手に作成・採用しない。画像を確認できない場合には不可逆な選択ボタンを止め、取得済み権利は保持する。運営が承認済みassetを配置・表示確認してからcatalogを登録する。

## 通知

既存の希望保存を維持し、本人が保存を押した際だけサーバーの本人profileにも保存する。revisionで競合を拒否し、アカウント保存を確認できなければ成功と表示しない。現在はpermissionを要求せず、配信driver・subscription登録・配信ジョブも起動しない。

内部dispatcherは承認設定・本人の種別/頻度/希望・端末許可・登録先を確認。JST日/週/月で種別横断の1枠をtransactionで取得し、送信直前にも停止・設定revision・登録先・運営停止を再確認する。本文は汎用コピーだけ。結果が不明な失敗は保留し、盲目的な再送をしない。確認済み未配信だけ同じ冪等keyで再試行可能。driverには冪等性保証が必要。

停止のサーバー処理はアカウント停止・個人記録削除中でも本人認証で利用でき、送信先を削除する。個人記録削除では、通知希望がサーバーにあれば先に停止を確認し、失敗時は原本を消さない。削除ロック中は通常の利用者向けAPIも停止する。既に外部へdispatch済みの通知は撤回できないため、配信開始前の運用案内に明記する。

配信方式、実端末の許可・失効、実driverの冪等性・解除は外部準備後の検証が必要。実通知が届いたとは報告しない。

## 保持・公開

紹介intentは10分の論理有効期限を持つが、実削除は承認済み保持期間とcleanup jobが別途必要。紹介台帳・identity hash・装飾権利・通知送信記録に保持期間を勝手に設定しない。共用Firebase Authのアカウント閉鎖と個人記録削除は区別する。新しい公開・料金徴収・通知・紹介は開始しない。

## この差分の検証

2026-11-11 UTC、58/58 unit、Firestore12エントリー、typecheck/lint/build成功。Firestore試験は登録時刻・Google/LINE identity fixture・二重完了・他人/既存/期限切れ・装飾の選択/装着/解除/永久所有・通知のJST/重複/停止競合/再送/不明保留・個人削除時の通知停止を確認した。

375/390/412/768/1280のTree装飾、個人記録復元、通知希望/停止、専用店舗入口を実画面＋合成認証/HTTPで再実行し全PASS。検証用サーバーの共有dependency cacheがReactを二重読込したため、worktree専用cacheと明示dependencyに修正して再実行した。実OSキーボード・実デザイン・実通知・実OAuthとの証拠を混ぜない。ログwork/lifecycle-*、画面証拠は`/workspace/outputs/camellia-completion-20261110/`。
