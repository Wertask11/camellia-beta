# Camellia α Analytics監査（2026-10-21）

## 判定と証拠の境界

**全体判定 NOT READY / Checkの実着信・Todayの画面表示 PASS（2026-10-22追記）。** 固定Previewで本人が操作した開始→Check表示→気分選択→保存が、project **594848** に同じpersonの順序で届きました。本人がNetworkで確認したHTTP200の `$insert_id` も、PostHogの `check_start` と完全一致しています。既存ファネルをToday・固定Preview条件で実行し、最初の4段階が各1人・100%と確認し、本人もTodayで人数表示を確認しました。一方、続く会話QAは両モデルで失敗し、エラー記録を実照合しています。残る制約は、会話APIエラーの切り分けと成功応答の計測、実認証でのaccount切替、修正後の全機能の通し計測、日本時間と本番専用の指標設定です。コード修正の本番反映とは分けて扱います。本番へはmerge/deployしていません。

- branch: `fix/camellia-production-analytics-20261021`
- baseline main / Production source: `094959fe5302cde5af1cc0cdd4dc62854cb41a72`
- 調査開始時: 元worktreeはclean、mainとremote mainは一致、open PRは0。新しい独立worktreeで実装。
- 調査時Production deployment: GitHub側のVercel Production `7189356225` / success。公開root/APIおよびclient asset `page-BxPv21s5.js`を確認。
- 確認用URLは既存の固定Previewのみ: https://camellia-beta-git-codex-camellia-alpha-relea-161533-school-park.vercel.app/
- ownerから受領したPostHog URL: https://us.posthog.com/project/594848/insights 。接続後に4つの既存Insightの実定義を確認（下記）。
- 実装commit: `489305c23eeab81e60a964a1fde0d6008209c0b5`。PR: https://github.com/Wertask11/camellia-beta/pull/48 （Draft）。固定Previewでこの実装の実着信を確認。2026-10-22にmainが引き続き上記baselineであることも照合。

## 本人の実操作と実着信（10月22日）

[個人情報を除いた実証データ](evidence/analytics-20261021/live-posthog.json)。HTTP200は本人のDevTools報告であり、こちらがHARを取得したものではありません。PostHog側はconnectorから実レコードを直接照合しました。

| Event | 本人操作の時刻（JST） | PostHog created_at（JST） | UUID / $insert_id |
|---|---|---|---|
| session_start | 15:08:21.214 | 15:08:22.335 | `8e107717-633a-46a5-9550-378658ad2a0c` |
| check_view | 15:08:29.489 | 15:08:30.855 | `70e07d6f-603d-4dc7-a4aa-56e75d6e47f8` |
| check_start | 15:09:12.271 | 15:09:12.893 | `3a099f81-0f49-4966-aaf5-ed1fd348f808` |
| check_complete | 15:09:16.804 | 15:09:17.183 | `0070c1f9-1eaa-43d2-baa4-f83ea7c3a195` |

- 4件とも固定Preview host、`app_version=beta-v3`、`event_schema=1`。identityは同じpersonへの相関だけ確認し、生のperson/distinct IDは報告しません。
- NetworkのHTTP200・insert IDは上表の`check_start`に一致。全4件のHTTP statusを個別採取したとは言いません。
- 既存「Camellia 初回体験ファネル」`26TwFhaG`を、Today（project UTC）・固定Preview hostで一時実行。unique personの順序付き集計で最初の4段階が **1→1→1→1**。Fortuneの3段階は0。本人は既に当日のカードを引いており、今回の再編集で引き直しを要求していません。
- original timestampからcreated_atまで379〜1366ms。ただしbrowser時計との誤差は未測定で、これはHTTP通信時間やPostHog UIの表示遅延ではありません。
- これは修正後の実着信証拠です。ローカルの模擬200とは明確に分けます。本人からPostHogのTodayで最初の4段階に人数が出たとの確認も受領。スクリーンショット取得と表示までの遅延測定は未実施です。

### 続く会話QA：成功扱いにしない

本人から「途中でエラー」と報告。固定Previewの10月22日15:43 JST付近を照合したところ、次の実記録を確認しました。

- Lactone: message_sent（model_id=lactone）→provider_error。
- YURA選択・Lactone→YURAの切替: selected/switchedのモデル名が正しく到着。
- YURA: message_sent（model_id=yura）→provider_error。別の送信はtimeout。
- このQA期間にresponse_receivedはなし。新しいmessage/errorのモデル帰属は実証できましたが、成功返答の帰属・両モデルの会話成功は未確認です。

clientのprovider_errorには認証やサーバー初期化等の失敗も含まれ得るため、Google側の障害と断定しません。現時点ではHTTP status/サーバーstageは不明。こちらにはVercel runtime logs接続がないので、本人へ15:43 JSTの固定ラベル・stage/status/reason/timedOutだけを依頼しました。本文や認証情報は求めません。エラーの正確な発生場所を確認する前に鍵・モデル・timeout・環境変数を変更しません。

## 「Todayに出ない」の直接的な確認

Productionの10月21日14:41〜14:42 JSTに、Checkのview/start/completeは実際に到着していました。しかし同じpersonのUTC当日開始から保存完了直後までを調べると、**session_startがありません**。既存ファネルの第1段階がsession_startなので、Checkが到着していても順序付きファネルには参加できません。旧コードの「タブの寿命で1回だけ」の入口計測と整合する欠落です。加えて送信喪失のコード障害も独立して再現しました（次節）。

wrong project / wrong hostは、project tokenの一致と実着信によって除外できました。既存4 Insightにはapp_version/旧βの保存filterがなく、beta-v3が保存定義で除外された証拠もありません。projectはUTCなのでJSTのTodayとは境界が9時間違いますが、上記14:42 JSTのCheckはUTC当日内であり、今回の欠落をtimezoneだけで説明しません。ブラウザ上で一時的に付けたfilterまで取得したわけではありません。

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
| Actual project ID | **594848 / organization Camellia**。projectのpublic tokenとrepo fallbackが一致し、Production compiled値のfingerprintも一致。本文は掲載しない |
| env scope / Vercel override | 設定操作接続なし。Production/Previewの設定有無・値を推測しない。変更していない |
| app_version / event_schema | `beta-v3` / `1`を維持 |
| SDK | lockfile/実packageとも`posthog-js 1.434.2`。`send_instantly`は対応するがHTTP通知ではない |
| Production Circle | 公開statusでenabled/ready/feedQuery ready |
| Production Place | 実在場所の一般一覧は無効。demoは計測除外の既存方針を維持 |
| その他flags | Today One Flow/Adaptiveの既存defaultを維持。flags/鍵/Rules/claimsは変更なし |
| 検証環境の制限 | PostHog接続済み。本人端末のログイン状態は監査ブラウザには引き継がれない。本人のNetwork報告と実レコードを照合 |
| Project timezone | UTC（10月21日取得）。全体の設定は変更していない |
| Internal / Test users | cohort 550748。取得時count=0。本人を除外している証拠はない |

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

## 全イベントとDashboard監査

52定義の発火元/条件/固有プロパティ/Privacy/到達経路は[全イベント表](analytics-event-inventory-20261021.md)。現行callerのない`login_skip`は未使用です。Placeの公式/予約/地図リンクはhelper経由で発火します。全イベントの実PostHog着信を確認したわけではありません。

既存Insightには変更・削除をしていません。一時的なfilterで検証しました。保存定義は以下のとおりです。

| Insight | 現在の実定義 | 問題と必要な整理 |
|---|---|---|
| [初回体験](https://us.posthog.com/project/594848/insights/26TwFhaG) / 11821407 | session_start→check_view→check_start→check_complete→fortune_open→fortune_draw→fortune_action_selected。unique person、標準ordered、1日window。strict/same session/host/dateRange/version条件の明示なし | 入口欠落でCheckまで0になる。新規認証の指標ではない。任意のFortuneを必須通過と混同しない。本番専用hostと日付を明示したDaily Checkを分離する案 |
| [Fortune利用](https://us.posthog.com/project/594848/insights/LzumdMmU) / 11632790 | open→draw→action。標準ordered、1日window。host/dateRange/version条件の明示なし | 本番とPreviewが混在。既に当日引いた人の再訪はdrawしない。openの意味を保った上で、未drawの利用と結果再訪を混同しない |
| [Check Retention](https://us.posthog.com/project/594848/insights/YTBDer98) / 11632912 | -30d、Day、check_complete初回→session_startで復帰、31interval。host条件なし | JST日付と9時間のずれ。旧session_start欠落で復帰を過少計測。本番/Preview混在。初回Check cohortと毎日のCheck再利用を区別。D7/D30は観測期間が成熟したcohortだけ評価 |
| [利用パターン別アクティブ](https://us.posthog.com/project/594848/insights/2B3LTXEq) / 11648351 | -30d、日別session_startのDAU、usage_cohort別。host条件なし | 日毎の入口欠落でDAUも過少。usage_cohortはその時点の累積履歴に基づき、当日の行動パターンや固定cohortを表すものではない |

両funnelのイベント名は現在と一致し、strict orderが原因という証拠はありません。保存定義のapp_version/event_schema/旧β filterもありません。集計単位はevent総数ではなくpersonです。Retentionはnative queryで実行できましたが、返されたキャッシュに10月21日のrefresh日時があり、10月22日の最新値と断定していません。

10月15〜22日のProduction・固定Previewの実イベント存在も確認しました。Circleの8種、Conversationのopen/sent/response/error/selected/switched、Fortuneのopen/draw/complete/action/reflection、daily reflection、tree_open、Previewのdiscover_viewなどが到着しています。ただし、この集計には修正前の交通も含み、全52イベントの今回の操作→Network→着信を実証したことにはなりません。実在PlaceはOFFで、Place着信がないことを障害扱いしません。

過去サンプルでは選択のyura/lactone、yura→lactoneの到着を確認しましたが、旧sent/responseのmodel_idはnullでした。続く10月22日15:43の修正後QAで、両モデルのsent/errorにmodel_idが入ることとlactone→yura切替を実証。APIの成功応答はなかったため、新responseの帰属は未検証です。選択回数や送信回数を成功した会話利用数と置き換えません。

本番反映日を新しい観測の起点として記録する必要があります。過去の入口欠落や送信喪失は自動補完できず、30日の数値を連続した完全な記録として扱いません。DNT/ブロッカーによる非計測も含め、Analyticsを全利用者の台帳にしません。

### 追加Insight案（まだ作成していない）

- **新規Activation**: login_view→auth_method_selected→auth_returned→login_success→profile_complete→check_complete。新規候補をlogin_success stepの`needs_profile=true`で絞る。全stepへ同じfilterを付けない。既存profileユーザーは別集計。匿名段階から別profileへ復元した既存ユーザーを勝手にaliasしない。
- **Daily Check**: session_start→check_view→check_start→check_completeの4段階を主指標にする。ordered・1日window・Production hostを明示。daily_reflection_viewとfortune_drawまでの拡張版は別にし、任意行動への未到達をCheck失敗と扱わない。1日windowは同一sessionや同一calendar dayの保証ではない。
- **Conversation**: unique利用者 / message_sentのrequested model_id別、gemini応答成功(provider)/error率、model_switched from/to。model_selectedは利用メッセージ数と別の指標。
- **Discover/Circle/Place**: discover_view、circleのview/join/post、公開後のPlace view/save/external/booking/map。demoを実利用に混ぜず、bodyや健康状態は店舗へ渡さない。
- **Retention**: Check完了者→次のCheck完了/利用session_startをJST calendar day単位でD1/D7/D30。開始/復帰event、初回/繰り返しの定義と成熟した観測期間を明示。累積`usage_cohort`はイベント時点の利用履歴であり、当日の行動や固定の新規cohortと混同しない。
- Production `$host=camellia-beta.vercel.app` と固定Previewのホストを分け、Preview検証を本番KPIへ混ぜない。`app_version=beta-v3`は現時点で変更しない。
- 日本時間の日次KPIにはproject timezoneをAsia/Tokyoに合わせる案。ただし全既存chartの区切りを変える操作なので、今回勝手には変更していない。先にその影響を本人が確認する。UTCのTodayは日本の09:00〜翌09:00であることを現行の読み取り時に明示する。

## 本人の実通し

新しいLINE callback登録は不要です。固定Previewの本人操作で、10月21日・22日の両日ともsession/view/start/completeの着信を確認しました。22日はNetworkの1 IDも一致し、本人がPostHog画面の人数表示も確認。既に引いたカードの再drawや記録削除は求めていません。モデル別sent/errorも着信しましたが、会話APIが失敗したため成功返答の帰属が残っています。Checkの同じ操作を繰り返す必要はありません。HAR、Authorization、Firebase/LINE token、会話/Check本文は取得・共有しません。

## 最終報告 A–Z（10月22日 実着信照合後）

| 項目 | 結果 |
|---|---|
| A 総合判定 | **NOT READY** |
| B 直接原因 | Checkは着信していたが同一personの当日session_startが欠落し、既存funnelの入口を満たさなかった。別途、SDK受付をHTTP成功扱いする送信喪失障害を再現して修正 |
| C 問題区分 | **複合：入口・送信処理のコード問題と、現行体験に対する指標定義の問題**。UTC境界とPreview混在にも注意。wrong project/hostは実照合で除外。本人のDNTが原因という証拠なし |
| D check_view | **PASS** 固定Previewの本人操作→実着信→Todayのnative funnel1人 |
| E check_start | **PASS** 同上、さらに本人のNetwork HTTP200・insert IDが完全一致 |
| F check_complete | **PASS** 同じpersonで順序どおり到着。今回の保存までfunnel1人 |
| G session_start | **PASS** 修正後の入口が到着。idle/JST/タブ継続はローカルPASS。長期実観測は別 |
| H Fortune | ローカルopen/draw/complete/action PASS。既存Production着信あり。修正後Previewのdraw通しは未実施（当日引き直しを求めない） |
| I Conversation | sent/errorの修正後model帰属は両モデルで実証。**実会話QA FAIL**（provider_error/timeout）。成功responseの新帰属は未検証 |
| J YURA/Lactone | 両modelのselectedと両方向switchが実着信。新sent/errorのmodel_idも到着。API失敗のため成功返答はPASSとしない |
| K Circle | 全発火元とallowlist回帰PASS。Productionの8種すべて着信あり。今回修正後の実2-user Network通しは別途 |
| L Place | 公開後の計測経路/Privacy PASS、demo除外。実Place OFF、実着信未検証 |
| M Network | **PASS（1件）** 本人報告のcheck_start HTTP200とinsert IDを実着信へ照合。ローカルでは模擬503/200/遮断も確認 |
| N ingestion | **PASS（core4件）** project594848・同じperson・順序・host/versionを実照合 |
| O PostHog UI | **PASS（本人確認）** Todayの最初の4段階に人数表示あり。native queryも1→1→1→1。UIスクリーンショットや表示遅延は未採取 |
| P 反映時間 | timestamp→created_atは379〜1366ms。HTTP送信時刻/時計差/UI表示時刻は未採取なのでUI遅延は未測定 |
| Q identity | local reset/logout/別profile保留 PASS。core4件の同一person帰属は実確認。実account切替前後の帰属は未検証 |
| R DNT | 尊重を維持、Chromium DNT送信0。本人設定は未確認 |
| S storageError | 破損/quotaで記録保護・停止・再試行PASS。元データを消さない |
| T queue/retry | HTTP receipt後のみforwardedAt。元timestamp/UUID、bounded outbox、復元抑止を確認 |
| U 現在Funnel | 2件の実定義を取得。標準ordered・person・1日window。入口欠落、任意Fortuneとの混同、host未分離、日付未明示を報告。beta-v3除外やstrictの証拠なし |
| V 現在Retention | 実定義/native実行を確認。初回Check→session_start、UTC・31interval・-30d・host未分離。旧入口欠落の過少計測と成熟期間に注意。過去値をそのまま信頼不可 |
| W 新Insight | Activation、Daily Core Loop、model別利用、JST retention、実host別の案を上記に記載 |
| X 変更ファイル | PR差分に完全一覧。analytics/store、auth成功帰属/logout、Today view hook、Discover/model properties、restore/validation、Privacy、テスト、監査文書 |
| Y テスト | lint/typecheck/42 suites/build + 5幅ローカルbrowser（実着信と別） |
| Z 本番反映 | **未反映・新しい承認待ち。** 送信修正はcore実証付きでreview可能。全面監査完了の判定は上記の残項目を解消してから。main merge/deployは本人の明示承認後のみ |

## 指定のYES / NO

ここでNOは「不可能」ではなく「要求された実環境証拠を取得していない」場合を含みます。

| # | 質問 | 回答 |
|---|---|---|
| 1 | 本人がProductionでCheckしたらcheck_viewが届くか | **YES（10月21日の既存本番着信を確認。修正コードの本番反映はまだ）** |
| 2 | 気分選択でcheck_startが届くか | **YES（既存本番と修正後Previewで実着信確認）** |
| 3 | 保存でcheck_completeが届くか | **YES（同上）** |
| 4 | ブラウザNetworkで実送信確認できたか | **YES（本人報告1件を同じinsert IDの着信に照合）** |
| 5 | project着信を確認したか | **YES（594848）** |
| 6 | Today指定で確認したか | **YES（native funnelのUTC Today・Preview hostと、本人による画面の人数表示確認）** |
| 7 | 既存30日Funnelを信用してよいか | **NO（入口欠落とhost混在があり、過去の欠損を復元できない）** |
| 8 | D1/D7を信用してよいか | **NO（旧復帰event欠落・UTC境界・host混在を整理し、新しい観測期間が必要）** |
| 9 | YURA/Lactone利用を測定できるか | **YES（選択/切替/sent/errorの実着信とモデル帰属を確認。成功返答の新帰属はAPIエラーで未検証）** |
| 10 | Circle/Place公開後も測れる設計か | **YES（本番着信検証は別途必要）** |

## 変更ファイル一覧

- `README.md`
- `app/page.tsx`
- `docs/analytics-audit-20261021.md`
- `docs/analytics-event-inventory-20261021.md`
- `docs/evidence/analytics-20261021/baseline.json`
- `docs/evidence/analytics-20261021/local-browser.json`
- `docs/evidence/analytics-20261021/live-posthog.json`
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
