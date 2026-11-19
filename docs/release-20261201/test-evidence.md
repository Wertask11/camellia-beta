# 新sourceの検証証拠

監査開始2026-11-19。ログの正確な時刻はUTCで保存する。対象アプリコードは `145aa5db8e631b4c7d9fe37a77730cd38b4c3a47`。その後の変更は試験結果のsource表記と報告書。統合中に発見した紹介trialの通常枠迂回を修正し、専用レーン/明示再試行UIもこのsourceで再検証した。前回の本人確認や旧合格結果をこのsourceの実受入に流用していない。

## 当該コードで実行したコマンド

|コマンド|結果|証拠|
|---|---|---|
|`npm run lint`|PASS|evidence/integration-checks.json のlog hash|
|`npm run typecheck`|PASS|同上|
|`npm test`|76/76 PASS|同上。全既存試験と新規試験を実行|
|`npm run test:firestore`|23 scripts PASS|同上。demo-camellia、127.0.0.1:8085のみ。保存済みRulesと実トランザクション。現本番Rulesの再取得・deployではない|
|`VERCEL_ENV=production npm run build`|PASS|同上。Circle index setupはskippedで、index deployなし|
|`npm audit --omit=dev --json`|critical0/high0/moderate18/low5|evidence/integration-audit-production.json|
|`npm audit --json`|critical0/high0/moderate28/low8|evidence/integration-audit-all.json。指摘ゼロではない|

ログ原本は当worktreeのwork/final-*.log。正常拒否を確認するPERMISSION_DENIED、競合/通信再接続ログを含むが、最後まで実行し終了0を確認した。試験を削除・skipして合格にしていない。保持の削除はローカル合成記録に対してdry-runとdigest承認の実削除まで行った。本番記録は変更していない。

通常枠と紹介枠の分離、および専用枠の明示選択/同じmodel・元送信への再試行も当該sourceで5幅検証した。証拠はreferral-ai-lanes-browser.json、仕様はreferral-ai-lanes.md。

## 実Chromium（認証/通信/OSは合成）

375/390/412/768/1280の全幅で実行した。

- 無料: Check→今日の一枚→Tree→会話→明示Memory→Discover→Placeデモ→Reflection→再読込。別IDのcacheを原本のまま保護。390幅では同時タブの古い状態での上書き拒否も確認。evidence/integration-free/ と integration-free-browser.json。
- ID復旧: Checkなしの選択、メール送信エラー→戻る、原本維持、既存LINE/custom IDへのメール追加で同じUIDと記録を維持。evidence/integration-recovery/ と integration-recovery-browser.json。実メール・実LINE/Googleではない。
- 会話: YURA3turn→Lactone3turn→YURA、request model/assistant attribution、切替marker、reload→検索→thread reopen、矢印/Enter/Escapeとfocus復帰、縮小viewportのcomposer。evidence/integration-conversation-browser.json とPNG。縮小viewportは実OSキーボードの代替PASSではない。
- 共有・紹介・通知・掲載申請・支払い: 各5幅で、当該統合sourceから起動した個別fixtureサーバーを操作。evidence/integration-gated/summary.json、各JSON/PNG。発行/取消、明示紹介リンク、通知許可/登録/停止、申請/運営審査/担当解除、支払い同意/同一intent再試行/計測停止を確認。実配信/実権利付与ではない。

再現コマンドは既存tests/browser/*.pyと対応*-server.mjs。統合実行ではPORT/出力先/cacheをwork/integration-uiへ分離した。無料/ID復旧は `FREE_USE_FIXTURE=on CHECK_FIRST_FIXTURE=on CHOICE_FLOW_FIXTURE=on UX_FIXTURE_PORT=4191 node tests/ux-preview.mjs` と、出力先を当日用に変更した既存Pythonを使用。会話は `python tests/browser/integration-conversation.py`。

初回の統合UI試験は新規関数billingAnalyticsProfileIdのmock export不足で失敗した。実アプリの同関数は実装されており、テスト用mockを修正して5幅すべてを再実行した。切替markerの追加ブラウザ試験は、legacy互換の保存形式ではmarkerをmessagesではなくmodelSwitchesへ分離する仕様を正しく確認するよう修正し、保存位置と再表示の両方を検証した。

## ブラウザ以外の統合受入

- 共有は実ローカルHTTP: 発行→匿名第三者閲覧→取消→404、期限/停止/原本削除/Place停止、他UID拒否、保持設定不足でも既存リンク閲覧維持、承認削除で本体+本人履歴除去。
- Stripeは公式SDK adapter/署名/正規Price/Invoice/PaymentIntent照合をfixtureで確認。checkout URLやreturnだけでは有料権利を付けず、重複/順序/取消/更新失敗/返金/旧権利を回帰。
- 紹介は確認済みID、匿名UIDの登録前proof、重複/旧ID/他体験拒否、7日/no auto billing、月3件の装飾、予算/回数/input/output-thinking、unknown保留と承認返却を確認。月3件超過後も予算内で新規側をgrantにする公開条件を確認。
- Web Pushは実driverを注入した配信サービスfixture、原文非混入/購読先allowlist/権限/停止競合/同時claim/無効購読除去/unknown再送抑止を確認。ブラウザ許可APIとOS表示は合成。
- 店舗申請は同意/非公開連絡先/ID世代/他UID/偽装役割/担当slug、下書きだけの承認、取り下げscrub、終了案件だけの承認削除を確認。
- 支払い計測は実ローカルHTTPへ固定payloadだけを配送し、同時claim/opt-out/原本削除/unknown保留/承認削除を確認。実PostHogへは送っていない。

## 実環境・未検証

Productionは公開GETのみ: evidence/production-readonly-latest.json。トップ/manifest/公開statusが200であることまで。新sourceは未反映。実Gemini生成・実データの書込/削除・課金・通知を行っていない。

PRのhead/CI/個別Previewはevidence/pr-snapshot.json。固定Previewへの最新候補の反映証拠はrelease-readiness.md。ローカル実ブラウザと、Preview実ログイン受入を分ける。実iPhone Safari/Android Chrome/Samsung Internet、VoiceOver/TalkBack、実OSキーボード、実LINE/Google/メール、複数端末/2アカウント、実店舗/実Stripe/実OS通知、実画像配信、PostHog実着信、実請求照合は当該sourceでは未検証。

PostHog connectorは応答せず、中断後の25秒と10秒で打ち切った再試行でも証拠を得られなかった。送信コードやHTTP200を実着信と読み替えない。利用者数/継続率/転換率の架空実績はない。

## 性能と残る警告

buildは成功したが、500KB超のclient chunk警告と将来のVite native config loader向けJSON import警告が残る。警告の閾値を上げて隠していない。静的JS/gzipサイズはevidence/integration-build-sizes.jsonで、初期通信量/実回線速度の測定ではない。モバイル回線、Firestore実読取数、画像CDN、実Geminiのfirst token/総時間の最終受入は未完了。
