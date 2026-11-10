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
