# 正式リリース最終完成表（2026-11-20）

アプリ候補: `408073f6f1a7b23d80b63b9f2487eb93b12f2a05`。main/Productionは `fe7f85947a0799f9b4d4097e34c389839c3f7ec1` のまま。PR #84〜#99の全headと新規 #100〜#104（#104自身は候補head） を統合候補の祖先として取り込み、mainにはmergeしていない。security #91/#94は同内容コピーだけでなく実際のmerge祖先にした。

「前回報告」は歴史的な引き継ぎで、新候補の合格結果ではない。今回の実行は [test-evidence.md](test-evidence.md)、実環境と公開判定は [release-readiness.md](release-readiness.md)。外部契約/未決定/本人実操作をコードの合格で置き換えない。

## 全40項目

|ID|採用済み仕様|前回報告|今回のコードと検証範囲|残る条件/未完了|証拠（コード / 当該実行のテスト）|
|---|---|---|---|---|---|
|①|Today中心1件＋別候補|コード完了・Preview本人確認|中心1件・別候補・Check非強制を維持。登録不要の全導線を統合試験。|実ユーザーが感じる提案価値は未測定|[code](../../lib/today/flow.ts) / [test](../../tests/today-one-flow-cases.mjs)|
|②|自動提案＋本人調整|コード完了・ローカルPASS|本人の希望・時間の明示調整を維持。条件を勝手に緩めない。|実店舗の候補による受入待ち|[code](../../lib/place/conditions.ts) / [test](../../tests/quality-place-cases.mjs)|
|③|Plusの個別化・比較・Place|部分実装・提供保留|protected Plus比較を維持し、Stripe購入・承認不足停止と接続。|実店舗・Plus会話方針・実Stripe待ち|[code](../../lib/membership/conversation-policy.ts) / [test](../../tests/plus-conversation-policy-firestore.mjs)|
|④|提案＋任意の店舗特典|構造完了・実特典0|対象・条件・期限・提供確認済みだけの任意特典を維持。|実特典0。架空の特典を公開しない|[code](../../lib/place/model.ts) / [test](../../tests/quality-place-firestore.mjs)|
|⑤|初期無料実証|基盤完了・運用未開始|0円・特典任意・自動有料化なしを維持。店舗募集入口を追加。|実店舗との受入・合意待ち|[code](../../lib/place/service.ts) / [test](../../tests/quality-operator-firestore.mjs)|
|⑥|基本掲載無料・有料任意|基盤完了・有料保留|基本無料の申請→非公開審査→draft/自店scopeを接続。|申請受付OFF、店舗有料オプション開始なし|[code](../../lib/place/applications.ts) / [test](../../tests/place-intake-firestore.mjs)|
|⑦|女性の希望に合う場所・体験|コード完了・ローカルPASS|エリア・予算・時間・本人の希望による条件と理由を維持。|実在カタログ0で推薦価値は未実証|[code](../../lib/place/recommendation.ts) / [test](../../tests/quality-place-cases.mjs)|
|⑧|4分野を同等に展開|構造完了|4分野を同等に扱うカタログを維持。最新指示の初期掲載目標4店舗を反映。|実店舗0。4店舗の契約/許可/写真は運営準備。開発は停止しない。|[code](../../lib/place/model.ts) / [test](../../tests/place-cases.mjs)|
|⑨|登録前の価値体験|コード完了・Preview本人確認|登録不要の無料、メールID、LINE/Google互換を維持・再試験。|新sourceでの本人実ログイン受入待ち|[code](../../lib/free/handover.ts) / [test](../../tests/free-handover-cases.mjs)|
|⑩|Check→提案→Place/Discover→Action→Reflection|部分実装・実体験待ち|選択→私的体験→任意Reflection/Memoryを5幅で再操作。|実際の来店・体験確認ではない|[code](../../lib/place/experience.ts) / [test](../../tests/free-experience-browser.py)|
|⑪|店舗実在・許可・情報・履歴・停止|コード完了・実掲載待ち|申請/担当scope/私的証拠/審査/CAS/停止を保護。終了案件・許諾・監査のlifecycle削除を追加。|実在/掲載/写真許諾0。保持とscope終了レビュー、実店舗受入は未実施。|[code](../../lib/server/lifecycle-retention.ts) / [test](../../tests/lifecycle-retention-firestore.mjs)|
|⑫|Plus500円・店舗基本無料・原価と転換計測|部分実装・事業未準備|Sandbox/liveの台帳・権利・保持・売上を分離。Stripe500円/署名/正規照合/不変契約/無料保護/独立支払い管理/原価token枠を統合。closed_payment削除を接続。|実Stripe Sandbox/請求書/法的保持/販売条件の受入待ち。|[code](../../lib/billing/stripe.ts) / [test](../../tests/stripe-checkout-firestore.mjs)|
|⑬|正式リリース可否は運営判断|維持|main/Production/Rules/env/claims/各運用を変更せず、3判定を分離。|公開判断は運営。日付だけで自動公開しない|[code](../../docs/release-20261201/release-readiness.md) / [test](../../tests/deployment-budget-cases.mjs)|
|⑭-1|発見目的のToday・Check非強制|コード完了・Preview本人確認|Checkなし選択・保存・復旧・無料体験を現在sourceで再試験。|実端末の受入待ち|[code](../../lib/reflection/engine.ts) / [test](../../tests/free-id-recovery-browser.py)|
|⑭-2|CircleのPlaceを手動選択|コード完了・新連携OFF|既存の本人手動Place紐付け・原文非混入・停止時非表示を再試験。|新連携OFF。新sourceの実2アカウント受入待ち|[code](../../lib/circle/service.ts) / [test](../../tests/quality-circle-place-firestore.mjs)|
|⑭-3|店舗投稿はPlaceのイベント・体験のみ|基盤完了・実運用未開始|自店イベント限定を維持し、申請からのscope付与/解除を接続。|実店舗担当者の受入待ち。consumer権利を付けない|[code](../../lib/place/operator.ts) / [test](../../tests/quality-operator-firestore.mjs)|
|⑭-4|Circle新着＋本人が選んだToday希望|コード完了・新連携OFF|新着と本人希望による表示を維持。秘密のCheckは自動照合しない。|新連携の実受入待ち|[code](../../lib/circle/service.ts) / [test](../../tests/quality-circle-place-firestore.mjs)|
|⑭-5|本人が選ぶ通知種別・頻度・停止|設定完了・配信未提供|明示許可・標準Web Push・固定本文・停止・不明結果の重複抑止を実装。|実OS配信未検証。設定・配信はOFF|[code](../../lib/notifications/push.ts) / [test](../../tests/web-push-firestore.mjs)|
|⑭-6|体験価値・D7/D30・Circle→Place・感想|計測コード・定義追加／実測待ち|行動/価値/継続・Circle→Placeに加え、紹介/装飾の秘密を含まないeventを接続。SDKと配送境界を試験。|PostHog connector応答なし。実着信/集計/人数/継続率未確認。|[code](../../lib/analytics/posthog.ts) / [test](../../tests/referral-analytics-cases.mjs)|
|⑮-1|明示共有・非公開原本保護・匿名の閲覧ページ|既存プレビュー維持・内部境界強化|選択/プレビュー/発行/第三者閲覧/履歴/取消/期限/削除をHTTP接続。|ローカル合成受入。本番発行OFF|[code](../../lib/partner/service.ts) / [test](../../tests/share-runtime-firestore.mjs)|
|⑮-2|新規登録完了で7日体験／紹介者月3件|内部基盤完了・未接続|新規ID→7日体験/月3装飾の既存接続に、本人history/revokeと成立イベントのstable insert IDを追加。|予算/専用枠/期間等が未設定で新規受付OFF。実紹介の受入未実施。|[code](../../lib/referral/service.ts) / [test](../../tests/referral-history-firestore.mjs)|
|⑮-3|任意装飾・永久保有・競争なし|基盤完了・デザイン未決定|永久選択/装着に100件ページング、後続ページの選択と装着表示を追加。|3点のデザイン案は未承認。権利自体は削除対象外。|[code](../../lib/referral/decorations.ts) / [test](../../tests/referral-history-firestore.mjs)|
|⑮-4|7日終了・自動課金なし・1人1回・AI上限|基盤完了・実AI未接続|7日期限/no auto billing/重複/原価枠を維持。精算→予約/HMAC→grant→期限切れmirrorの順序削除を追加。|同一人照合期間/他体験重複/期間は運営承認待ち。HMAC削除後の永久照合を保証しない。|[code](../../lib/referral/ai-runtime.ts) / [test](../../tests/trial-token-firestore.mjs)|
|⑮-5|自己紹介・重複・大量登録の抑止|部分実装|確認メールHMAC、LINE/Google既存照合、旧ID拒否・冪等proofを追加。|本人確認しても物理的な一人を永久に保証するものではない|[code](../../lib/referral/identity.ts) / [test](../../tests/referral-id-firestore.mjs)|
|⑮-6|月予算・AI枠・異常増加・緊急停止|基盤完了・数値未決定|予約/実usage見積/unknown保留/未使用返却と終了レビューを接続。inactive lease/不明usageは保全。|予算等未承認。見積を請求額と呼ばず、実請求・監視受入待ち。|[code](../../lib/server/ai-observation.ts) / [test](../../tests/completion-ai-firestore.mjs)|
|⑮-7|正式リリース後のみ紹介開始|停止維持|12/1対象方針を維持。正式受入・設定不足なら受付できない。|日付だけでキャンペーンを開始しない|[code](../../lib/referral/readiness.ts) / [test](../../tests/referral-id-firestore.mjs)|
|⑮-8|数値基準・超過時・重複規則・期間は保留|未決定を保留・安全に拒否|数値は設定式・未設定停止。月3件超過後の新規側はgrantに統一。|予算/AI枠/終了日/重複/最終装飾等は運営判断|[code](../../lib/referral/config.ts) / [test](../../tests/quality-referral-firestore.mjs)|
|⑯-1|希望に合う場所・体験を伝える|コード完了・実掲載待ち|希望に合う場所・体験という価値を維持し、募集/申請入口を追加。|実店舗受入待ち|[code](../../public/place-partners.html) / [test](../../tests/browser/place-intake.py)|
|⑯-2|異なるジャンルを少数ずつ|構造完了・確認済み実店舗0|少数・異分野を扱うカタログ構造を維持。デモ3件を明記。|確認済み実店舗0を実績として扱わない|[code](../../data/place-demo.ts) / [test](../../tests/place-cases.mjs)|
|⑯-3|認知・予約・再発見、成果保証しない|部分実装|閲覧/公式/予約/地図/問い合わせのクリックと来店を区別。|予約成立/来店/購入の実績値なし|[code](../../lib/place/metrics.ts) / [test](../../tests/quality-operator-firestore.mjs)|
|⑯-4|基本情報＋体験必須・限定企画任意|コード完了・審査で必須|基本情報・体験紹介・4審査証跡、任意特典を維持。連絡先は非公開。|実在・許諾・営業時間等の運営確認待ち|[code](../../lib/place/applications.ts) / [test](../../tests/place-intake-firestore.mjs)|
|⑯-5|既存地図・予約・問合せが基本|コード完了|既存外部導線とURL安全性、問い合わせ等のエラー表示を維持。|実店舗の実リンクと画像配信受入待ち|[code](../../lib/place/details.ts) / [test](../../tests/place-cases.mjs)|
|⑯-6|オンライン集計＋希望店舗の来店確認|オンライン基盤完了・来店未提供|自店だけの集計・重複排除・クリック種別を再試験。|来店確認の方式は未承認。架空の実績を作らない|[code](../../lib/place/metrics.ts) / [test](../../tests/quality-operator-firestore.mjs)|
|⑯-7|基本無料、任意有料を段階導入|基本無料を維持・有料未提供|無料の掲載相談/審査/自店担当を接続。有料店舗契約を作らない。|任意有料の金額・営業開始は運営判断|[code](../../lib/place/applications.ts) / [test](../../tests/place-intake-firestore.mjs)|
|⑯-8|条件を厳密に絞り希望で推薦・理由|コード完了|厳密な条件/本人希望/理由/無料事実比較とprotected個別比較を維持。|実在カタログでの受入待ち|[code](../../lib/place/conditions.ts) / [test](../../tests/quality-place-cases.mjs)|
|⑯-9|任意のMemory・Reflection・Circle連携|コード完了・ローカルPASS|任意Reflection/Memory、別欄の公開Circle、自動原文共有なしを再試験。|新sourceの実環境同期・新連携受入待ち|[code](../../lib/place/experience.ts) / [test](../../tests/completion-sync-firestore.mjs)|
|⑯-10|完成目標・営業方法・件数・有料額・来店方式|未決定を保留|12/1正式対象と初期目標4店舗を維持。営業→申請→審査→公開→停止の手順を用意。|実4店舗/許諾/任意有料額/来店確認方式は運営準備・判断。|[code](../../docs/release-20261201/place-intake.md) / [test](../../tests/place-intake-firestore.mjs)|
|保護|既存データ／Auth／Fortune／Tree／会話／Circle|ローカル境界PASS・実運用未確認|v3/v4・CAS・tombstone・legacy会話・ID隔離を全試験。無料日30回を登録IDにも適用。|共有Auth自体の削除は個人記録削除と別。実環境の再受入待ち|[code](../../lib/schoolpark/sync.ts) / [test](../../tests/completion-sync-firestore.mjs)|
|安全|認証と認可、他人のデータ、店舗境界、共有|ローカル境界PASS・本番設定未変更|新lifecycle全固定collectionとconfigへのclient read/write拒否、digest/依存版/hold/pause/支払い保護を追加。|実行依存中18/低5、全体中28/低8の監査残存。外部運用の受入/承認待ち。|[code](../../lib/server/lifecycle-retention.ts) / [test](../../tests/lifecycle-retention-boundaries.mjs)|
|UX|スマホ・読込・空状態・アクセシビリティ・低速|5幅PASS・実機一部未確認|5幅の無料/ID復旧/会話両方向切替/公開前UIを再検証。入口を1つの固定Previewで維持。|実iPhone/Android OSキーボード/VoiceOver/TalkBack・回線/画像の実配信は未検証|[code](../../components/ReferralPreparation.tsx) / [test](../../tests/run-final-release-browser.py)|

各testの今回の実行結果は evidence/final-execution-checks.json と final-execution-browser/summary.json。実機/実決済/実配信は未検証として残す。

## 今回の改修前後

- 削除: expiresAt付きの一部台帳のみ→紹介/Circle/店舗/支払い/原価/購読/審査/holdの固定lifecycle、版付き終了レビュー、dry-run/digest、関連記録保護、緊急停止、監査付き再実行。期間・法的義務・本番ジョブは承認待ち。
- 紹介: 発行中心→本人の履歴と取消、受付停止/個人記録削除後も取消可能、Auth世代と他IDを拒否。付与済み特典を取消で消さない。
- 永久装飾: 先頭100件中心→続きを確認でき、後続ページの装飾も選択・装着・表示できる。
- 計測: 紹介の成立が未接続→server granted=trueだけを、token/UID/送り先なしの同じrandom insert IDで計測。別IDへの切替後は計測しない。
- 統合: security変更がコピーのみ→全16 PR headが祖先であることを検査。Stripe/Web Pushの実行依存を保ってlock競合を解決。

## 機能別の範囲

無料基本/Today/Check/今日の一枚/会話/Discover/Tree/Memory/Action/Reflection/ID/同期/削除、共有、紹介、Circle、通知、Place、Plusのコードは既存実装を維持し追加試験する。共有・紹介・通知・新店舗受付・新規課金・新Circle連携は未承認ならOFF。個人記録を消しても支払い管理と永久権利を失わせない。

共有Auth ID自体やSchoolPark等の他サービスの記録を一括削除する機能は提供していない。Camelliaの個人記録削除と別に、本人確認・運営の対象範囲判断が必要。PostHog既送信person/events、Stripe側の法定保存/顧客整理も別の事業者操作。これらをローカル削除済みとは報告しない。

未完成/未接続/未検証/未決定の最終区分は [final-execution-report.md](final-execution-report.md)。実店舗0、Stripe実接続受入0、実OS Push0、PostHog実着信未確認。12/1のGo判定はこれらと運営承認が揃うまでNo-Go。

Stripeのmode分離は [stripe-mode-isolation.md](stripe-mode-isolation.md)。テスト成功を本番契約/売上と呼ばず、本番はテスト権利を読まない。
