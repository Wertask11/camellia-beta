# FINAL RELEASE EXECUTION 最終報告（2026-11-20）

## 1. 最新実装コミット

`408073f6f1a7b23d80b63b9f2487eb93b12f2a05`。branch `fix/camellia-retention-unknown-usage-20261120`。後続の報告書commitは実装sourceと分ける。main/Productionはfe7f859のまま。

## 2. 統合したPR

既存 #84〜#99、追加 #100（保持・削除）、#101（紹介履歴/取消/永久装飾）、#102（security実merge/計測/統合試験）、#103（Stripe mode分離）、#104（実AI台帳の削除保護）。全headの祖先照合はevidence/final-execution-pr-integration.json。#91/#94は実merge済み。GitHub PRをmainへmerge/closeしたという意味ではない。

新PR: https://github.com/Wertask11/camellia-beta/pull/100 / https://github.com/Wertask11/camellia-beta/pull/101 / https://github.com/Wertask11/camellia-beta/pull/102 / https://github.com/Wertask11/camellia-beta/pull/103 / https://github.com/Wertask11/camellia-beta/pull/104

## 3. 完成した機能

- 基本: 登録不要のFree/Check/Today/今日の一枚/Action/Discover/Memory/Reflection/Tree/会話Library/YURA・Lactone/メール・LINE・Google ID/保存・同期・削除を保護。無料日30、今日の一枚はCheck後、v3/v4/CAS/tombstone/既得権を維持。
- 共有: 本人選択/プレビュー/opaque link発行/匿名閲覧/OS共有/履歴/取消/期限/本文失効/承認済み物理削除を接続。自動共有なし。
- 紹介: 新規確認済みID/7日/no auto billing/重複・自己紹介防止/予算・token・原価/永久装飾を維持し、受付停止後も本人のリンクhistory/revoke、Auth世代保護、100件以降の装飾操作、秘密を含まない成立計測を追加。
- Circle: 参加/退出/投稿編集削除/コメント/反応/通報/block/moderation/audit/明示Placeリンク/自店イベント境界を保護。新連携OFF。
- 通知: 希望/許可/Push購読/固定本文/配送/停止/無効除去/重複防止/unknown保留/承認保持を維持。実配信は開始なし。
- Place: 実在schema/申請/担当scope/審査/draft/publication/suspension/review/許諾非公開/条件・比較・保存/公式地図予約問い合わせ/私的体験/店舗別click集計を保護。デモはデモ。実在の公開実績0。
- Plus: 500円/月、公式Stripe SDK/署名・正規照合/Checkout/Portal/Webhook/更新失敗/解約/返金/履歴/記録削除後管理/不変契約条件/原価保護を統合。Sandboxとliveのconfig/台帳/権利/保持/売上を分離。
- 削除: 固定コレクションのlifecycle、終了レビュー、hold、20件ページング、digest、同transactionの依存版確認、冪等audit、pause、private CLIを追加。未承認の自動削除なし。

## 4. 未完成・未接続・未検証・未決定

|区分|状態|
|---|---|
|コードの必須接続|今回発見した未接続の保持/紹介履歴/成立計測と、Stripe混在を修正。外部受入前のコード合格に限定|
|未接続（外部）|実Stripeの契約/Preview設定/署名実Webhook、PostHog connectorの応答/実着信、VAPID/実OS、実店舗資料|
|未検証|当該sourceの実メール/LINE/Google、AndroidとPCの同期、2アカウント/実Moderator、実Gemini、Stripe購入→解約/返金、実Push、実画像CDN/本番smoke|
|未決定|紹介予算/専用AI枠/終了日/他試用重複/最終装飾/Plus上限・文脈/種類別保持/法的保存/開始判断|
|対象範囲の判断待ち|共有Firebase Auth全閉鎖/他サービス記録の一括削除、Stripe側の保存/整理、PostHog既送信person/events。個人記録削除とは別で、勝手に実装/実行しない|
|P2/制約|bundle警告、残る中低依存、1IDで最後に登録した通知1端末、unknown配送の自動再送なし、共有先のコピー回収不可。詳しくはtest-evidenceと運用資料|

## 5. 自動試験

lint/typecheck/80 unit/29 Firestore emulator・API・認可・削除/buildを当該sourceで実行。コマンド/開始終了時刻/exit/log hashはevidence/final-execution-checks.json。GitHub Actionsは同sourceの全step成功を別証拠に記録。失敗をskipして合格にしていない。scope分離の新試験はstripe-mode-cases/firestore。

## 6. 実ブラウザ

実Chromiumで375/390/412/768/1280、Free/ID復旧/両方向会話切替/紹介AI枠/支払い管理/同意Checkout/共有/紹介/Push/店舗申請/支払い計測、低速150ms・200kB/s down・75kB/s up・CPU4倍、503→明示retry、Escape/focus/横overflow/縮小viewport composerを確認。結果はevidence/final-execution-browser。Auth/API/Stripe/Gemini/OSはfixtureであり、実端末や実OS keyboard/VoiceOver/TalkBackではない。最終実行の結果だけをtest-evidenceで採用。

## 7. Stripe

SDK型/署名/正規Price/Invoice/PaymentIntent、500JPY/月、冪等/更新/失敗/解約/全額・部分返金/Portal/保護をfixtureで確認。実Stripe購入は未確認。作業環境にStripe秘密値・Vercel tokenはなく、Vercel操作接続もない。Previewに設定されたかは運営回答待ち。秘密値をチャットに要求していない。stripe-runbookとstripe-mode-isolationに具体手順。

## 8. 実認証

以前の本人確認（LINE/メール、複数端末、個別・全記録削除、Circle2人等）は歴史的証拠で、今回sourceの受入PASSに流用しない。11/20に固定PreviewでYURA/Lactone両方の返答が出たとの本人申告を受領。認証方法・配信SHA・provider metadataは未照合（evidence/final-execution-owner-acceptance.json）。その他の実機受入は別途必要。普段の記録を破壊する再試験を行わない。

## 9. PostHog

Project594848。紹介/装飾の追加イベントをallowlist・同意・安定insert ID・Auth切替/秘密除去と接続。server課金完了はliveだけ。connectorのskill discoveryが応答せず、導入済み/有効を接続管理で確認したが、12秒の2回の試行でも実着信証拠を得られなかった。HTTP200/queueを実着信と呼ばず、人数/継続率/転換率を作らない。既存Insightsは未変更。

本番の行動funnelはclient各段の$host=camellia-beta.vercel.app、event_schema/experience_versionを明示。server購入完了はevent_schema=3/source=server_verified_payment（host属性なし）をその段だけに条件設定。全体へhost filterをかけてserver段を落とさない。Preview/旧schemaとの比較を分け、D1/D7/D30と紹介月3件はJSTの暦日/月で集計する。

## 10. 保持・削除

data-inventoryは要求の保存先/所有者/権限/期間/条件/方式/法的義務/本人削除/旧データ影響/試験の10観点を分類。新lifecycleは未承認の期間では停止し、未知原価/未処理通報/契約/許諾/永久装飾を保護。CLI dry-run/終了レビュー/apply/監査/再実行をlocalで実行。expiresAtだけを物理削除済みと呼ばない。本番TTL/定期job/削除/Stripe側整理は未実行。

## 11. 固定Preview

https://camellia-beta-git-codex-camellia-alpha-relea-161533-school-park.vercel.app/

同じbranchへ通常fast-forward。新しいLINE callback登録は不要。source/Ready/Preview種別の証拠はevidence/final-execution-fixed-preview.json。当実行環境からはそのhostへのHTTPS tunnelが403で拒否され、迂回していない。実画面/実ログイン受入は未達。

## 12. Productionとの差

Production/main fe7f859。今回のコード/新機能はmain未merge・Production未deploy。公開GETの記録はevidence/final-execution-public-status.json。設定・Rules/index・claims・課金・紹介・通知・削除jobを変更しない。候補のsecurity修正/CI結果を古いProductionへ読み替えない。

## 13. 外部依存

初期目標4店舗と許諾・写真・担当、Stripeテストと事業契約/販売表示、VAPID/OS、PostHog実着信、運営の数値/保持/合法性/開始判断。external-dependenciesに必要操作、proposed-settingsに未承認の推奨値/試算/根拠/リスク。設定不足で既存Freeや既得権を止めない。

## 14. 運営が実施する操作

1. 推奨値/期間/法的保存/Plus内容/紹介期間・予算・枠・デザインの採否を決定。自動適用なし。
2. Stripe Sandbox専用設定をPreviewとテスト専用rootへ。テストIDで購入→Webhook→権利→更新/失敗→解約/返金→記録削除後Portalを実行し、本番権利が付かないことも確認。
3. 同じ固定Previewで実認証/同期/Circle2人/Moderator/必要なOS受入。実4店舗は申請→運営確認→公開→停止を受入。実行できない端末は未検証のまま報告。
4. PostHogを復旧し同意済み操作のinsert_idと実イベント/funnel/重複/JSTを照合。配信は別途承認前に開始しない。
5. 全Gate成立後、main/Production/Rules/index/監視/ロールバック/本番smokeを個別承認。公開・課金・紹介・通知を同時に自動開始しない。

## 15. 12/1判定

現在 **No-Go**。開発/統合、Preview受入、本番技術、正式公開を分離し、外部受入・未決定・運営承認を残したままPRODUCTION READYとはしない。全40項目はrelease-completion-report、実行証拠はtest-evidence、運用/保護/復旧はoperator-runbook/migration-and-rollbackへ集約する。
