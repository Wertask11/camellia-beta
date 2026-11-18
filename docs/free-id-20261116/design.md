# Free・Camellia ID 再設計：Phase A

2026-11-16 JST。正式コピー：「面倒な登録も、難しい手順も一切なし。Camelliaは、あなたの選択と行動を応援します。」

## 確認した基準

- main/remote mainは91e95ba。未コミット変更なし。直近mainは#61の名称統一。
- #62〜#73はopenの独立stack。最新a628874は同期・復元・削除保護、店舗運用、AI使用量、紹介/装飾/通知、決済停止境界まで含む。今回のbranchはこのheadを祖先にし、mainの取得を省略したり変更を取りこぼしたりしない。
- Production公開GET：chat enabled=true/dataPolicy=unknown/Firestore rate limit、membership Free/500円/checkoutReady=false。実Gemini・請求書の合格証拠ではない。
- 固定Preview branchは0b85594、Vercel成功。本executorからhostname接続は制限され、前回のAndroid/PC本人受入とこちらの合成試験を区別する。登録URLは1つのまま維持する。
- 新Circle→Place/共有送信/紹介受付/通知配信/checkoutは停止。実店舗・決済は本人回答で未準備。今回も勝手に開始しない。

## 実コードとの差分

|領域|現状|今回|
|---|---|---|
|登録前の記録|GuestDraftの30分/ログイン橋10分。会話はReact stateのみ|別namespaceの端末Free記録を永続保存。既存ログインrecordを無断で表示/変更しない|
|今日の一枚/Tree/Reflection|登録前はID案内へ移動|端末で基本利用。FortuneはCheck後/JST1枚、Treeは非公開/非競争のまま|
|会話|guestModeは端末内応答。通常Geminiはverified eligible userが必要|Free用の同一origin/HttpOnly能力cookie。共通Safety/model allowlist/stream/dedup、共有枠＋承認済み日次枠、私的原本なし|
|Camellia ID|LINE/Googleのみ|Firebaseメールリンクを優先。verified email必須。LINE/Googleは維持。紐付けは本人認証/明示操作だけ|
|記録移行|Check/選択だけの短期橋|明示的な引継ぎintent→認証したUIDへ固定→内容範囲の確認→不足record追加。元の端末原本は保護。失敗は再試行、別accountへ勝手に再利用しない|
|Plus|500円/月、protected paid/operator/referral trial。支払未提供|Freeの基本利用を維持。既存のPlace個別化/比較/明示共有を保護。未決定の会話枠・文脈範囲を新しく売らない|
|分析|既存event名・UUID/allowlist/匿名ID別。Preview実着信未検証|planとID状態を別軸、取得/引継ぎの成功失敗、Reflection。本文/メール不送信。別accountの人物をaliasしない|

## 確定事項の継承

壁打ち⑭：希望→選択→行動→任意振り返り、Circle新着/手動Place、通知は本人希望・頻度・停止。⑮：紹介7日・自動課金なし・JST暦月3件・永久の任意装飾、正式公開後のみ。予算/AI枠/最終デザイン/超過/重複/期間は未決定。⑯：実在/掲載/写真許可/体験情報を確認、基本掲載無料・任意特典、クリックを来店/予約成立/購入と呼ばない。Treeを点数・ランキング・CRMへ変えない。

## データ・認証境界

Freeは独立localStorage、v3/v4 readerと原本退避を再利用。ブラウザ削除/プライベートモード/共有端末/容量制限のリスクをMyで明示し、保存失敗を成功扱いしない。時間経過で勝手に記録を消す保持期間は新設しない。

IDへの移行はメールの一致を根拠にUIDを統合しない。Firebaseが認証した現在user、メール確認、明示的な既存userへのlinkを用いる。account conflictは元データを控え、本人が記録を選ぶ。未確認email/password tokenはserver APIとRulesで拒否し、LINE/Google/custom tokenを壊さない。

FreeのAPI能力cookieはID取得とは別の一時的な不正対策。Firestore個人record/Circle投稿/有料権利へはアクセスさせない。既存招待停止/運営停止を迂回しない。公開前に承認済み日次枠と保持方針が必要。数値がない場合は停止し、既存ログインFree経路は維持する。

## 原価試算の範囲

既存shared limitは利用者20/全体1000/300秒がコードfallbackで、環境設定に従う。新しいFree利用回数の承認値とは呼ばない。Geminiは既存のprimary/fallbackと出力上限、usageのinput/output/thinking/cache観測を継承。円単価が未承認/usage不明なら実原価はunknown。日次最悪見積は「承認dispatch数 × 最大試行 ×（入力/出力/thinking上限×承認単価）」、実請求書とは別。数値や月間費用を捏造しない。匿名利用の日次枠/予算は運営回答待ち。

## 独立PRと変更予定

|Phase|主な変更対象|検証|
|---|---|---|
|A|本設計、現行差分/費用/運用境界|main/PR/head/公開status/既存仕様コード照合|
|B|useCamelliaStoreの端末scope、FreeExperience、公開入口、Free API/session/quota、Fortune/Tree/My|永続化・隔離・無制限拒否・Safety・5幅|
|C|email-link、Camellia ID画面、verified email境界、明示引継ぎ/復旧、Rules|認証adapter/emulator、owner混同/再送/保存失敗/既存identity|
|D|Membership/Plus案内、既存Place比較/個別化境界|Free/Plus/期限/試用/既存課金権利/未決済拒否|
|E|ブランド/Privacy/Terms/UX、analytics状態/引継ぎ/取得|本文排除、DNT、UUID/旧分析分離、5幅/エラー|
|F|全体回帰/実ブラウザ/本人受入/最終報告|lint/types/unit/emulator/build、実機と合成を区別|

Production/main merge、Rules/claims/環境変数変更は未実施。Preview安全確認後、具体的な差分と残条件を示して運営判断を受ける。

## 2026-11-17の決定・実装追記

運営回答：Firebaseメールリンク認証は設定済み。登録不要の会話は1人1日30回。端末と日別通信元ハッシュの両方で30回/JST日を保護し、同じ通信元の共有・複数端末/通信元の限界を説明する。以前の「日次枠回答待ち」はこの値に更新された。全体の金額予算や紹介専用AI枠の数値は別件で未決定。Phase B〜Fの実装・検証は各文書と最終報告へ記録する。
