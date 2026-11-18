# Phase B：登録不要の基本利用

## 今回の実装

- 新規/未ログインの入口はToday。既存user・認証callback・店舗管理・公開共有は既存の安全な経路を維持。
- `camellia-free-device-v1` に独立保存。既存v3/v4個人cache・owner・cloud markerを読み込まず、同期/削除しない。保存失敗を成功にせず原本をexportできる。別tabが更新したらCASで上書きを止め、控えを作ってから読み直す。
- Today/Check/JST1枚のFortune、会話Library/検索/retry/YURA・Lactone、Discover/Place基本提案/選択、私的Reflection、任意Memory、My Treeを端末で利用。
- Circleは基本無料を維持するが、参加・投稿には既存の本人確認/安全条件が必要。ID未取得の利用者へ理由とGuidelinesを案内する。公開権限を緩和しない。
- Myに保存範囲と、ブラウザ削除/機種変更/プライベートモード/容量/共有端末の制約を明示。端末記録の自動消去期間は新設しない。ID取得・全記録移行はPhase Cで接続する。B単独では引継ぎ完了と報告しない。
- `VITE_FREE_BASIC_USAGE=off` で旧Check-firstへ戻せる。Free記録を削除せず、ON復帰で読み直せる。既存の本番変数は変更していない。

## 本人が追加決定した事項

2026-11-16、Firebaseメールリンク認証は設定済みと回答。登録不要の会話は「1人1日30回」。本人単位の厳密な識別を匿名状態で行えるとは主張しない。

実装はJST暦日の署名付きHttpOnly cookieによる端末枠30回と、通信元の日替わりHMAC枠30回。cookie消去とネットワーク変更による単純な回避を抑止し、既存のshared/global rate limitも継続する。共有回線では複数人が制限を共有する場合があり、別端末・別回線の同一人物を完全には識別できない。30回の正常応答や無制限retryを保証する料金特典ではなく、外部生成に進む送信の安全上限。

## 匿名APIの境界

`/api/camellia/free-chat`：同一HTTPS origin・JSON POST・Vercelが渡す通信元情報を要求。任意のclient UID、x-forwarded-for、provider/prompt、referral拡張枠を信用しない。署名keyは既存server資格情報からdomain-separated derivationし、clientへ送らない。新しい秘密やAPI keyをcommit/変更していない。keyをローテーションすると能力cookieとHMAC枠は更新されるため、運営時に枠の継続を確認する。

共通Safety/model allowlist/最大8件の会話/レスポンス上限/stream/dedup/原価観測を再利用する。保存済みTree/Memory/Check/他threadをserver loaderで取得しない。既存inviteRequiredと運営のfree_chat停止を迂回しない。Firestore/資格情報/共有制限/通信元情報が使えなければ生成しない。既存ログイン済み会話のquotaと有料権利は変更しない。

新しいprotected `free_chat_days` は端末/通信元のHMAC、requestの重複防止、件数、日時/論理期限だけ。生IP・メール・会話本文は保存しない。expiresAtは翌JST境界であり、実削除済みを意味しない。既存承認cleanupの固定対象に追加したが、本番保持期間・TTL・jobは未変更。端末記録を削除しても、不正対策の当日枠がリセットされるとは案内しない。

## 検証と限界

`free-experience-cases` はcookie改変/日付/CSRF/偽の通信元拒否、分離storeと別owner拒否。`free-experience-firestore` は実transactionで30枠同時取得、cookie/ネットワーク変更、翌JST、二重request、実gateway＋生成fixture/SSE、招待/運営停止を検証。

375/390/412/768/1280の実画面で、無登録Check→Fortune→Tree→会話→明示Memory→Place→Reflection→再読込、既存account原本不変、Tree原文不送信、横overflowなしを確認。390で別tab更新時の保護も確認。auth/同期/生成はfixtureで、実メール/実Gemini/実機の代用ではない。

最終のコマンド結果・commit・Preview・PRはprogressと最終報告へ追記する。既存Privacyの「登録前は一時保存のみ」という説明はPhase Eで更新するまで公開完了とはしない。固定Previewの更新は移行とPrivacyの接続後にまとめ、LINE callbackの追加はしない。Production/main/Rules/claims/課金/紹介/通知は未変更。
