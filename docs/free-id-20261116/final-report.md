# Free・メールCamellia ID・Plus再設計 最終報告

2026-11-17 JST。**総合 PARTIAL**。主要体験の本人受入source：`305713796a68ba44d8a5c354673ce25271aadd26`。最新の機能sourceは `80c2881cea9e71911e9247c16afeb36b08980183`（Preview専用診断と日次予約の混雑処理を追加）。文書だけの後続commitと区別する。mainは `91e95bac4237f5349d6c35e7a0ae7b24087dd5d3`、Productionは未変更。

## 1. 調査で確認した現行仕様

mainとremote main、PR #62〜#78のbase/head/CIと旧固定Previewを確認。#62〜#73を祖先にして既存v3/v4保護・認証・Circle・Place・通知/紹介/決済停止境界を引き継いだ。従来の登録前体験はタブ内の30分Check/選択、端末内定型会話、LINE/Googleの短期橋が中心。新Free・メールIDはなかった。500円/月と紹介7日/JST月3件/永久の任意装飾は確定済み。実店舗・決済は未準備、共有は内容プレビューのみという運営回答を維持。

Productionの公開GETは200、chat enabled=true/auth設定present/shared Firestore/dataPolicy unknown、membership Free/500円/checkoutReady false。これは認証付き実会話・実決済成功の証拠ではない。接続制限により固定Previewへのこのexecutorの通信と写真CDNは403で、画像配信の実成功・リモート画面の実操作を独立確認できない。[公開status証拠](evidence/public-status-20261117.json)。

## 2. 過去の確定仕様との相違

新しいFreeは登録不要の正式な基本利用で、従来の一時お試しとは保存範囲が違う。無料Camellia IDは任意の引き継ぎでメール確認を優先し、旧LINE/Googleは維持。公開名は本人の以前の修正指示どおりCamellia、YURA/Lactoneは話し方。料金・紹介・店舗・非競争のTree・任意Memory・安全境界は維持。全40項目と改修前後を [completion-matrix.md](completion-matrix.md) に省略なく継承。

## 3. 実装した改善

- **Free**：独立した端末保存領域、登録不要のToday/Check/今日の一枚/基本Gemini会話/Discover/Place事実比較/Memory/Reflection/Tree/My。FortuneはCheck後にJST1日1枚。Circle参加は既存の安全確認のためIDが必要。既存IDキャッシュをFreeへ勝手に表示・同期しない。
- **API**：同一originと署名HttpOnly Cookie、端末+通信元の日次30回、共有全体制限、重複receipt、共通Safety/allowlist/SSE。34件の同時境界はbatch transactionで過剰消費を拒否。匿名の実人一意性は保証せず、同一通信元では枠を共有する場合がある。
- **ID**：My→任意のCamellia ID→メール→本人確認→対象件数→明示的な追加→クラウド内容の照合。パスワード不要、架空氏名/DOBなし。既存IDへのメール追加は同じUID。別IDの誤統合・未確認メールでの私的APIアクセスを拒否。
- **移行/削除**：v3/v4を維持、設定・tombstone・権利を保護。途中の原本/控えを保持、同じUIDで再ログインして復旧可能。移行した内容をログアウト後の新Freeへ出さない。控えの所有関係を残して本人だけが書き出し/削除。Free削除は自身のFortune回答も削除し、他IDの記録を維持。
- **Plus**：500円/月を維持。登録不要の事実比較を保ち、許可済み希望と掲載特徴が合う理由をPlus比較へ表示。価格/期限/paid/trial/UID応答を検査。未契約checkout、共有送信、未提供特典を利用可能に見せない。会話拡張の未決定仕様は作らない。
- **UX/Privacy/分析**：正式コピーを一元化し、登録前の保存・外部AI・メール・制限・削除を説明。planとID状態を別軸でschema2計測、取得/移行/振り返り/比較を追加。本文・メール・認証コードを排除し、旧ファネルを維持。

## 4. 独立PRとファイル

|Phase|PR|branch|機能commit|
|---|---|---|---|
|A 調査・設計|[#74](https://github.com/Wertask11/camellia-beta/pull/74)|docs/camellia-free-id-design-20261116|86dfb5f|
|B Free基本体験|[#75](https://github.com/Wertask11/camellia-beta/pull/75)|feat/camellia-free-experience-20261116|e1f43eb / 4fe3551|
|C メールID|[#76](https://github.com/Wertask11/camellia-beta/pull/76)|feat/camellia-email-id-20261116|c1d3c9b|
|D Plus品質|[#77](https://github.com/Wertask11/camellia-beta/pull/77)|feat/camellia-free-plus-quality-20261117|08b1e6f|
|E UX・計測|[#78](https://github.com/Wertask11/camellia-beta/pull/78)|feat/camellia-free-id-ux-analytics-20261117|2a71c1f|
|F 監査・保護修正|[#79](https://github.com/Wertask11/camellia-beta/pull/79)|test/camellia-free-id-release-audit-20261117|fa0701b / 3057137|

巨大PR1本へまとめず、#73←74←75←76←77←78←Fとして管理。[変更ファイル一覧](changed-files.txt)。主な実装はFreeExperience / ExperienceEntry / useCamelliaStore、lib/free、lib/auth/email-id、IdentityScreen / FreeRecordHandover / EmailIdSettings、Membership / PlaceComparison、Analytics / Privacy / Terms。詳細は各Phase文書。

## 5. テストと実ブラウザ

実行結果・正確なsource・コマンド・証拠は [test-evidence.md](test-evidence.md)。64 unit suitesと15 Firestore emulator scripts、lint/typecheck/build。Free/メールID/障害復旧と旧会話の4群×375/390/412/768/1280で実コンポーネントを操作。外部Auth/メール/SDK/HTTP応答は明示したfixtureで、実メール/実Gemini/実機の合格と区別。実Firestore SDK・Rulesの所有者/未確認メール/同期/削除/権利はemulatorで別検証。

## 6. 未解決

本人操作でメール確認→明示移行→保存確認、同じメールIDによるPC→AndroidのCheck復元、ログアウトしたPCでYURA/Lactone両方の段階表示を確認。旧IDへのメール追加、実30回/JST境界、既存LINE/Googleの最新受入、新イベントのPostHog着信は未検証。写真CDNも接続制限で未確認。実店舗/決済/Plus会話拡張・紹介運用数値・通知driver・保持/実削除job・実請求は準備待ち。分類は [external-dependencies.md](external-dependencies.md)。

## 7. 追加費用・運用リスク

登録不要の実AI利用とFirestoreの日次制限/receipt/同期照合の読書き、メール送信等に従量費用が発生し得る。30回は端末/通信元の上限で金額予算ではない。無限呼出しは許可せず既存の全体shared limitも維持するが、利用人数の増加で総額は増える。公式単価・token・実請求が未照合なので架空の月額試算を示さない。データ保持/削除jobと緊急停止、NAT枠共有、端末ストレージ/ID紛失、共同Authを誤削除しない運用が必要。

## 8. 正式リリース判定

**PARTIAL**。A 開発完成とB 本番技術、C 正式公開は [readiness.md](readiness.md) の別判定。実契約・未決定/未検証が残るので総合READYやP0/P1全件ゼロと報告しない。実店舗/課金がなくてもFreeの価値体験を検証できるコードを先に完成させたが、実受入の合格は捏造しない。

## 9. Production反映前に必要な確認

同じ固定Previewで本人が新Free/メール/旧ID/同期/削除/会話/計測を受入→PRをstack順に検証/統合承認→現在の共用Rulesとverified email差分を照合し適用承認→互換切戻しを維持したProductionデプロイ承認→本番主要導線を実操作。課金/共有送信/紹介/通知/新Circle連携はその時も別の運営判断。手順は [operator-runbook.md](operator-runbook.md) と [migration-and-rollback.md](migration-and-rollback.md)。

## 固定Previewの配信

2026-11-17、既存branch `codex/camellia-alpha-release-candidate` を0b85594→3057137へfast-forward。Vercel check success（03:20:48 UTC＝12:20:48 JST）。URLは従来と同じ：https://camellia-beta-git-codex-camellia-alpha-relea-161533-school-park.vercel.app/ 。新しいLINE callbackは追加していない。build成功と実メール/API受入は別で、本人から新メール/引継ぎの保存確認、Androidでの同じCheck復元、登録不要での両話し方の段階表示の成功報告を受領。ネットワーク受領書や使用token/請求は独立確認していない。Productionは未変更。

新しい本人受入は [owner-acceptance.json](evidence/owner-acceptance.json)。PostHogは固定Previewホスト＋event_schema=2の03:20:48〜07:24:58 UTCの技術照合では5イベントすべて0件で、着信済みとは報告しない。送信先・抑止設定と条件を調査中。

## 本人受入後の追加診断

機能source3057137の主要操作は本人報告PASS。30d09b7では送信の可否・DNT/opt-out・自動操作ブラウザ判定・標準送信先との一致・直近の計測状態・UTC時計だけを、明示URL `?diagnostics=analytics` のPreview内Myへ追加した。本番ではcompile-time無効、キー/本文/メール/IDを返さず設定も変更しない。計測送信そのものの挙動は変更していない。

PostHog594848のactive contextと既存標準tokenの一致を秘密値を表示せず照合した。新しいID/移行イベントは日付範囲を広げても未着信。host/計測版が不明なsession6件は、新Preview着信に数えない。実SDK→ローカル専用endpointの5幅試験はschema2/host/UUID/許可属性/受領を確認し、DNTでは送信0件。実プロジェクトへ合成イベントを送っていない。[PostHog照合](evidence/posthog-new-ingestion.json)・[実SDK合成試験](evidence/analytics-sdk-browser.json)。

同じ固定Previewの最新機能sourceは30d09b7、Vercel success 2026-11-17 08:05:50 UTC（17:05:50 JST）。新しいLINE callback、Production、Rules、claims、環境変数の変更なし。本人にF12なしの安全な確認結果のコピーを依頼中。

## CIで検出した予約競合の修正

30d09b7のローカル全試験はPASSだったが、GitHub run44043664151では日次枠34件同時試験がcode10 ABORTEDで失敗した。ログをGitHub接続で取得して原因を確認し、結果を合格に読み替えていない。80c2881では競合で予約できなければfalseを返し、AIへ送らず一時的な枠不足として扱う。権限エラー等は隠さない。

34同時という条件を維持して受入30以下を確認し、その後に単独で残枠を利用でき、計30件で次を拒否することを確認。最終ローカルrunは20件を同時受入・14件を一時拒否、その後30件まで残枠を受入、31件目拒否。新しい実行sourceで64unit/15emulator/lint/typecheck/buildを再実行してPASS。[証拠](evidence/quota-contention.json)。最新GitHub CIはPR headのCheckを確認する。
