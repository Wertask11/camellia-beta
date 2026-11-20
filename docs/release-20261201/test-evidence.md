# 最終実行の証拠（2026-11-20）

ユーザー向け日付はAsia/Tokyo。再現用ログの時刻はUTC。以前の合格を新sourceへ書換えない。コード・合成・実機・Preview・Production・実事業者を分ける。

## 実装source

408073f6f1a7b23d80b63b9f2487eb93b12f2a05。最終差分はprivate retentionの不明使用量保護。v3/v4の一括migrationなし。後続の報告書だけのcommitは実装sourceと別。

## 自動実行

|実行コマンド|結果/範囲|
|---|---|
|npm run lint|PASS、警告閾値や規則を無効化しない|
|npm run typecheck|PASS|
|npm test|80/80 suites PASS。内包するGeminiケースは110を含む。実provider成功ではない|
|npm run test:firestore|29 scripts PASS。demo-camellia / 127.0.0.1:8085。Rules/Auth/Stripe/providerの実接続はfixture|
|npm run build|PASS。Circle index setupはskipped。Rules/indexをdeployしていない|

開始/終了時刻、exit、ログhashとコマンドは evidence/final-execution-checks.json。GitHub Actionsの各step成功は final-execution-code-ci.json。無料日30/旧Plus保護、両話し方共通Safety、v3/v4・CAS・tombstone・オフライン・同期/削除、保護された支払い管理、署名・正規Stripe照合、原価予約/精算/unknown、モデレーション/店舗scope、共有HTTP匿名閲覧/取消、全lifecycle private Rulesを含む。

新試験はreferral-history-firestore、referral-analytics-cases、lifecycle-retention-firestore/boundaries、stripe-mode-cases/firestore。実使用量のnullと既知0、旧lease、不明なtrial期限、active権利と法的保存の保護も実行。認可エラー・通信断ログは拒否/復旧のassertionで確認し、失敗テストをskipしてPASSにしない。

## 実Chromium（合成の認証/API/OS）

`python tests/run-final-release-browser.py`。localhost限定fixtureを起動し、375/390/412/768/1280の全5幅で12系統を実操作。結果は evidence/final-execution-browser/summary.json と各execution.json。日付を持つ古いfixture fieldはexecutionのlegacyFixtureDateFieldとして区別する。スクリーンショットはworkspace output artifactへ収集し、sha256はfinal-execution-screenshots.json。65枚をgitの巨大差分にしない。

無料Check→今日の一枚→Tree/Memory/会話/Placeデモ→Reflection→reload、メールIDの引継ぎ/失敗/原本保護、YURA3turn→Lactone3turn→YURA、検索/再開/marker/attribution/縮小viewport、基本/試用AI枠、記録削除後の支払い管理、条件同意/同intent再試行/準備中停止/テスト表示、本人共有/匿名閲覧/取消、紹介history/revoke、Push許可・停止fixture、店舗申請、支払い分析を操作する。

低速150ms / down200kB/s / up75kB/s / CPU4倍、503→明示retry、selector Escape/focus、横overflow、height500 composerも確認。viewport縮小を実OS keyboardと呼ばない。VoiceOver/TalkBackや実iPhone/Samsungの代用ではない。画面のAuth/Stripe/Gemini/配信許可はfixtureで、実契約/課金/送信を行っていない。

## 本人の実操作

11/20、同じ固定PreviewでYURA/Lactone両方に返答が出たとの申告を受領（final-execution-owner-acceptance.json）。方法・served SHA・provider metadataは未照合。この申告をメール/LINE/Google全方法や20pairの実Gemini評価のPASSに広げない。Circle2アカウント/運営対応は今回の確認を依頼中。古い同期/削除/LINE/メール/Circleの本人確認は歴史的証拠として保持し、新しい当該sourceの実機受入に流用しない。

## 実事業者/本番

- Stripe: SDK/署名/HTTP/emulator PASS、実Sandbox購入/実Webhook/更新/解約/返金は未確認。ローカルに秘密値なし。Vercel側の設定完了は未確認。本番Stripeとは分離。
- PostHog: Project594848。導入済み・ENABLEDを確認、skill discoveryは2回とも12秒で応答なし。実着信/集計未確認。設定/Insights/flagsを変更しない。queued/HTTP acceptedを着信と呼ばない。
- 通知: driver/OS許可の合成PASS、実OS配信未確認。配信/cronは開始しない。
- 実店舗: 公開確認済み0。目標4。デモやlocal synthetic storeは実績にしない。
- Preview: 同じbranch/URL、source・Vercel statusはfinal-execution-fixed-preview.json。workspaceからhostへHTTPS tunnel 403。迂回しない。Readyはbuild証拠で、全機能の本人受入ではない。
- Production: 公開GETだけ。mainの最新fe7f859に対するdeployment記録とHTTP状態を分ける。新コードは未merge/未deploy。ログイン/生成/データwrite/delete/決済/配信の本番成功へ読み替えない。

## 性能・残る指摘

500KB超chunkとVite native config loader用JSON importの警告は残る。閾値を上げて隠さない。現buildの最大JSは約1.41MB、gzip約430KB。final-execution-build-sizes.jsonは全asset集計で、初期転送量・実モバイルLCPの実測ではない。実画像CDN、実回線、Firestore reads、実Gemini first token/総時間は受入待ち。

新しいnpm auditでは実行依存 critical0/high0/moderate18/low5、全体 critical0/high0/moderate28/low8。exit1は残存指摘で、0件とはしない。原本final-execution-audit-{production,all}.json、到達経路の確認と限界はdependency-risk-review.md。指摘のない候補という意味でも、旧Productionのsecurity合格という意味でもない。

## 再開地点

外部設定/実受入/運営判断はexternal-dependencies、作業手順はoperator-runbook/stripe-runbook。未決定値はproposed-settingsで未承認として維持。P0/P1の実運用ゼロやPRODUCTION READYを未受入のまま宣言しない。全40行と15項目報告はrelease-completion-report/final-execution-report。
