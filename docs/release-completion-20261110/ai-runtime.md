# AI実ランタイム・専用枠（2026-11-11）

## 接続

`gemini-runtime.ts` の実SDK呼出を観測wrapperで囲む。JSON応答とstreamのusageMetadataを取得し、入力・出力・thinking・cached・totalを分離。streamの累積値は加算せず最大値、欠落はnull。503／timeout／中断／Safety blockでも観測し、内容や例外本文はログへ出さない。本文・会話タイトル・名前・UID・リクエストIDは運用ログと原価集計へ送らない。

一送信のUUIDをclientから渡し、サーバーの検証済みUIDにひもづくprotected receiptをtransactionで取得。同じreceiptが残る間は二重dispatchを拒否。旧clientのID省略はserver UUIDで互換。共通Safetyは予約前、Shared Rate Limitは既存どおり全会話で継続。モデル切替で枠をリセットしない。新しい「もう一度試す」は新しい送信であり、新UUIDを使う。

使用量保存はprotected `config/ai_observation` のapproved・approvedBy・approvedAt・retentionMsが揃う場合のみ。未承認時も数値のみの運用ログを出し、既存Freeは継続。観測保存失敗はFree返答を失敗にせず、待ち時間も1秒で区切る。バックグラウンド保存の完遂は保証しないため、警告と未観測を監視する。リクエスト重複拒否は認証・共有rate limitと同じFirestoreを使用し、障害時は無制限に生成しない。

## 原価

モデル別JPYのinputPerMillion/outputPerMillion/thinkingPerMillion/cachedPerMillion、公式sourceUrl、checkedAt、approvedが必要。値不正はpricing_not_configured。usage欠落はusage_incomplete。推定値はinvoiceVerified=false。失敗でmetadataが得られないことを「課金0」としない。実請求書・請求API・現在の単価との照合は未実施。

日別・モデル別の試行数、失敗、Safety、中断、不明件数、取得できたtoken数と推定額を集計。JST境界。`node scripts/ai-cost-report.mjs YYYY-MM-DD YYYY-MM-DD` はread-only。返答の本文も利用者別一覧も表示しない。監視閾値を勝手に設定しない。

## 紹介Plus専用AI

通常Freeと別の明示lane `referral_extension`。紹介統合flagは引き続きOFF。準備後にもprotected trialGenerationApproved・maxTrialInputTokens・モデル単価が必要。実SDK countTokensで入力を数え、許可上限を超えれば生成せず停止。最大2試行分の保守的な見積を予約し、7日trialと専用回数・予算をtransactionで確認。リクエスト再利用は再生成しない。

未dispatchの取消だけ、枠と見積予約を冪等に返却。dispatch後の失敗・timeout・usage欠落は費用不明として保留し、推定原価が予約を超えた場合も運営確認へ。未知費用があるtrialの追加枠だけを止め、既存Freeは止めない。緊急取消は各dispatch直前に再検証。推定token原価での精算は実請求の確定ではなく、予約した最大予算を自動で解放しない。

## データ保持

`ai_request_receipts`: hash化owner、送信状態、日時のみ。expiresAtは40秒の通信境界であり削除の証拠ではない。`ai_usage_receipts`: hash化owner、試行数値・推定・期限。`ai_attempt_days`: 利用者IDを含まないモデル別JST集計。保持期間は運営承認待ち。既存承認付きcleanup jobへrequest receiptも追加したが、ProductionのTTL・設定・定期削除は有効にしていない。削除による冪等性の保持期間も運営確認が必要。

## 検証と未検証

`completion-ai-cases`：数値抽出、thinking/cache原価、不正単価、不明usage、stream累積、失敗・Safety・abort、保存障害時Free継続、検証UID、重複拒否。

`completion-ai-firestore`：実ランタイムgenerator＋SDK response fixture＋実emulator ledger、primary失敗/fallback成功、stream、同時重複、専用枠の予約・返却・確定・不明保持・緊急停止。金額と回数はテスト専用の値で、本番値ではない。実Geminiの現在のusage・価格・請求の検証とは区別する。API key・環境変数・本番課金設定は変更していない。

## この差分の再実行結果

2026-11-11 UTC、c42f255＋本差分：unit56/56、Firestore全10エントリー、typecheck、lint、buildがexit0。会話Library／検索／旧会話／YURA3turn→Lactone3turn→逆切替／再読込／selectorのkeyboard・Escape／composer縮小画面を375/390/412/768/1280で再実行し全PASS。合成SDK・認証・ブラウザ画面の証拠は実Gemini／実OSキーボード／実OAuthとは別。ログwork/ai-*、画面証拠は`/workspace/outputs/camellia-completion-20261110/conversation-ai/results.json`。
