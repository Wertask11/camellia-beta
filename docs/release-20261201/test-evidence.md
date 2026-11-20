# 新sourceの検証証拠

監査開始2026-11-19。ログの正確な時刻はUTCで保存する。先行統合コードは `145aa5db8e631b4c7d9fe37a77730cd38b4c3a47`。最新の支払い管理追加後は下欄のaf3de9eを参照。その後の変更は試験結果のsource表記と報告書。統合中に発見した紹介trialの通常枠迂回を修正し、専用レーン/明示再試行UIもこのsourceで再検証した。前回の本人確認や旧合格結果をこのsourceの実受入に流用していない。最新のアプリ/固定Previewは76c42e2。

## Plus契約条件・計測帰属の追加後

最新アプリコード `76c42e2c1ff230a342bd8642980c9ed84e1bd795`。先行93bbead（上限/文脈/契約参照）、c44fe92（送信失敗時の枠消費を明示）に、実際のCheckout intent作成時だけ分析同意を保存する修正を加えた。数値は未承認/未適用。

- 追加枠の無効単価停止を含め、全78 unit、25 Firestore emulator scripts、lint、typecheck、Production相当buildを新sourceで再実行し全てPASS。最終結果/ログhashはevidence/release-final-checks.json。過去93bbeadの合格結果を393d129へ流用しない。
- 新しいpaid契約条件の固定、正規Invoiceの契約参照、日次上限/文脈、無料利用分の引継ぎ、旧権利/別operator権利/不明契約/条件破損の保護、両model×6 Safetyを検証する。実Stripe/Geminiではない。
- 料金/同意/version、未承認時の拒否、同一intent再試行、計測停止、独立した支払い管理を5幅で操作。無料/メールID復旧/両方向style切替/紹介枠/共有/紹介/通知/店舗申請も再実行し、evidence/plus-*へ分離する。
- 支払い計測ブラウザの初回は2回目のHTTP要求より先にPythonが件数を判定して失敗。2件目の実通信をEventで待って、同じ件数/同じrequestIdの検証を維持して再実行した。assertionの削除や固定sleepで合格にしていない。
- 分析bindingの移動時の変数参照漏れは型/lintで検出し、修正した393d129で再実行。失敗時のローカルFirestore取引はrollbackされ、実データ・実決済へ影響していない。
- 2026-11-20のPostHog read-only skill discoveryも12秒で応答せず。新しい実着信/Insights/D1/D7/D30は引き続き未検証。プロジェクトへの書込や合成イベント送信はしていない。

## 支払い管理追加後の再検証

アプリコード `af3de9e2226d15f57e7e1fb1e34323ae1e14f830`、テストfixtureのconst修正 `61ac5c91a129bc1969674467511d1e2f711d47a2`。旧145aa5dの証拠はそのまま残し、新しい検証を evidence/billing-* へ分離する。

- lint・typecheck・77/77 unit・24 Firestore emulator scripts・buildはローカルでPASS。原本削除後の実billing API、未認証/未検証メール/別UID/作り直したIDの拒否を追加。ログhashはevidence/billing-management-checks.json。
- 専用UIは375/390/412/768/1280すべてPASS。consumerプロフィールなし、停止状態、履歴表示、Portal失敗後の復旧、原本を消さないlogout、同端末/別端末形式のメール確認を操作。evidence/billing-management/result.json とPNG。実メール・Stripeではない。
- 最初のPR98 CIは新規emulator fixtureの`let`を`const`へ直すlint指摘で失敗。修正後ローカルlintを再実行。61ac5c9でquality CI全ステップSUCCESS・Vercel successを確認。evidence/billing-management-ci.json。固定URLへの反映と本人受入は別に記録する。
- 過去のFree/ID復旧/モデル切替・紹介枠UIと、新規共有/紹介/通知/店舗申請/支払いUIも、当該アプリコードで全5幅を再実行し全てPASS。evidence/billing-regression/summary.json と billing-gated-regression/summary.jsonへ別保存した。実アカウント受入とは区別する。

## 145aa5dで実行したコマンド

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


## 最終候補76c42e2の確定証拠

- `work/release-final-{lint,types,unit,firestore,build}.log`：lint/typecheck/78 unit/25 emulator/Production相当build全てPASS。新しい追加枠の単価停止、無料30回/旧Plusの保護、同意撤回時のbinding除去も含む。ログhashはevidence/release-final-checks.json。buildのindex setupはskipped。
- 全5幅の無料/ID復旧/両方向model切替/紹介枠がPASS：evidence/plus-regression/summary.json。共有/紹介/通知/店舗申請/支払い計測がPASS：plus-gated-regression/summary.json。料金同意/version/未承認拒否/同intent再試行と独立支払い管理もPASS：plus-conversation-policy/checkout と management。認証/Stripe/Gemini/OSは合成。各execution.jsonはsource・証拠記録時刻・hashを保持。既存fixtureの古い日付fieldはlegacyFixtureDateFieldとして残し、実行日と混同しない。
- PR99の76c42e2でquality全step SUCCESS。Vercel Preview buildもSUCCESS。同じ固定branchをこのSHAへFF更新した。証拠はplus-ci-final-source.jsonとfixed-preview-final.json。後続の報告書commitとアプリsourceを分離する。
- 11/20のProduction公開GETはトップ/manifest/Chat/Circle/Place/membershipすべて200。Chat enabled/dataPolicy unknown/rateLimit firestore、Circle enabled/ready、Place server disabled、checkoutReady false。これは旧本番の公開応答であり新候補のProduction合格ではない。実生成・ログイン・支払い・配信は行っていない。
- 固定Previewへの直接HTTPはURLError。実メール/LINE/Google・端末同期・実Gemini・実Stripe・実OS通知・PostHog着信を未検証のまま保持する。

11/20にnpm auditを再取得。実行依存critical0/high0/moderate15/low1、全体critical0/high0/moderate24/low3。結果はrelease-audit-production.json / release-audit-all.json。監査のexit 1は残る中/低の指摘で、指摘ゼロとは報告しない。以前の監査数を新しい取得結果へ流用していない。
