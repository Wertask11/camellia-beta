# Phase 2D — My / My Tree / Insight

Base main03ff2cc。v3個人記録の形式を維持し、Treeの新しい振り返りも既存reflection.textへ本人の選んだきっかけと文章を保存する。自動共有・自動Gemini送信・人物スコア・関係維持通知は追加しない。

My: 最近の私、今週の記録、Insight、Tree、Memory、やってみたこと/保存を中心にする。プロフィールは折りたたみ。アカウント/Privacy/削除は既存下部。本人用JSON書き出しは会話・Tree等を含み、Circle本文とPlaceのサーバー保存は対象外と画面へ明記。

Tree: 最近追加した葉、最近本人が書いた振り返り、複数の葉で本人が選んだ意味タグ。人物の順位や心理的評価はしない。Leafには更新日と、任意の「受け取ったもの」「大切にしたいこと」「最近感じていること」等のきっかけを選べる。葉を切り替えると入力中の振り返りを別人へ流用しない。dialogのlabel/focus/Escape/Tabを補う。

Insight: fact/hypothesis/periodStart/periodEndを追加（既存Insightは後方互換）。対象期間は実JST記録から算出。少なくとも4観測のある候補だけをMyへ表示し、睡眠の事実は4日以上を必要とする。2件しかない昨日比較はTodayに残し、Myの強いInsightにはしない。未来の記録を除外。保存したままの行動は4つの別日以上。Actionと翌日Checkは4組以上・3日以上など既存候補の境界も維持する。因果関係や効果を断定しない。月経情報は今回のInsight生成に使わない。

「ちょっと違う」の判定は同じパターンの次の日にも引き継ぐ。最新のフィードバックを優先。対話の仮説は説明を伴い、診断や性格判定ではない。既存の7日rolling比較を「先週」と呼んでいた表記は「その前の7日間」と明確にする。

削除方針は変えない：個人記録は既存の本人確認/同期削除手順、Circleは本人の文章をCircleで削除。通報・運営監査などは対象外。新しい削除方式を勝手に選択していない。Phase2CのPlace保存はC側で本人データ削除へ追加する。

検証：各lint/typecheck/unit/buildとChromium5幅のlocal fixtureを記録。本人認証、実Firestore同期/削除、実キーボード端末を確認するまでは総合Release Gate PASSではない。Auth・Fortune・Today・Discoverのコードは作り直さず既存回帰スイートを使う。

2026-10-16 local verification: lint/typecheck/build PASS、26/26 unit suites PASS。Chromium375/390/412/768/1280でMyの事実/仮説表示、Treeの振り返り保存、dialogのEscape、横overflow/JSerrorなしを確認。保存でボタンが無効になりfocusがbodyへ移る問題を実ブラウザで再現し、textareaへfocusを戻して修正。実認証/クラウド同期・削除の代替証拠ではない。
