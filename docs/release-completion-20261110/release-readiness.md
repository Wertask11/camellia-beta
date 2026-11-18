# リリース判定（2026-11-11 UTC）

**正式リリース：NOT READY。main統合・Production反映は未実施。**

|判定|結果|確認済み|残る条件|
|---|---|---|---|
|A 開発完成|NOT READY／受入待ち|外部未準備に依存しないデータ・権限・運用基盤を実装。最新コードの自動試験はtest-evidence参照|v4双方向同期/再ログイン/復元/個人削除は本人確認済み。実同時競合、新Circle連携/運営対応の実受入、Google認証、新イベント実着信と保持/閉鎖ポリシーとの整合が未検証。未選定providerのadapterは未実装|
|B 本番技術準備|NOT READY|既存Productionの公開status読取、PR個別Vercelビルド、GitHub品質CI、emulator上Rules境界|本番統合/deploy、Rules/index差分の承認適用、実環境スモーク、ライブGemini/監視/cleanup運用/rollbackの受入が未実施|
|C 正式リリース準備|NOT READY|Free保護、500円案内、公開/課金/共有/紹介/通知の停止、必要な運営手順|実店舗・掲載/写真許可、決済契約/法定表示/返金方針、保持とアカウント閉鎖、紹介条件/装飾/期間/数値、配信方式、経営判断|

Aの自動試験が合格しても、B・Cの合格にはしない。既存本番の利用成功を、この新コードの成功へ読み替えない。

## 公開状態を維持する

- 既存Circleの公開設定は変更しない。新Circle→Place連携はOFF。
- Place実掲載の公開はOFF。既存3件は「デモ・掲載イメージ」。実在店舗の公開受入実績はない。
- checkoutReady=false。新billing-webhookは常時503。実決済・有料権限の自己申告は受け付けない。
- パートナー共有は内容previewのみ。URL発行・送信・匿名公開読取は停止。
- 紹介受付・自動trial・通知配信を開始しない。最終デザインや予算/AI枠にテスト値を転用しない。
- Gemini API key、環境変数、Rules、moderator/operator claimsを変更していない。

## 障害の扱い

現在のローカル再実行で確認された未解決の失敗はtest-evidenceに記録する。**実環境・利用者データのP0/P1が0と確認できたとは報告しない。**

優先して閉じるP1ゲートは、v4実同時競合と本番適用、新Circle連携/運営対応、Google実認証/ライブGemini使用量、新データ保持/本番Rules・監視。店舗・決済契約と未決定条件は外部準備待ちとして区別する。iOS/Samsung/スクリーンリーダーの未検証も残す。

## 統合可能性と順序

#62〜#67の元headは変更せず、#68〜#73を後続の独立差分として準備した。各branchに先行commitが祖先として含まれることを確認する。各PRのlint/typecheck/unit/emulator/buildはそのPR headで確認し、Vercel成功だけでテスト合格としない。

本番mainへのmergeはVercelのProduction deployを伴うため、今回未実施。承認後は#62から順に1本ずつ、merge commit方式で履歴を保ち、後続baseをmainへ更新して差分が前段と重複しないことを確認する。各段階でCIと実環境スモークを確認し、重大な問題があれば後続を止める。squash/rebase等に変更する場合は共通祖先と差分を再検証する。

**現在そのまま正式公開することは不可。** 技術ゲートと運営判断を満たした後も、公開flag・課金・紹介・配信は別操作として承認を受ける。具体的な作業はoperator-runbook、migration-and-rollback参照。

## 宣伝・実動画

今撮るなら固定Previewの実操作と「準備中」の範囲を明記する。

1. TodayでCheckを省略→選択肢→「あとで・保存だけ」→My。体験してから残す流れを15〜30秒。
2. CamelliaでYURA→同じ会話でLactone→Discoverの候補。ライブ返答が成功した実画面だけを15〜30秒。
3. Placeのデモ→条件調整→比較→Myの私的Reflection。「掲載イメージ・実店舗は準備中」を明示。店舗受入後に実掲載/地図導線へ撮り直す。

架空の店舗・決済成功・紹介特典・配信成功を宣伝動画へ入れない。

## 2026-11-16 JST 追補：本人の実機確認

同じ固定Preview・専用アカウントで、Android→PC、PC→Android、Android再ログイン後の保存、JSON export/復元、削除した振り返りの非復活、Androidからの個人記録削除と古いPCタブの再読込後の非復活を本人が確認した。[owner-acceptance.json](owner-acceptance.json)。端末内build番号やprivate原文をこちらで取得していないため、本人申告の実操作証拠として区別する。実同時競合、別provider、Circle新連携/運営対応、実Gemini原価、全面アカウント閉鎖、Production新コードのPASSへ広げない。

実ログイン方式は本人回答でLINE。YURA→Lactoneの両方で返答が少しずつ表示されることも本人確認済み。Google実ログイン・provider receipt/token/請求照合は未確認。

既存Circleについても、固定Previewの別2アカウントで投稿・コメント・リアクション・PC反映・通報・ブロック・解除を本人確認済み。新Circle→Place手動紐付けはOFF、運営対応処理は今回HEADの実操作未確認。既存本番の過去実績を最新HEADへ転記しない。
