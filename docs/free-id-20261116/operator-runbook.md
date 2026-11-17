# 今回の追加運用手順

既存の店舗・通知・紹介・AI原価・決済運用は `../release-completion-20261110/operator-runbook.md` を維持する。以下はFree/メールIDの追加部分。

1. 固定Previewを同じURLで更新。LINE callbackを増やさない。メールリンク認証は運営回答で有効化済みだが、実配送・固定Previewの継続URL許可を実操作で確認する。秘密鍵・コード・メール本文をチャットへ貼らない。
2. 専用確認アカウントで新FreeのCheck/今日の一枚/会話/選択/振り返り→再読み込み→任意のメールID→対象件数確認→明示引継ぎ→保存確認→別端末→ログアウト/再ログインを確認。普段の記録を削除しない。
3. 既存LINE/Googleで以前の記録を復元し、Myのメール追加を選んでも同じUID/権利のままか確認。すでに他IDで使われるメールは自動統合せず以前の認証方法を案内。エラー時もFree原本・復旧控えを消さない。
4. 登録不要APIはJST日別30回/端末と通信元、署名付きCookie、同一origin、全体shared rate limit、重複receiptで保護。NAT共有/別端末別通信元の限界を説明する。実Vercelが付ける通信元header、初回SSE、翌日リセットを確認する。モデル変更で枠を変えない。カウンターのbatch transaction読取で34件同時の境界をemulator検証。
5. 障害時は本文/生IP/tokenを収集しない。503/timeout/権限/設定不足を分類し、単なる公開GET成功を実Gemini成功と扱わない。新Freeの緊急停止設定は既存認証済み会話の経路から分離。変更を勝手に実施しない。
6. 新しい日次制限台帳のexpiresAtはJST利用境界で、実削除証明ではない。保持期間の承認と `scripts/retention-cleanup.mjs` のdry-run/承認済みjob実行/実削除の検証を行う。今回Production TTL/jobは設定していない。原価単価・通貨・請求との照合は別に必要。
7. PostHogはschema2と本番/Previewホスト、demo/published、planとID状態を分ける。メール・本文・認証コードを送らない。UUID重複排除、JST境界、D1/D7/D30の観測完了cohortを確認。既存insightを上書きしない。実決済以外でplus_completeを作らない。
8. Rulesは現在の本番版を取得し、Camellia owner部分のverified email差分だけをreview・emulator・承認後に適用。テストfixture全文を共用SchoolPark本番Rulesへdeployしない。operator/moderator claimも別の本人承認なく付与しない。
9. Preview実受入→PRをstack順に検証/統合→本番反映承認→デプロイ後の実操作確認。Code完成で正式公開・課金・紹介・通知を同時に始めない。
