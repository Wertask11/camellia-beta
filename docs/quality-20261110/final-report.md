# Camellia 統合品質改善・正式リリース準備：最終監査

2026-11-10 日本時間。**総合判定：正式リリースは NOT READY。** 実装できる改修と停止中の機能基盤を分割実装し、ローカル検証と固定Previewでの本人確認を行った。本番は変更していない。未決定事項、未接続部分、実運用で未確認のものを含めて「全部完成」とはしない。

## A. 実装状況

[40件の全対応表](completion-matrix.md)に、決定内容・改修前・改善・改修後・変更ファイル・検証・残課題をすべて記載。[Phase 0監査](audit.md)は改修前の証拠として保持。[機械可読の対応表](completion-matrix.json)も同内容。

- Today：中心1件と別候補、希望と時間による調整、Checkをしない選択・保存を追加。架空Checkを作らず、既存Checkの保存も維持。
- Place：利用条件を厳密に扱い、事実比較・任意の個別化・体験紹介・期限付き任意特典を整備。比較後の条件変更では選択をリセット。条件欄を折りたたみ、スマホで候補が押し流されるのを軽減。
- 掲載：実在・掲載許可・写真許可・内容の別審査、変更前後の履歴、再審査、停止。担当店舗だけ管理でき、公開は運営のみ。
- Circle：公開Placeへの手動リンクと自店イベントの基盤。既存の新着・参加・投稿・コメント・リアクション・通報・ブロック・運営対応を保持。新しい連携は別flagでOFF。
- My：選択から任意の私的Reflection、明示Memoryへ。Circleは別欄へ本人が書く文章のみ。自己申告を検証済み来店と表示しない。
- 店舗集計：公開カタログの詳細・公式・予約・地図・問い合わせ操作を日別に重複防止して集計。店舗へ自店集計のみ。クリックを来店や予約成立と扱わない。
- 通知：本人の希望・種類・頻度・停止を保存。汎用的なロック画面表示例のみで、許可要求・配信はない。
- 共有：引き続きプレビューのみ。取消・期限・owner削除／再作成時の失効・本文scrubを検証。
- 紹介：7日trial、月3件の永久装飾選択権、protected identity照合、予算・専用AI枠・冪等性・対象取消の内部基盤。公開APIはstatusだけでPOST停止。signup・実AIへの接続、実装飾UIは未提供。

公開名はCamelliaを維持。LINE/Google認証、YURA/Lactone、既存会話・Memory・Action・Safety、Firestore共有rate limitを維持。決済受付、実在掲載の捏造、紹介開始、通知配信、Rules deploy、claim/scope付与はしていない。

### FreeとPlus

FreeはToday/Check、基本推薦、会話、Discover、既存Circle、My、掲載事実の比較を維持。Plusの中心を本人が許可した個別化・Place比較・任意店舗特典として案内する。500円の決済契約は未準備でcheckoutは未提供。共有はプレビューだけで、有料加入・支払い成功を仮装しない。実特典0件、確認済み実在Place0件。既存デモ3件は実在店舗と明確に区別する。

## B. 品質評価（各100点）

実装・ローカル試験・本人確認・運用準備を含む今回の評価。公的な安全性認証や実ユーザーの満足度測定ではない。未検証・未提供部分を減点する。

|領域|点|根拠と不足|
|---|---:|---|
|Today|82|中心提案・条件調整・Check非強制が5幅と本人の保存確認で成立。実生活での提案価値は未測定。|
|Recommendation|76|硬い条件、不明情報、代替候補、本人同意を検証。実店舗カタログと継続評価なし。|
|Plus|45|protected判定・説明・事実と個別化比較を分離。決済、実店舗特典、原価接続が未準備。|
|Place|58|審査・条件・比較・scope・集計を検証。実在掲載と予約・来店実証が0。|
|Circle|78|既存機能とmoderationの回帰、Placeリンク・店舗境界をemulatorで検証。新連携の実運用・新2端末テストは未実施。|
|Memory / Reflection|78|本人明示保存、原文非公開、v4保存保護と復元。実端末間のv4同期・実削除は未確認。|
|共有・紹介|40|内部境界、冪等性、予算・専用枠を検証。送信・紹介受付・装飾UI・原価接続は未提供。|
|プライバシー|72|私的原文の分析／店舗送信を拒否、共有プレビュー維持。新台帳の保持削除方針、実環境のGemini利用条件の確定が残る。|
|セキュリティ|77|protected権限、他店拒否、同時処理、旧データ保護を検証。実環境Rules・役割・監視の新運用受入は未確認。|
|スマートフォンUX|80|375/390/412/768/1280、低速・CPU遅延、focus/Escape、低いviewportで操作確認。実OSキーボード・iOS/Samsung実機・手動screen readerは未実施。|

## C. テスト結果

|区分|結果|範囲と限界|
|---|---|---|
|lint|PASS|`npm run lint`。|
|typecheck|PASS|`npm run typecheck`。|
|unit/回帰|54/54 suites PASS|改修前48→各段階49/50/51/52/53→最終54。既存の会話・モデル・Safety・Auth・Sync・Delete・Fortune・Tree・analyticsを含む。|
|build|PASS|`npm run build`。index setupはskippedで、本番インデックスを変更していない。大きいchunkの警告は残る。|
|統合|PASS（ローカル）|`npm run test:firestore`の7 entry suite。既存Circle、Check-first、共有、Place審査、Circle連携、店舗境界、紹介。最後の取消済trial再送ガードは専用emulatorでも再実行PASS。|
|E2E|PASS（Chromium・合成Auth/HTTP）|5幅でCheckあり／なしの選択・保存、Place条件と比較、私的Reflection→任意Memory→別欄Circle→Place、通知設定、紹介停止表示、共有エラー復帰。|
|会話|PASS（合成provider）|Library検索・ページング・legacy、YURA3turn→Lactone3turn→逆切替、reload、focus、Escape、520px viewport。実Gemini成功とはしない。|
|Safety|PASS|両styleで自傷・診断要求・薬中止・暴力・虐待・緊急症状。guestも2×6境界で共通応答・provider送信なし。|
|認証・権限|ローカルPASS＋本人確認|担当外店舗・無断公開・偽装役割・private台帳書込を拒否。本人は固定Previewで、Checkなしに選んだ行動の保存と過去記録を確認できたと回答。providerは未特定なのでLINEとGoogle両方を実操作したとはしない。|
|Privacy/分析|ローカルPASS|実PostHog SDKの通信を横取りし、本文・名前・Check・Memory等の混入を検証。503→再読込→再送、DNT、block、壊れた保存、容量不足。新イベントを本番へ送っていない。|
|rate/quota|ローカルPASS|既存共有rate limit、別枠の公開Place操作、紹介予算・AI枠の同時処理を検証。trial専用枠の実Gemini連携は未提供。|
|データ保護|ローカルPASS|既存v3読取、lazy v4、exact pre-v4 backup、backup容量不足時の書込停止、旧reader拒否、archive往復、既存CAS・account conflict・Delete回帰。|
|低速・viewport|5幅PASS|150ms、下り200kB/s、上り75kB/s、CPU4倍遅延。native dialogとfocus、入力欄がnavの上に収まること。実回線性能／実OS keyboardの保証ではない。|
|実運用|一部未検証|実店舗・契約なし。新しいv4記録の実端末間同期／削除、新連携2アカウント、実通知・紹介・支払い・新イベント着信、D7/D30実測、実Gemini原価は未確認。|

[証拠ファイル](evidence/)と[計測の詳細](analytics.md)を参照。ローカルの合成アカウント・店舗・providerを実在利用者や本番成果として扱わない。

### Performance

main91e95baを別のdetached worktreeで、同じ依存関係・同じ既定OFF設定でbuildして比較した。全client JSのgzip合計をbundle-size.jsonへ記録。これは初期request graphや実モバイルの読み込み時間ではない。Place画像はlazy、Circle/会話の既存paginationを保持。大きなpage chunk、管理項目・SDKの遅延分割、実画像配信の性能測定はP2として残す。

## D. コード・PR・公開状況

|段階|branch|commit|PR|
|---|---|---|---|
|監査・Today/選択保存|`feat/camellia-quality-foundation-20261110`|e6242a6 / e1d2c55|[#62](https://github.com/Wertask11/camellia-beta/pull/62)|
|Place品質|`feat/camellia-place-quality-20261110`|8f633e8|[#63](https://github.com/Wertask11/camellia-beta/pull/63)|
|Circle・私的体験|`feat/camellia-experience-circle-20261110`|114bb55 / c44c613|[#64](https://github.com/Wertask11/camellia-beta/pull/64)|
|店舗・集計・通知設定|`feat/camellia-operator-quality-20261110`|d59c2b4|[#65](https://github.com/Wertask11/camellia-beta/pull/65)|
|停止中の紹介基盤|`feat/camellia-referral-quality-20261110`|aa66fb3|[#66](https://github.com/Wertask11/camellia-beta/pull/66)|
|総合検証・画面修正|`test/camellia-quality-release-audit-20261110`|このPRのコードcommitを参照|最終PR（作成後に追記）|

変更ファイルの全件は各PRとGit diffで確認できる。全件リストはchanged-files.md。各段階のunit・emulator・画面検証を分離し、巨大な単一PRへまとめない。

固定Previewは以前からのURL1つだけ：
https://camellia-beta-git-codex-camellia-alpha-relea-161533-school-park.vercel.app/

同じbranch aliasをfast-forward更新し、LINEのcallback設定を増やしていない。aa66fb3のVercel成功と、本人の選択保存・過去記録確認を得た。最終画面修正後のReadyも別途記録する。実行環境から固定PreviewへのHTTPは許可先制限でCONNECT403となるため、そこからのブラウザ確認を実施済みとはしない。ローカル実ブラウザ・Vercelの結果・本人の回答を分けている。

### Production

mainは91e95bac4237f5349d6c35e7a0ae7b24087dd5d3のまま。Productionの公開statusのみ読み、root200・同じindex-DfJLd4me.js、chat enabled／dataPolicy unknown／rate limit firestore、membership Free／checkout false、Place503 PLACE_UNAVAILABLE、未認証Circle401 LOGIN_REQUIREDを確認。これらは本番改修の利用成功を示さない。

**今回の改修はmainへ未merge・Production未反映。** 本人の今回指示「本番公開、料金徴収開始、紹介キャンペーン開始、ユーザーへの通知配信など、運営上の開始判断は開発完了とは分離する」に従う。

### フラグ・運用

- 既存Circle／Gemini／招待の本番設定は変更していない。
- 新Circle→Place連携：frontend/serverの既定OFF。
- Place：Production公開statusでは未提供。デモは実在店舗ではない。
- 決済・共有：checkout false／COMMERCE_PREVIEW_ONLY true。作成・公開読取停止。
- 紹介：REFERRAL_INTEGRATION_READY false、statusのみ。環境変数の変更だけでも起動しない。
- 通知：NOTIFICATION_DELIVERY_READY false。配信処理なし。
- Rules deploy、claim/scope付与、秘密値変更なし。expiresAtだけでTTLが動くとは扱わない。

### 反映とrollback

本人の承認後、#62から順に前段をmainへmergeしたら次PRのbaseをmainへ変更し、差分・CIを確認して進める。新公開機能・課金・共有送信・紹介・通知は停止したままコードを反映する案と、運用開始の承認を分ける。既存Circle等の本番設定を不用意にOFFにしない。

v3データは一括migrationしない。私的Place体験の初回保存時だけv4へ進め、元v3を先に保存する。v4作成後は**v4 readerと保存保護を残し、画面だけ戻す**。v4対応前のbuildへ丸ごと戻すと、旧readerは未知形式を拒否してread-only recoveryとなる。原本とpre-v4控えをexportし、v4対応buildへ戻す。新記録を読み捨てて同期する旧版へ戻さない。

## E. 残課題と依存関係

**P0：確認範囲で未解決の重大欠陥は見つかっていない。** 実運用未検証を含め「全体P0=0保証」とはしない。保存消失・権限逸脱が見つかったら公開を止め、原本と控えを保持して優先修正する。

**P1：正式版の中心体験・提供に必要。**

1. 実在・掲載許可・写真許可のある店舗を準備し、審査→公開→既存予約導線→任意Reflectionを実環境で確認。架空の店舗で代用しない。必要件数を勝手に決めない。
2. v4記録の実端末間同期・account conflict・export・削除、新Circle連携の2アカウント受入。旧機能の過去の成功だけで新差分をPASSにしない。
3. Plus/紹介を提供する前に実原価のランタイム接続・thinking/失敗課金を含む請求照合・専用AI枠・停止処理を実証。Free基本会話を新枠で遮断しない。
4. Plus有料／共有送信を提供する前に決済契約と本人の公開承認。決済未準備なので今は受付しない。

**P2：運用・品質。**

- 紹介の月予算、trial AI枠、開始数値、期間、装飾catalog、月3件超過時、重複規則を本人が決める。そこからsignup・実AI・装飾UIを接続し、正式公開後の紹介開始を別承認する。
- 店舗担当の導入／本人確認・担当scope、台帳の保持削除・TTL／承認済み定期削除、異常登録・原価の運営監視。まだ役割も新データも本番へ付与しない。
- Gemini実利用条件と現在unknownの公開statusを照合。Privacyの無料枠説明を弱めない。紹介identity hashの保持／削除方針を決めてから運用開始。
- PostHog新着信・保存insight・D7/D30の登録済み利用者コホートとJST境界を確認。現行UTCとLinux除外filterを断定的な事業指標へ使わない。
- 実端末iOS/Samsung、実OSkeyboard、screen reader、画像配信・初期bundleの計測と分割。
- 来店確認方式・店舗有料額・営業方法は未決定。オンラインクリックを代用しない。

**P3：任意の発展。** 実ユーザーの体験価値の回答から理由・比較・再発見を改善。通知は価値と頻度を確認し、本人同意と別承認後に配信を設計する。滞在時間や通知開封数だけを成功にしない。

詳細：[店舗運用](operator-workflow.md)／[共有・紹介](referral-workflow.md)／[計測](analytics.md)／[工程記録](progress.md)／[全対応表](completion-matrix.md)。
