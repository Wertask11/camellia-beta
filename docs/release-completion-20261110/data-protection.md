# データ保護の追加差分（2026-11-11）

## 実装

- Myの「その他」に、同じ本人のexportファイルから不足記録だけを追加する復元。現在の設定と削除tombstoneを優先し、analyticsを再送しない。復元前の端末原文を別キーへ控え、控え失敗／別タブ更新／アカウント切替時は停止。
- v3→v4の初回書込前バックアップを維持。Firestore rootのsyncRevisionによるCASを維持し、個人データ削除中はrootをロック。削除に失敗したらローカル原本とロックを残し、再実行可能。別端末がroot消失を検出した場合は無断再送せず、本人が新規記録を開くまで停止。
- 個人データ削除で本人のpartner_shares参照も削除する。既存共有リンクがある場合は先にサーバーで取消し、失敗時には削除を中止。公開共有サービスは引き続き停止。
- 店舗担当scopeの付与・解除CLI。運営役割をAdmin Authで確認し、dry-runを既定。適用は承認用環境設定と理由を要し、監査ログへ変更前後を記録。無効化／削除済み担当者でも解除可能。
- 運用データの固定collectionだけを対象とした期限削除ジョブ。保持期間と承認者・承認日時がprotected設定に存在する場合のみ実行可能。dry-runのdigestを再照合し、設定・原本が変われば停止。期限と承認保持期間の両方を過ぎたものをtransactionで実削除する。100件ごとのcursor対応。createdAt不明の旧記録は保留。

## 検証の区別

`tests/completion-sync-firestore.mjs` はFirebase client SDK、実Rules emulator、独立した2つのストレージと接続を使用。認証identityは合成。実TCP接続を切って失敗・再試行を確認する。LINE／Google実ログイン、実Androidとは別証拠。

`tests/completion-data-browser.py` は375/390/412/768/1280のChromium。実画面・File API・端末storageを使用し、認証・HTTP APIはfixture。削除済み体験の復活防止、任意Memory、追加復元、外国owner拒否、analytics非再送を確認。

実アカウント検証は固定Preview更新後、Android Chromeと削除可能な専用テストアカウントのみで行う。普段の記録は対象外。

## 運営操作

- scope確認：`node scripts/place-scope.mjs OPERATOR_UID STAFF_UID slug-a,slug-b '付与理由'`
- 全解除：同コマンドのslug欄を `-` にする。
- dry-run確認後の適用は `CAMELLIA_OPERATOR_CHANGE_APPROVED=true` と `--apply` が必要。秘密値・UIDを公開URLやPR本文へ載せない。実際の付与は未実施。
- 期限確認：`node scripts/retention.mjs COLLECTION`。承認済み設定なしでは停止する。
- 適用：CLIが示すdigestと同じ対象に `--apply` を付ける。承認用環境設定も必要。`--after` は前ページのcursorをbase64urlにしたもの。Productionの保持期間設定・削除スケジュール・TTLは変更していない。

この差分でいう「削除」はCamelliaの保存データ削除。SchoolParkと共有するFirebase Authアカウントや外部LINE／Googleアカウントの削除ではない。Circle公開投稿・運営監査・保持未決定の台帳も一律全削除とは報告しない。正式なアカウント閉鎖・保持ポリシーは最終対応表で別に扱う。

## この差分の再実行結果

2026-11-11 UTC、基準fcc586c＋本差分。`npm test`:55/55、`npm run test:firestore`:9エントリー全成功（実SDK同期・権限・実期限削除を含む）、`npm run typecheck`、`npm run lint`、`npm run build`:exit0。ブラウザ5幅すべてPASS。ログはwork/data-{all-unit,all-firestore,types,lint,build,browser}.log、画面試験JSONは`/workspace/outputs/camellia-completion-20261110/completion-data-browser.json`。実機・Production・本番Rules・本番削除は未実施。
