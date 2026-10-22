# Camellia Conversation 速度改善（2026-10-22）

## 1. 結論

実装済み・**実GeminiのBefore/Afterは未完了**。新しいbranchは `perf/camellia-conversation-streaming-20261022`。本番へmerge/deployしません。本人確認は登録済みの固定Previewだけを使います。

https://camellia-beta-git-codex-camellia-alpha-relea-161533-school-park.vercel.app/

実装と自動テストだけで「実Geminiが速くなった」と判定しません。模擬providerの実HTTP/SSE/ブラウザ比較では先頭文字の表示が改善しました（下表）。通常/予備Geminiの503・timeoutは外部依存として残ります。

## 2. 現状と最大の原因

- 調査元worktree: `codex/camellia-phase2a-circle-20261016` / `4ea733dcda0463906e7b81883b3ed0a95c706661`、clean。元の古いbranchでは作業しません。
- 最新main/remote main/Production: `19019aeb0091986df338d812ef69ba5598805827`。新しいworktreeをここから作成。開始時open PRなし。
- 実Productionの本人操作（16:28 JST、前回Analytics反映前）: 送信→受信event間 **11,600ms**、APIが報告した生成時間 **9,480ms**。次は **28,946msでtimeout**。本文は取得せず、PostHogのイベント名・時刻・provider・時間だけで照合した値です。
- 現行コードはgenerateContentの全文を待ってから一括表示。ユーザーの送信文もその後まで表示していませんでした。先頭token/先頭表示を測る計測はなく、当時のT1〜T7の内訳は復元不能です。
- この成功1件では生成時間が総待ち時間の約82%。全利用者の分布やcold startの寄与をこの1件から断定しません。Vercelログでは通常/予備とも503、その後予備のtimeoutも確認済みです。

## 3. 変更ファイルと範囲

会話画面/Workspace、API entry/handler/runtime、Context取得、Stream codec、性能計測、会話thread/storeの未完了管理、Analyticsの数値allowlist、会話専用CSS、関連テストと本文書。Today/Discover/Circle/Place/My/Tree/Fortune/Auth UIの変更はありません。完全な一覧はPR差分にあります。

## 4. 実装した高速化

1. Accept `text/event-stream`でGemini generateContentStream→Node SSE→TextDecoder→Reactの途中表示。旧JSONクライアントは従来形式で動きます。Previewだけ `?conversation-transport=batch` で一括との同条件比較が可能です。
2. 送信文とtyping indicatorを送信直後に表示。pending userだけを保存し、途中assistantはコンポーネント内だけに保持。done後に確定保存します。
3. 画面移動/別thread/account変更でabort。途中失敗はdraftを消し、完成として保存せず、明示的な再試行が可能。再読込で残ったpendingも再試行でき、同じuser IDを再利用して二重に増やしません。
4. 認証/consentと共有quotaを通過した後、Todayの2文書をAdminのgetAll 1 RPC・fieldMask（mood/stage/actionId）で取得。旧経路は2 REST要求を並列実行。読む文書数自体は2のままで、全Firestore費用が半減したという意味ではありません。Contextは任意情報なので1.5秒の予算を越えた場合は空Contextへ。旧上限は5秒。稼働中RPCを物理的にcancelできるという主張はしません。
5. 通常のGemini経路で、使わないローカルMemory/Tree応答エンジンのContext生成を省略。Tree参照/ローカル応答は既存処理を維持。
6. 直近Gemini会話8件を末尾から抽出し、長いthreadの全走査/コピーを削減。送信上限・ローカル返答除外・名前のマスクは維持。
7. stateless Google SDK clientをmodule内でlazy再利用。個人の会話/Context/認証結果はcacheしません。
8. Provider呼出しは既存の最大2回/28秒を維持。安全ブロック/鍵/認証/quotaエラーを自動再試行しません。一度prefixを表示した後は別モデルを自動で継ぎ足さず、失敗として明示します。
9. PostHogは既存の永続outboxで独立送信。AI処理でAnalyticsのHTTP完了をawaitしません。chunkごとのFirestore/履歴/Analytics書き込みもありません。

## 5. Before / Afterと計測の定義

### 実環境の既知Before

| 区間 | 実測 |
|---|---|
| Send→API開始 | 当時の計測なし |
| API受信→Gemini開始 | 当時の計測なし |
| Gemini開始→first chunk | 非Streamingのため不明 |
| Send→最初の表示 | 専用計測なし。全文受信後の一括表示 |
| Send→全文受信event | 11,600ms / 1成功sample |
| Gemini全文生成 | 9,480ms / 同sample |
| 別の失敗sample | 28,946msでtimeout |

この値を模擬Afterと割り算して「本番で何%改善」と報告しません。

### 制御したブラウザA/B（実Geminiではない）

同じ最適化後API、同じ合成応答、認証15ms/quota10ms/Context20ms、生成の最初100ms・全文800msという同一dependencyで、**配信方法だけ**を比較。390/1280とも各6回、p90はnearest-rank。React描画・local store・本物のHTTP/SSEは実行しています。これは端末/実サービスのlatency保証ではありません。

| 幅 | 一括 first visible median / p90 | Stream first visible median / p90 | 一括 full visible median | Stream full visible median |
|---|---|---|---|---|
| 390 | 909.5 / 970ms | 213.5 / 670ms | 909.5ms | 909.5ms |
| 1280 | 921.5 / 1836ms | 217.5 / 868ms | 921.5ms | 912.5ms |

この制御比較の先頭表示改善は390で約77%、1280で約76%。全文時間はほぼ同じであり、模擬providerの処理そのものを速めたという意味ではありません。[証拠](evidence/conversation-speed-20261022/synthetic-ab.json)。

10,000メッセージの履歴抽出のローカルCPU比較（200回）: median 1.173→0.00173ms、p90 2.349→0.00307ms。これは小さなCPU改善で、実Geminiの総時間改善率ではありません。[証拠](evidence/conversation-speed-20261022/history-cpu.json)。

### T0〜T9

| 時点 | 計測 |
|---|---|
| T0 | send handler入口のmonotonic clock。Preview診断には対応するepochも記録 |
| T1 | getIdToken完了後、fetch直前 |
| T2 | API entryでruntime import前に受信時刻を取得 |
| T3 | revocation/disabled確認とconsent profile検証完了 |
| T4 | 共有quota予約完了 |
| T5 | 最小Context取得完了/予算切れ |
| T6 | provider生成を開始（client初期化/回復待ちも含む区間の入口） |
| T7 | SDKの最初の非thought text chunk。JSON syntaxのchunkの場合もあり、人に見えた時刻ではない |
| T8 | 最初のreply prefixをReact描画後、2 animation framesでpaintを近似。JSON時は確定全文の表示 |
| T9 | 確定全文の描画後。network全文読了は別のclient_response_complete_ms、server生成完了はT9_server |

APIではserver_import/auth/rate_limit/context/pre_generation/provider_first_chunk/totalをmsで返します。wall clockのtimelineはPreviewだけ。clientとserverの時計差が未補正なのでT1→T2の差を純粋なnetwork時間と断定しません。background tabのpaint時間や少数sampleのp90も慎重に扱います。cold start全体をT2より前から測れるわけではなく、module importと通常処理の測定を分けます。

Previewの `window.__CAMELLIA_CONVERSATION_PERFORMANCE__` は最大20件、固定timing/timeline key・時刻・モデル・transportだけ。本文/ID/tokenなし。Productionには診断globalを公開しません。PostHogは既存response_received/errorに許可された数値とtransportだけ追加。既存response_time_ms、app_version、schemaは維持。

## 6. YURA品質

YURA固有promptとモデル/temperature/thinking設定は変更なし。質問最大1つ、短く急いで結論を出さない方針とAction抑制を維持。既存20ペアのserver routing / Safety回帰とUI切替テストに加えてstream経路を検証。実生成品質は本人のPreview確認が残ります。

## 7. Lactone品質

Lactone固有promptも変更なし。短い整理、本人が選ぶ次の一歩、catalogのAction1件程度という方針を維持。Actionカードは最終JSONをserver allowlist/個別モデルの方針で検証した後だけ表示。途中のactionIdを描画しません。

## 8. Streamingと途中失敗

UTF-8/JSON escape/Unicode surrogateの分割を処理し、JSON wrapperやthinkingは出さずreplyだけ表示。SDKのtext getterもthought partを除外する実装であることを利用中のpackageで確認。最終parseとmodel attributionの検証、doneが必要です。

providerがブロックしたchunkは転送前に拒否。後続chunkで安全ブロック/通信失敗が判明した場合、それまでのdraftを消して未完了扱いにし、履歴/Memoryへ保存しません。**既に画面へ出たprefixを未閲覧に戻すことはできません。** 最終判定前の途中表示というStreaming固有の性質は明示し、全chunkを最終判定まで保留したことにはしません。危機/診断/薬等の既存immediate Safetyは生成前に共通固定応答へ迂回し、両モデルとも同じ境界を使います。

## 9. Auth / Privacy / Rate Limit

- verifyIdToken(token,true)、anonymous拒否、同意profile確認、共有quota fail-closedを維持。認証前/不許可時にContextやGeminiを実行しません。
- logical document readはprofile1 + quota2 + Today2。transaction retry等で実readsが増える場合があり、実Firestore利用統計を取得した数字ではありません。thread/model preference/Discover全件/Memory/Treeはserverから取得しません。
- Contextにユーザー間cacheなし。SDK client再利用は接続用オブジェクトだけで、会話の共有cacheではありません。
- server logは既存のstage/status/model/time等だけ。本文・person ID・tokenを記録しません。新しいAnalyticsもfixed numeric allowlist。Memoryは本人の明示操作だけ。
- pending userは追加的な任意field。legacy thread/messageは一括移行/書換えせず、過去assistantをYURAへ付け替えません。

## 10. 残る外部要因・モデル比較

現在通常 `gemini-3.8-flash`（LOW、2048 output cap）、予備 `gemini-3.1-flash-lite`（MINIMAL、512 cap）。公式仕様では3.8 Flashはminimal非対応でエラーになるため、単純に下げません。3.1 Flash-Liteは低latency用途、3.5 Flash-Liteも候補ですが、実アカウントでの可用性・先頭token・日本語品質の比較値がないため自動変更しません。最新のGemini 4への置換もしていません。

公式のStandardテキスト単価（1M tokens/USD、10月22日時点）は次のとおりです。TTFT/品質はこのaccountでの候補別実測がないため未確認です。

| 基盤 | 位置付け | input / output | Free | 実TTFT/品質 |
|---|---|---|---|---|
| 3.8 Flash | 現通常 / LOW | $0.75 / $3.75（2026年末までの紹介価格） | 制限付きで利用可 | 既知成功は全文9.48秒、first tokenは不明 |
| 3.1 Flash-Lite | 現予備 / MINIMAL | $0.25 / $1.50 | 制限付きで利用可 | 今回のログでは503/timeout。候補比較成功なし |
| 3.5 Flash-Lite | 比較候補・未採用 | $0.30 / $2.50 | 制限付きで利用可 | このaccountでは未実測 |

これはモデル別のquotaを保証する表ではありません。具体的なRPM/TPM/RPDはこのprojectで未取得です。[公式料金](https://ai.google.dev/gemini-api/docs/pricing)に基づき、無料利用から課金や契約変更はしません。無料枠・混雑・quotaはアカウント依存で、公式model紹介から実環境TTFVTの数値を推測しません。503/timeoutが両モデルで発生する場合、Streamingだけで未受信tokenを作ることはできません。

公式参照（10月22日確認）:

- [Gemini structured streaming](https://ai.google.dev/gemini-api/docs/structured-output)
- [3.8 Flash / supported thinking](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash)
- [3.1 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite)
- [料金](https://ai.google.dev/gemini-api/docs/pricing)
- [Vercel streaming](https://vercel.com/docs/functions/streaming-functions)

Promptはcommon739文字、YURA420/Lactone380、Action426。履歴を除く合計1585/1545文字で、このbranchでは意味を削る短縮をせず維持。正確なtokenはprovider tokenizer未実測、文字数をtoken実測と呼びません。単純に約1〜2文字/tokenと仮定すると約773〜1585tokenという広い概算で、料金計算には使用しません。

## 11. Preview / 実確認

固定URLは冒頭の1つ。新しいLINE callbackは登録不要。本番への反映は行いません。Previewに公開できた後、本人に通常の方法でログイン/送信を依頼し、新しい数値の実着信を照合します。

## 12. PR / 検証

PR作成後にURL・code commit・Preview build結果を追記します。lint/typecheck/buildと43 suitesがPASS。最後のCRLF境界修正も専用stream suite・型・lint・buildで再検証。ブラウザの途中失敗/遅延Safety/再読込→再試行もPASS。375/390/412/768/1280のChromium viewportを確認。実スマートフォン固有ブラウザ/キーボードの確認は本人の実確認と分けます。

## 13. Production反映可否

**まだ不可 / 実Gemini比較・Preview確認待ち。** 新しい依頼の指示どおりbranch→PR→固定Previewまで進めます。以前のPR48への本番承認を、この別変更の承認として再利用しません。
