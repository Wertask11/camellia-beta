# Camellia α Analytics監査（2026-10-21）

## 判定と証拠の境界

**NOT READY。** 確認できた送信障害を修正し、ローカルの実UI・実PostHog SDK・ブラウザ通信を検証した段階です。本人の実操作とproject **594848** の着信・既存Insightをまだ照合できていません。ローカルでHTTPを模擬した200は実PostHog着信の証拠ではありません。本番へはmerge/deployしていません。

- branch: `fix/camellia-production-analytics-20261021`
- baseline main / Production source: `094959fe5302cde5af1cc0cdd4dc62854cb41a72`
- 調査開始時: 元worktreeはclean、mainとremote mainは一致、open PRは0。新しい独立worktreeで実装。
- 調査時Production deployment: GitHub側のVercel Production `7189356225` / success。公開root/APIおよびclient asset `page-BxPv21s5.js`を確認。
- 確認用URLは既存の固定Previewのみ: https://camellia-beta-git-codex-camellia-alpha-relea-161533-school-park.vercel.app/
- ownerから受領したPostHog URL: https://us.posthog.com/project/594848/insights 。個別InsightのID/定義は未取得。

## 確認した障害と修正

1. **実装上の送信喪失を再現。** SDK `capture()` の戻り値はHTTP成功通知ではないのに、storeはtrue直後に`forwardedAt`を付けていました。ブラウザで送信を503にしたbaselineでも4イベントが送信済みになりました。[修正前の証拠](evidence/analytics-20261021/baseline.json)。これはownerの「Todayに出ない」原因の候補として実証したコード障害であり、その操作の唯一の直接原因と断定していません。
2. **HTTP受付後だけ送信済みにする。** SDKの公開`before_send` hookで許可済みSDK envelopeを取り出し、SDK側の重複した自動送信は停止。アプリの永続outboxからPostHogの公開`/batch/`へ送信します。公開tokenのみで、認証tokenやcookieは送りません。SDKのprivate APIを改変せず、SDKの版も更新していません。
3. **再送。** 失敗時は元timestamp・UUID・`$insert_id`を保持。5秒から最大120秒のbackoff、online/focus/可視化で再試行。profile/送信先ごとにFIFO。永続keyをイベント別にしてタブ間のoutbox全体上書きを防止。受付receiptの保存失敗時も連続送信しません。4xx（408/429除く）は保留・自動連打しません。
4. **保存の上限。** 送信待ち最大500件、最大7日。受付receiptは本文を持たず最大500件/7日。同時タブ/送信直後の終了ではat-least-onceの重複再試行があり得るため、同じUUID/insert IDを使います。「必ずexactly once」やserver ingestion成功とは表現しません。
5. **session_start。** 従来のタブ寿命の真偽値を、profile別・30分無操作・JST日付変更のセッションへ更新。foregroundのfocus/操作で復帰を検出。Todayに滞在したまま新セッションになった場合はviewも更新します。並んだイベントのtimestamp/queue順序も維持します。SDKの`$session_id`はSDK自身の定義なので、JST単位のアプリsession_startと常に同じ境界ではありません。
6. **Check開始の重複防止。** 前セッションの未完了check_startが、新しい日の開始を永久に抑止しないようにしました。同じCheck内の気分変更/詳細変更は重複させず、完了後の明示的な「選び直す」は従来どおり再計測します。
7. **identity。** profile IDが変わる前にSDK reset。logoutでもresetし、旧accountの未送信イベントの帰属を別accountへ付け替えません。認証成功イベントは復元完了後のprofileで記録。成功していないpopupの復帰/失敗計測は維持。生Firebase UIDは使いません。本人による実LINE/Google/SchoolPark・account切替は追加検証待ちです。
8. **remote restore。** 過去イベントを再送しない既存方針を維持。ただし新たな復元時には偽のforwardedAtを作らず、`deliverySuppressed=restored`を付けます。既存の過去forwardedAtを一括消去・再送しません。以前失われた着信や過去の誤った「送信済み」は自動で復元できません。
9. **Privacy。** SAFE_PROPERTIESを維持し、文字列の値もenum/catalogで制限。SDK追加項目も別allowlistで制限し、nested URLを含め認可query/hashを除去。本文・人名・住所・メール・生UID・認証token・任意の登録プロパティを送らないようテスト。DNT/optoutで作ったイベントを後から送らないよう抑止理由を保持。Privacyの公開文とアプリ内説明をそろえました。
10. **必要なKPI。** Discover表示を`discover_view`で追加。Conversationの送信/受信/失敗にallowlist済み`model_id`を付け、選択回数と実際の利用を区別。retryは元requestのmodelを維持。これは利用者が選んだ話し方であり、基盤providerや安全応答の人格差を保証する値ではありません。
11. **Preview診断。** `window.__CAMELLIA_ANALYTICS_DEBUG__`にhost、イベント名、時刻、queued/http_accepted/固定の失敗カテゴリだけを表示。ID・本文・tokenを含めず、操作機能はありません。Productionはcompile-timeで無効です。

## 環境と送信先の確認

| 項目 | 確認結果 |
|---|---|
| Expected project | 594848 / US（本人指定） |
| Production compiled host | `https://us.i.posthog.com` |
| compiled token | 存在1件。fingerprint SHA-256先頭`2296416371c6`。値そのものは掲載しない |
| repo fallbackとの比較 | compiled値はfallbackと一致。ただし同値のenv overrideかどうかは断定不可 |
| Actual project ID | **未照合**。project管理APIへの接続が必要 |
| env scope / Vercel override | 設定操作接続なし。Production/Previewの設定有無・値を推測しない。変更していない |
| app_version / event_schema | `beta-v3` / `1`を維持 |
| SDK | lockfile/実packageとも`posthog-js 1.434.2`。`send_instantly`は対応するがHTTP通知ではない |
| Production Circle | 公開statusでenabled/ready/feedQuery ready |
| Production Place | 実在場所の一般一覧は無効。demoは計測除外の既存方針を維持 |
| その他flags | Today One Flow/Adaptiveの既存defaultを維持。flags/鍵/Rules/claimsは変更なし |
| 検証環境の制限 | PostHog管理接続が未追加。実認証は本人端末にあり、この監査ブラウザに引き継がれない |

## ブラウザと自動テスト

[修正後のローカル証拠](evidence/analytics-20261021/local-browser.json)は実React画面/storeと実SDKを使用します。cloud auth/sync/API応答とPostHog HTTPは明示的に隔離しています。synthetic UUID以外の個人IDは記載していません。

- 375/390/412/768/1280: Check操作と送信順、横overflowなし。
- 390: 503→未送信維持→reload→online→元4 IDの200受付。event timestamp/UUIDを保持。
- 390/1280: Fortune open/draw/complete/action、Discover表示、Tree追加、会話送信/応答、YURA→Lactoneの選択/切替を実UIから実SDK/模擬HTTPまで確認。
- DNT=1: 実Chromiumで送信0。トラッカー遮断時: 未送信維持。破損localStorage: 元データを上書きせず送信0。
- Samsung Internetは過去baselineでUAを模擬しただけ。**実SamsungエンジンでのPASSではない**。WebKit/Firefoxはこのruntimeに未導入で未検証。本人のDNT/広告ブロッカーが直接原因かは未判定。
- 既存40 + 新規2 = 42 suites。queueのreceipt保存quota/削除中in-flight/別profile/別tab/4xx/backoff、sessionのJST/idle、SDK境界/identity/logout、privacyを追加。sync/storage/legacy会話/Memory/Action/Safety等の回帰も対象。
- 実行: `npm run lint`、`npm run typecheck`、`npm test`、`npm run build`。
- ローカル実ブラウザ再現: `node tests/analytics-layout.mjs`を起動し、別プロセスで`python tests/analytics-browser.py`（Python Playwright/Chromiumが必要）。全外部送信をinterceptする専用fixtureであり、実Productionに対して実行するテストではありません。

## 全イベントとDashboard監査の残り

52定義の発火元/条件/固有プロパティ/Privacy/到達経路は[全イベント表](analytics-event-inventory-20261021.md)。現行callerのない`login_skip`は未使用です。Placeの公式/予約/地図リンクはhelper経由で発火します。全イベントの実PostHog着信を確認したわけではありません。

既存Insightには変更・削除をしていません。project接続後、次を**実定義と照合してから**変更案を確定します。

1. Camellia 初回体験ファネル、Fortune利用ファネル、Check D1/D7/D30、利用パターン別アクティブユーザーのID/定義/現行データを取得。
2. 各step名、unique distinct users/personsか総event数か、ordered/strict、conversion window、person/session条件、日付、$host、app_version/event_schema、旧β filterを確認。interveningイベントがあるためstrict orderにより欠落する可能性も照合。
3. project timezone、本人browser timezone、UTC/JSTとevent original timestamp/ingestion時刻を比較。TodayはJST 00:00–翌00:00（UTC前日15:00–当日15:00）。timezoneが未取得なので直接原因とは断定しない。
4. same `$insert_id`・event名・original timestampをNetworkと管理側のraw eventで照合。distinct_idは存在/一致だけ記録し、生のIDを報告へ転載しない。受付→ingestion→UI表示の待ち時間を測る。
5. rollout日付を記録。過去の着信喪失や既存funnel設定が未確認の30日数値を、そのまま信頼できるとはしない。DNT/ブロッカーによる非計測があり、Analyticsを全利用者の完全な台帳にしない。

### 追加Insight案（まだ作成していない）

- **新規Activation**: login_view→auth_method_selected→auth_returned→login_success→profile_complete→check_complete。新規候補をlogin_success stepの`needs_profile=true`で絞る。全stepへ同じfilterを付けない。既存profileユーザーは別集計。匿名段階から別profileへ復元した既存ユーザーを勝手にaliasしない。
- **Daily Core Loop**: session_start→check_view→check_start→check_complete→daily_reflection_view→fortune_draw。orderedで途中イベントを許可。30分window等は実行動を確認して決定。Fortuneは任意なので全員が末尾まで進むことを必須指標にしない。
- **Conversation**: unique利用者 / message_sentのrequested model_id別、gemini応答成功(provider)/error率、model_switched from/to。model_selectedは利用メッセージ数と別の指標。
- **Discover/Circle/Place**: discover_view、circleのview/join/post、公開後のPlace view/save/external/booking/map。demoを実利用に混ぜず、bodyや健康状態は店舗へ渡さない。
- **Retention**: Check完了者→次のCheck完了/利用session_startをJST calendar day単位でD1/D7/D30。開始/復帰event、初回/繰り返しの定義と成熟した観測期間を明示。累積`usage_cohort`はイベント時点の利用履歴であり、当日の行動や固定の新規cohortと混同しない。
- Production `$host=camellia-beta.vercel.app` と固定Previewのホストを分け、Preview検証を本番KPIへ混ぜない。`app_version=beta-v3`は現時点で変更しない。

## 本人の実通し（接続・Preview公開後）

新しいLINE callback登録は不要です。固定Previewで本人がログインし、Todayで気分を1つ選択→保存→今日の一枚を引く。その時刻のsession/view/start/complete/Fortuneを管理側で確認します。必要なNetwork照合は**PostHog宛のbatchだけ**で、HTTP status・event名・timestamp・$insert_idのみを記録します。HAR、Authorization、Firebase/LINE token、会話/Check本文は取得・共有しません。診断画面だけで着信PASSとは判定しません。

## 最終報告 A–Z（実着信待ちの監査状態）

| 項目 | 結果 |
|---|---|
| A 総合判定 | **NOT READY** |
| B 直接原因 | 本人の現象の直接原因は未確定。SDK受付をHTTP成功扱いする障害を再現して修正 |
| C 問題区分 | コード問題は確認済み。PostHog設定/env/DNT/queryの寄与は未照合 |
| D check_view | 実着信Gate FAIL（未検証）。ローカルUI/SDK/HTTPはPASS |
| E check_start | 同上。初回選択・重複防止・新セッションはPASS |
| F check_complete | 同上。保存後の順序と再送はPASS |
| G session_start | 同上。idle/JST/タブ継続を修正しローカルPASS |
| H Fortune | ローカルopen/draw/complete/action PASS、実着信未検証 |
| I Conversation | ローカルopen/sent/response PASS、API応答は隔離、実着信未検証 |
| J YURA/Lactone | ローカルmodel_idとselect/switch PASS、実着信未検証 |
| K Circle | 全発火元とallowlist回帰PASS。今回の実2-user着信検証なし |
| L Place | 公開後の計測経路/Privacy PASS、demo除外。実Place OFF、実着信未検証 |
| M Network | ローカル実ブラウザの模擬503/200/遮断を確認。本人の実PostHog通信は未確認 |
| N ingestion | 未確認 |
| O PostHog UI | 未確認 |
| P 反映時間 | 実環境で未測定 |
| Q identity | local reset/logout/別profile保留 PASS。auth復元後IDを使用。本人の実login/restoreは待ち |
| R DNT | 尊重を維持、Chromium DNT送信0。本人設定は未確認 |
| S storageError | 破損/quotaで記録保護・停止・再試行PASS。元データを消さない |
| T queue/retry | HTTP receipt後のみforwardedAt。元timestamp/UUID、bounded outbox、復元抑止を確認 |
| U 現在Funnel | 定義未取得。event名だけの存在確認ではPASSにしない |
| V 現在Retention | 定義/timezone/成熟期間が未取得 |
| W 新Insight | Activation、Daily Core Loop、model別利用、JST retention、実host別の案を上記に記載 |
| X 変更ファイル | PR差分に完全一覧。analytics/store、auth成功帰属/logout、Today view hook、Discover/model properties、restore/validation、Privacy、テスト、監査文書 |
| Y テスト | lint/typecheck/42 suites/build + 5幅ローカルbrowser（実着信と別） |
| Z 本番反映 | **まだ不可。** owner実操作とPostHog着信/queryの照合後、本人の「本番に反映して」を待つ |

## 指定のYES / NO

ここでNOは「不可能」ではなく「要求された実環境証拠を取得していない」場合を含みます。

| # | 質問 | 回答 |
|---|---|---|
| 1 | 本人がProductionでCheckしたらcheck_viewが届くか | **NO（未確認・修正未反映）** |
| 2 | 気分選択でcheck_startが届くか | **NO（同上）** |
| 3 | 保存でcheck_completeが届くか | **NO（同上）** |
| 4 | ブラウザNetworkで実送信確認できたか | **NO（ローカルinterceptの確認のみ）** |
| 5 | project着信を確認したか | **NO** |
| 6 | Today指定で確認したか | **NO** |
| 7 | 既存30日Funnelを信用してよいか | **NO（定義・欠損期間未監査）** |
| 8 | D1/D7を信用してよいか | **NO（同上）** |
| 9 | YURA/Lactone利用を測定できるか | **YES（実装設計・ローカル検証。project着信GateはNO）** |
| 10 | Circle/Place公開後も測れる設計か | **YES（本番着信検証は別途必要）** |

## 変更ファイル一覧

- `README.md`
- `app/page.tsx`
- `docs/analytics-audit-20261021.md`
- `docs/analytics-event-inventory-20261021.md`
- `docs/evidence/analytics-20261021/baseline.json`
- `docs/evidence/analytics-20261021/local-browser.json`
- `hooks/useCamelliaStore.ts`
- `hooks/useCheckView.ts`
- `lib/analytics/delivery.ts`
- `lib/analytics/diagnostics.ts`
- `lib/analytics/once.ts`
- `lib/analytics/posthog.ts`
- `lib/analytics/session.ts`
- `lib/auth/camellia.ts`
- `lib/schoolpark/restore.ts`
- `lib/storage/validation.ts`
- `public/privacy.html`
- `screens/CamelliaScreen.tsx`
- `screens/DiscoverScreen.tsx`
- `screens/PrivacyScreen.tsx`
- `screens/TodayScreen.tsx`
- `screens/TodayScreenClassic.tsx`
- `tests/analytics-browser.py`
- `tests/analytics-delivery-cases.mjs`
- `tests/analytics-layout-entry.tsx`
- `tests/analytics-layout.mjs`
- `tests/analytics-pipeline-cases.mjs`
- `tests/profile-restore.mjs`
- `tests/run-unit.mjs`
- `types/index.ts`
- `vite.config.ts`
