# 検証証拠（2026-11-11 UTC）

## 検証対象と実行環境

main基準 `91e95bac4237f5349d6c35e7a0ae7b24087dd5d3`、#62〜#72を祖先として含む #73。今回の機能コード基準は `0b85594`（削除intent後片付け/表示748319e、安全なsession_start経路UUID0b85594を含む）。この後の文書だけのcommitは機能差分と区別する。

Node24.19、Java21、Linux Chromium/Playwright、Firebase emulator demo-camellia。既存の本番設定・資格情報は変更していない。実SDK/実Rules emulatorと、HTTP/認証/provider fixtureを区別する。

## 再実行コマンド

```sh
npm run lint
npm run typecheck
npm test
npm run test:firestore
npm run build
```

0b85594と同じソースに対して上記を順番に実行し、すべてexit0。unitは**59/59 suite**、Firestoreは**13エントリー**。個々のassertion数を59と呼ばない。ログ：`work/final-{lint,types,unit,firestore,build}.log`。emulatorは意図したpermission拒否・CAS競合・通信遮断と、GCP metadata資格情報探索403の警告を含むが、runner最終結果はexit0。

|試験|範囲|結果の意味|
|---|---|---|
|completion-sync-firestore|実client SDK×独立2接続/実Rules、v3→v4原本backup、stale CAS、復元、個別tombstone、offline復帰、logout/login、foreignowner拒否、削除lock、旧端末復活防止|合成identity。本人Android/LINE/Googleの証拠ではない|
|completion-operations-firestore|担当scope dry-run/付与/解除/audit、無承認保持停止、期限削除dry-run/変更拒否/実削除/fresh不明保留|隔離emulatorのみ。本番権限・TTL未操作|
|completion-ai-cases/firestore|実runtime generator＋SDK fixture、primary/fallback、stream、usage/thinking/cache/失敗/中断、同時receipt、専用枠予約/未dispatch返却/不明hold/停止|実SDK境界は接続。実Gemini・単価・請求額は未照合|
|completion-operator-cases/firestore|専用入口、scope/古い編集/同slug/他店拒否、管理preview非計測|HTTP auth fixture。実担当/店舗受入なし|
|completion-activation-cases/firestore|新規server登録時刻、LINE/Google identity fixture、intentUID固定/同時完了、装飾永久選択/装着/解除、通知JST/頻度/重複/停止/unknown/retry|実OAuth/campaign/実デザイン/実通知なし|
|completion-billing-cases/firestore|未設定/署名/形式/500JPY、binding、同時/改変replay、更新/取消/返金順不同/期限/旧権利、outbox|合成署名adapter・emulator。実カード/課金/processor未接続|
|quality-circle-place-firestore等|他人/他店の拒否、公開情報だけ、手動Place紐付け、投稿削除/Place停止、Report/Block境界|最新ソースの自動回帰。2実アカウント受入の代用ではない|
|analytics-pipeline/delivery/privacy/quality|HTTP receipt、insertId/uuid/timestamp、retry/dedup、DNT/別account/削除、JST境界、経路UUID allowlist、不正値/本文/氏名/Check/Tree排除|合成HTTPで新コード確認。新HEADの実PostHog着信ではない|
|既存回帰|Today/Fortune/Auth/Sync/Memory/Tree/Library/retry/search/newthread/YURA/Lactone/Action/Safety/RateLimit/Circle/Place|59suiteと13emulator全体に含む。過去PASS流用なし|

## ブラウザ

`tests/ux-preview.mjs` を各fixtureモードで起動し、`CAMELLIA_EVIDENCE_DIR` を `/workspace/outputs/camellia-release-completion-20261111/<script>/` に設定して次を実行する。

- CirclePlace fixture OFF：quality-browser.py、quality-place-browser.py、quality-referral-browser.py、quality-slow-browser.py、completion-operator-browser.py。
- ON：quality-experience-browser.py、quality-operator-browser.py、completion-data-browser.py、completion-tree-browser.py。
- 別conversation fixture：`node tests/conversation-v3-layout.mjs` → `CONVERSATION_V3_BROWSER_OUTPUT=/workspace/outputs/camellia-release-completion-20261111/conversation python tests/conversation-v3-browser.py`。

対象は各375/390/412/768/1280。10シナリオ群×5幅＝50 viewportシナリオ。実コンポーネント/端末storage/File APIを使い、auth・HTTP・Gemini/syncはfixture。低速、読み込み/空/失敗、画像、条件、dialog focus/Escape/keyboard/inert、selector、長い説明、overflow、composer縮小、v4ファイル復元/個別削除、管理入口、Tree装飾を確認する。OSキーボードは画面縮小による近似で、実キーボードPASSではない。

最新再実行の結果とsource digestは [browser-evidence.json](browser-evidence.json)。ログ`work/final-*.log`。画像は同outputsディレクトリ。390pxモデル選択と375pxTreeを目視確認し、ラベル・選択・focus表示・画面幅を確認した。最終デザインはLOCAL TEST DESIGNの合成assetであり採用デザインではない。

初回のPlace試験は公開fixture ONでデモ3件を期待して停止した。OFF/ONをシナリオに合わせて分離し再実行した。カード数の確認は読み込み完了を待つassertionへ修正。製品の権限/入力検証を緩める修正ではない。React二重読込はworktree専用cache/noDiscoveryで解消した。

## GitHubとPreview

[PR #73](https://github.com/Wertask11/camellia-beta/pull/73) にlint/typecheck/unit/emulator/buildの品質CIを追加。新しいrunnerはNode24/Java21、read-only GitHub権限、秘密情報/本番deployなし。

中間cfc9011の[CI](https://github.com/Wertask11/camellia-beta/actions/runs/42983102190/job/130397882261)、e85446aの[CI](https://github.com/Wertask11/camellia-beta/actions/runs/42985176702/job/130404532712) は成功。ただし**最終headの合格の代用にしない**。最終headの状態は [ci-evidence.json](ci-evidence.json) とPR checksで確認する。

固定Previewは既存の1URL。新callback登録不要。Vercel statusはdeploy成功の証拠で、本人のログイン・操作成功ではない。本executorは固定PreviewへのCONNECT403で実画面を確認できない。TLS/ネットワーク制限を回避してPASSにはしていない。本人のAndroid専用account受入は追補の範囲で確認済み。

## Productionの読み取り確認

[production-smoke.json](production-smoke.json) の日時で、既存Productionに未認証GETのみを実施。root200、chat status200、Circle401は認証境界、Place enabled=false、membership500円/checkoutReady=falseを確認。chatのserverAuthConfiguration=presentは資格情報が正しく実Gemini生成できた証明ではない。dataPolicy=unknownを解消済みとしない。

本executorのChromium結果は同JSONに記録。CA/アクセス拒否があれば製品障害とは区別し、ignoreHTTPSErrors/認証偽装で回避しない。本番コードはmain基準のまま。新コードを本番で確認済みとは報告しない。

## PostHogの実読み取り

project594848、timezone UTC、共有設定変更なし。集計の期間は**JST 2026-11-04〜11-10の完了日**（UTC 11-03T15:00〜11-10T14:59:59.999）。native typed query、`$host=camellia-beta.vercel.app`、テストアカウント除外を勝手に変更せず全体のraw件数を取得。UTC日別bucketはJST日別と呼ばず、期間合計だけを採用。

session_start57、check_complete10、conversation_open5、message_sent2、response_received1、discover_view17、place_view3、place_selected1、my_view15、partner_share_view1、plus_offer_view3、circle_view3。詳細は [posthog-ingestion.json](posthog-ingestion.json)。運営/テストを含む**イベント件数**で、利用者数・転換率・失敗率・来店・課金実績ではない。送信2/受信1から会話失敗率を作らない。

既存[初回体験ファネル](https://us.posthog.com/project/594848/insights/26TwFhaG)はsession_start→check_view→check_start→check_complete→fortune_open→fortune_draw→fortune_action_selected、1日windowの7段階。設定のみ読取、今回のPlace/ID導線に自動適合するとはしない。metric catalogはdata_catalog:read権限不足、canonical KPIの照合・新insight保存は未実施。接続済みサービスの再接続を本人へ繰り返し要求しない。

新導線：session_start→（Check任意）→conversation_message_sent→discover_action_selected→place_view→place_selected→my_view→save_prompt_view/auth_method_selected/login_success/guest_*_saved。ゲストからaccountへの移行は本文を含まないentry_sessionで追い、別accountのidentityをaliasしない。session_startの欠落は0b85594で修正し、実HTTP envelope試験済み。新headの実着信は未確認。

D7/D30はJST暦日差、重複insertIdを除き、同じ登録済み仮名IDの対象日に1回以上の利用。分母は対象日が到来済みの登録cohortだけ。匿名cookie・account・LINE/Google未連携を混ぜず、未成熟cohortを0として数えない。$is_identifiedだけでCamellia ID作成済みと判定しない。今回は実測値を算出していない。Free→Plusは検証済み課金outboxだけをplus_completeとするが、実課金0等の未測定値も作らない。

## 未検証・未接続・未決定

- 未検証：Androidの未確認機能/実OSkeyboard/TalkBack、iPhone Safari/VoiceOver、Samsung、実Google（LINEは本人確認済み）、最新v4の実同時競合（双方向同期/再ログイン/削除は本人確認済み）、Circle新Place連携/最新運営対応、実Gemini usage/原価、実Rules/deploy rollback、最新イベント着信。
- 未接続：実決済SDK/raw body adapter/checkout/outbox publisher、実通知driver/登録先/job、承認cleanup本番schedule、正式公開の運用。
- 未決定：実店舗/許可、決済契約・方針、保持/全面閉鎖、紹介予算/AI枠/数値基準/最終装飾/超過/重複/期間、通知方式。external-dependencies参照。

実行していない本人データ削除、請求書照合、本番変更はPASSにしない。

## 2026-11-16 JST 追補：本人の実機確認

同じ固定Preview・専用アカウントで、Android→PC、PC→Android、Android再ログイン後の保存、JSON export/復元、削除した振り返りの非復活、Androidからの個人記録削除と古いPCタブの再読込後の非復活を本人が確認した。[owner-acceptance.json](owner-acceptance.json)。端末内build番号やprivate原文をこちらで取得していないため、本人申告の実操作証拠として区別する。実同時競合、別provider、Circle新連携/運営対応、実Gemini原価、全面アカウント閉鎖、Production新コードのPASSへ広げない。

実ログイン方式は本人回答でLINE。YURA→Lactoneの両方で返答が少しずつ表示されることも本人確認済み。Google実ログイン・provider receipt/token/請求照合は未確認。

## 2026-11-16 JST：元の6PRを各headで再検証

元の#62〜#67をそれぞれ別worktreeの固定headで、lint→typecheck→unit→Firestore emulator→buildの順に独立実行し、全30コマンドがexit0。全headの先行commit祖先関係とdiff --checkも確認した。[original-pr-evidence.json](original-pr-evidence.json)。共有node_modulesは全6headの同一package-lockに対応し、SDK/optimizerを同時実行せず順番に実施。古い報告のPASS転記ではない。

|PR|head|unit suite|lint/types/emulator/build|
|---|---|---|---|
|#62|e1d2c55|49/49 suites passed|全てexit0|
|#63|8f633e8|50/50 suites passed|全てexit0|
|#64|c44c613|51/51 suites passed|全てexit0|
|#65|d59c2b4|52/52 suites passed|全てexit0|
|#66|aa66fb3|53/53 suites passed|全てexit0|
|#67|fcc586c|54/54 suites passed|全てexit0|

既存Circleについても、固定Previewの別2アカウントで投稿・コメント・リアクション・PC反映・通報・ブロック・解除を本人確認済み。新Circle→Place手動紐付けはOFF、運営対応処理は今回HEADの実操作未確認。既存本番の過去実績を最新HEADへ転記しない。

## 2026-11-16 JST：着信の追加照合

[posthog-preview-evidence.json](posthog-preview-evidence.json)。固定Preview hostnameで直近期間の対象イベントは一致0件。期間をdeploy後へ広げたhostname内訳ではProduction9件・hostなし31件があるが、hostなしをこのPreviewの実績へ帰属させない。current_urlによる照合も対象3イベント一致0件。イベント0件を利用者0人やUI失敗と推定しない。

実PostHog SDKと実画面をローカルで動かし、外部HTTPを全てinterceptして、host/current_url/path/ブラウザ情報とsession UUIDが実送信envelopeに入ることを確認した。[sdk-metadata-evidence.json](sdk-metadata-evidence.json)。hostが常に欠けるコード不具合は再現せず、推測だけの修正/環境変数変更はしていない。Previewの実送信先設定、DNT/optout/追跡防止、実HTTP receiptの照合は未完了のP1ゲートとして残す。
