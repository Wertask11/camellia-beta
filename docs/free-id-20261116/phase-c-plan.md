# Phase C 実装メモ

親：#75 4fe3551。A #74 86dfb5f、B #75 e1f43eb＋API entry4fe3551。Bの60unit/14emulator/types/lint/buildと無登録5幅はローカルPASS。GitHubの最新CIは#75で確認する。固定Previewはまだ0b85594（旧release stack）のまま、C/Privacy接続後に更新する。

本人：メールリンク認証は設定済み。匿名会話1人1日30回。実装上の端末/通信元境界を本人へ説明済み。決済/実店舗・全体予算・新特典等は未決定、開始しない。

## メールID

- Firebase sendSignInLinkToEmail / isSignInWithEmailLink / signInWithEmailLink。既存userの追加はlinkWithCredential＋EmailAuthProvider.credentialWithLinkでUID固定。メール一致を理由に任意UIDを合併しない。
- 同じ固定originルート `?auth=email`。oobCode等は解析後すぐURLから除去し、analytics開始前に処理する。メールは10分の端末内一時状態だけ、本文/メール/URLcodeをイベントへ送らない。他端末ではメールを本人が再入力。
- 別accountが途中で使われたら停止。unverified password tokenはserver eligibilityとRulesで拒否し、既存Google/LINE/custom providerは維持。
- メール未着/期限/再利用/別メール/ネットワーク/認証無効を親切な共通エラーへ。成功を偽装しない。Firebase provider有効化は本人設定済み、こちらから設定変更しない。

## 引継ぎ

- Free用localStorageと既存primary cacheは別。Identity screenは未認証時にprimary storeをmountしない（旧userの記録/分析を先に読むことを避ける）。
- ID取得ボタンを押した時だけFree source owner/nonce/期限のintentを作り、認証完了を確認したUIDに固定する。
- 既存CamelliaPageのprepareAccount/CAS/backup/競合選択が済んだ後、本人へ引継ぐ件数/範囲を確認。Free sourceのprofile/idをcurrent accountへ投影して既存mergePersonalBackupを使う。自由なowner指定APIを公開しない。
- 現在record/tombstone/settings/Plus/権利は優先。原文backup後に不足recordだけ追加。元Free原本はcloud保存成功が確認されるまで消さない。再送は同じrecord IDで冪等、別UIDへ再利用不可。
- 認証callback/Free auth intentを、他tabのauth変更で勝手に完了させない。ID画面を離れる場合もFree原本は残す。

## 次工程

D：既存500円/7日/月3件/権利を維持、Free basicとPlusの文脈提案・比較を分離。未決定のAI品質・枠・新特典を売らない。
E：正式コピー/Privacy/Terms/planとID状態の分析、ID/引継ぎ/Reflection成功失敗、匿名人物と別accountをaliasしない。
F：新head全suite/emulator/build、5幅/旧データ/Free/メール/LINE/Googleの回帰、固定Previewで本人のメール受入、PostHog594848、Production前9項目報告。
