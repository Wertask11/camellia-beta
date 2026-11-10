# 実装・検証の進捗

## Phase 0

最新main 91e95baから開始、40行の全採用事項監査をaudit.md／audit-matrix.jsonへ記録。既存48/48 suite PASS。本番・個人記録・feature flag・Rules・claim・決済契約は変更していない。本人から決済と実在掲載は未準備との回答。

## Phase 1：Today・推薦・Plus

- Checkをせず候補を選択し、Myから明示的に残せる。架空のCheckは作らない。
- Guest draft v1を維持し、Checkなしのv2を追加。LINEのnonce／10分bridge／30分期限、owner binding、取消・別アカウント・二重保存防止を維持。
- 希望と最大時間を調整し、時間の条件を勝手に緩めない。中心1件と別候補を維持。
- 「N日目」を「N日分の記録」へ変更し、連続利用の圧力と誤解を避ける。
- Plusの中心を本人が許可したパーソナル提案・比較として説明。課金・共有送信は停止を維持。
- lint／typecheck／build、Guest/OAuth単体、Check interaction、Today 59ケース PASS。全suite再実行を実施。
- 実Chromiumの375／390／412／768／1280でCheckなし→選択→My→合成LINE/Google→保存→refreshがPASS。Checkは0件、選択は1度だけ、横overflowなし。
- 既存のCheckありGuest→Camellia→Discover→Place→My→保存の5幅と両スタイルSafety6境界もPASS。
- 実ログイン・Productionの新機能公開・実Geminiの実行は未確認。合成認証を実認証の成功とは扱わない。


## Phase 2：Placeの基本品質

- 価格上限・所要時間・4分野・サービス・予約なし・JST営業時間／休業日を構造化し、条件不明を一致として扱わない。深夜営業も検証。
- 掲載前に実在・掲載許可・写真利用許可・情報確認の4確認と、非公開の許可証跡を必須化。公開projectionから証跡・運営UIDを除外。変更前後のauditと再審査・停止を維持。
- 任意特典に対象・条件・有効期限を追加。確認済みかつ有効な特典だけ表示。特典・スポンサーは順位に使わない。
- Freeでも3候補の事実比較ができる。Plusの個別比較APIはサーバーの有効プランを検証し、許可した希望だけを受け取る。
- 問い合わせと電話の導線を追加。デモの料金例は例のある1件だけ構造化し、他2件の価格を創作しない。
- CheckなしのOAuth bridgeをv1とは別keyへ分離し、古いタブによる消去を回避。既存v1のCheck引き継ぎを維持。
- lint／typecheck／build、Place条件の単体、既存Place境界、Guest互換性がPASS。ローカルFirestoreで権限・審査証跡・公開projection・audit・再審査・停止PASS。
- 実Chromium 375／390／412／768／1280で比較dialog/Escape、価格・時間制限、不明営業時間の除外、空状態、横overflowなしを確認。Checkなし保存の5幅回帰もPASS。
- Production公開・実在店舗掲載・課金・共有送信は行っていない。
