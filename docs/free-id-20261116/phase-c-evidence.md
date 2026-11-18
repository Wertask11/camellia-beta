# Phase C — メールCamellia ID / 明示的な引き継ぎ

2026-11-17 JST。親 #75 4fe3551。メールリンク認証は運営が設定済みとの回答。実メール送信・実メールでの認証は未検証。

## 実装

Firebaseメールリンクを使用。パスワードは追加しない。新規では対象条件と規約を本人が確認する最小チェックだけを求め、架空の名前・生年月日は保存しない。既存LINE/Googleのメール追加は `linkWithCredential` で同じFirebase UIDを維持し、メール一致を理由に別IDを統合しない。メール送信受付を実配送・登録完了と表示しない。メール・確認コードは分析へ送らない。

登録前は独立したFree保存領域。認証画面は旧アカウントのストアをマウントしない。現在の認証UID・元の記録の所有者・選んだ認証方法を確認し、件数を提示して明示的に追加する。現在の設定・削除済み記録・既存Plus権利を維持する。過去の操作イベントを再送しない。古いFortuneを追加して同日に二枚作らない。

取り込み前に原本を非公開の復旧控えへ移す。現在UIDのFirestoreアーカイブを安定したrevisionで読み直し、期待する記録が同等以上の版で含まれることを確認してから控えを削除する。単に過去の「保存済み」を信用しない。通信失敗・アカウント変更・期限超過でも取り込み済みの控えを自動破棄しない。新しく始めた別のFree記録は削除しない。Free個別全記録削除は未採用の引き継ぎ控えも削除し、登録済み個人記録の削除は現在UIDの控えだけを対象にする。他IDの原本を消さない。

localStorageの比較と書込みは原子的ではない。検出できる競合は停止し、各タブの変更前提を別の控えに残す。ブラウザデータの削除・容量不足・共有端末・プライベートモードの制約は残る。端末内のデータを暗号化済みとは表現しない。

## ルール差分（未デプロイ）

`tests/fixtures/schoolpark.firestore.rules` のCamellia部分のみ変更した。`camelliaVerifiedOwner(uid)` を追加し、Camellia owner条件とCircle会員条件で、password providerの場合だけ `email_verified == true` を必須にする。既存custom/LINE・Googleは変更しない。既存SchoolPark全体の `isMe` は変更しない。

実環境へは現在のRulesを取得してこの部分だけを照合・適用する必要がある。テスト用Rulesファイル全体を本番へ上書きしない。今回Rules deploy・claim変更・環境変数変更は実施していない。

## 証拠

- `npm run typecheck`, `npm run lint`, `npm test`（62 suites）, `npm run test:firestore`（15 scripts）, `npm run build`。ローカルログ `work/email-{types,lint,unit,firestore,build}.log`。
- `python tests/email-id-browser.py`：375/390/412/768/1280で実コンポーネント・localStorage・メール入口・確認コード除去・明示移行・確認前控え保持・確認後削除・ログアウト後Free分離。全5幅PASS、横overflow/JS例外なし。画像とJSONは `/workspace/outputs/camellia-free-id-20261117/email/`。
- メール/認証/クラウド受領はローカル合成fixture。実メール・実本人IDの合格ではない。実FirestoreクライアントとRulesは別のemulatorテストで検証。既存LINE/Google・本番データは操作していない。
- 固定Previewはこの段階では更新していない。Privacyを次工程で一致させてから同じURLを更新する。
