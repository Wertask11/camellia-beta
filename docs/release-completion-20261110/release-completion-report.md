# 正式リリース完成監査・全40項目（2026-11-11 UTC）

**総合：NOT READY。コードの自動試験と、実環境・運営受入は別判定。**

今回の差分は #68〜#73。元#62〜#67も2026-11-16に各headで全30チェックを独立再実行し合格。既存 #62〜#67 は独立PRのまま継承し、mainへ未統合。本番公開・料金徴収・共有送信・紹介受付・通知配信・Rules・claims・環境変数は変更していない。実店舗・決済は本人回答で未準備。Android Chromeと専用テストアカウントは本人が用意済みで、双方向同期・再ログイン・export/復元・削除/復活防止の本人確認結果を受領した（owner-acceptance.json）。

改修前は `docs/quality-20261110/completion-matrix.md` の原文を引き継ぐ。以前のPASSを最新HEADのPASSに転記しない。今回のPASSは [test-evidence.md](test-evidence.md) の範囲だけ。

## 40項目の対応表

|採用事項|改修前|前回段階|今回の改修後|今回の証拠・範囲|残り/判定制限|
|---|---|---|---|---|---|
|① Today中心1件＋別候補|部分実装|コード完了・Preview本人確認|中心1件・理由・別候補・Checkなしを維持|①② local unit / quality-browser / slow|実利用の提案価値は未測定|
|② 自動提案＋本人調整|部分実装|コード完了・ローカルPASS|本人調整・条件の厳密適用を維持|journey / place cases、5幅|提案価値・実在カタログの受入待ち|
|③ Plusの個別化・比較・Place|部分実装|部分実装・提供保留|Free事実比較とPlus境界を維持。決済イベントの検証済み内部境界追加|commerce / completion-billing / place|実processor・課金・店舗・ライブ個別化未接続|
|④ 提案＋任意の店舗特典|部分実装|構造完了・実特典0|任意特典の対象・期間・確認済み条件を維持|quality-place-cases|実特典未準備|
|⑤ 初期無料実証|部分実装|基盤完了・運用未開始|0円・自動有料化なしの同意を管理画面に接続|operator browser / emulator|実店舗の同意・受入なし|
|⑥ 基本掲載無料・有料任意|部分実装|基盤完了・有料保留|基本無料と任意有料を分離。未準備の有料受付を拒否|operator / billing|任意有料の価値・金額は運営決定待ち|
|⑦ 女性の希望に合う場所・体験|部分実装|コード完了・ローカルPASS|希望・エリア・硬い条件を維持。写真遅延読込と空状態を回帰確認|place browser / slow|実掲載なし|
|⑧ 4分野を同等に展開|部分実装|構造完了|4分野を同等に扱い、デモを実在と表現しない|place cases / browser|実店舗受入後の分野別構成|
|⑨ 登録前の価値体験|部分実装|コード完了・Preview本人確認|登録前の選択・保存、既存LINE/Google callbackを維持|journey / auth / browser|LINE/Androidの保存・復元は本人確認済み。実Googleと初回新規導線の全受入は未検証|
|⑩ Check→提案→Place/Discover→Action→Reflection|部分実装|部分実装・実体験待ち|選択→My→本人Reflection→任意Memory、v4追加復元と削除を接続|experience / completion-data / sync|現実の体験と実端末同期の受入待ち|
|⑪ 店舗実在・許可・情報・履歴・停止|部分実装|コード完了・実掲載待ち|専用店舗入口・編集CAS・審査・停止・証跡非公開・scope CLI追加|completion-operator / operations emulator|実店舗・担当者設定・実証跡なし|
|⑫ Plus500円・店舗基本無料・原価と転換計測|部分実装|部分実装・事業未準備|500円境界、usage実SDKラッパー、見積/請求分離、保護Webhook内部基盤|completion-ai / billing emulator|実Gemini token・公式単価承認・実請求・processor未照合|
|⑬ 正式リリース可否は運営判断|完了|維持|開発/本番技術/正式リリースの3判定。公開・徴収等は未開始|readiness / 公開status読取|統合・本番反映・Rules等は具体的承認後|
|⑭-1 発見目的のToday・Check非強制|不具合|コード完了・Preview本人確認|無Check選択・保存の原則と架空Check不生成を維持|journey / quality-browser|実機最新コード受入待ち|
|⑭-2 CircleのPlaceを手動選択|未実装|コード完了・新連携OFF|本人が公開Placeを手動紐付け。削除/停止で私的原文を露出しない|quality-circle-place-firestore / experience-browser|新連携OFF。既存Circle2実accountの相互操作は本人確認済み。新Place手動紐付けはOFF|
|⑭-3 店舗投稿はPlaceのイベント・体験のみ|未実装|基盤完了・実運用未開始|専用店舗ログインと自店scope、他店偽装拒否、公開権限なし|completion-operator / quality-operator-firestore|実担当者でscope登録・解除受入待ち|
|⑭-4 Circle新着＋本人が選んだToday希望|部分実装|コード完了・新連携OFF|新着順と本人希望を維持。非公開Checkは照合しない|experience-browser / circle-place emulator|新連携OFF|
|⑭-5 本人が選ぶ通知種別・頻度・停止|未実装|設定完了・配信未提供|設定の明示保存・revision、停止時登録先削除、内部dispatcherの再確認/冪等/頻度/不明保留|completion-activation-firestore / notification browser|配信方式・driver・端末許可・実配信未接続、OFF|
|⑭-6 体験価値・D7/D30・Circle→Place・感想|部分実装|計測コード・定義追加／実測待ち|本番の実イベントを読み取り照合。session_startに経路UUIDの欠落を修正|analytics pipeline / delivery / ingestion.json|新HEADの実着信・D7/D30実測・承認KPIは未確認|
|⑮-1 明示共有・非公開原本保護・匿名の閲覧ページ|部分実装|既存プレビュー維持・内部境界強化|本人選択のpreviewのみ。削除前の共有取消失敗で原本保護|commerce / sync / referral-browser|共有発行/送信/公開読取OFF、決済準備後|
|⑮-2 新規登録完了で7日体験／紹介者月3件|未実装|内部基盤完了・未接続|LINE/Googleのserver identity・登録時刻・intentを初回同期後に接続|completion-activation-firestore|受付OFF。実新規登録・決定済み運用設定なし|
|⑮-3 任意装飾・永久保有・競争なし|未決定・要確認|基盤完了・デザイン未決定|取得済み権利→承認catalog→一度選択→Tree装着/解除/再表示を接続|activation emulator / completion-tree-browser|最終デザイン未決定、未承認asset不採用|
|⑮-4 7日終了・自動課金なし・1人1回・AI上限|未実装|基盤完了・実AI未接続|7日期限・自動課金なし・一度限り維持。明示専用laneを実generatorへ接続|completion-ai / activation emulator|trial AI数値・価格承認・公開判断待ち。Freeは既存lane|
|⑮-5 自己紹介・重複・大量登録の抑止|未実装|部分実装|検証済identity・登録epoch・UIDへのintent固定、同時完了の冪等性|referral / activation emulator|未連携LINE/Googleを同一人物と断定しない。実不正運用未検証|
|⑮-6 月予算・AI枠・異常増加・緊急停止|未決定・要確認|基盤完了・数値未決定|countTokens→専用予算予約→未dispatch返却/dispatch後不明保持→停止再確認|completion-ai / referral emulator|金額・専用枠・監視閾値・実請求未決定/未照合|
|⑮-7 正式リリース後のみ紹介開始|完了|停止維持|公開受付の停止を維持。本人・運営承認なく開始しない|referral cases / API|正式公開後の運営開始判断|
|⑮-8 数値基準・超過時・重複規則・期間は保留|未決定・要確認|未決定を保留・安全に拒否|必要設定なしで停止。上限後/重複/期間等の値を捏造しない|referral cases / firestore|未決定事項はexternal-dependencies参照|
|⑯-1 希望に合う場所・体験を伝える|部分実装|コード完了・実掲載待ち|体験内容と登録事実を区別、掲載管理の実画面を追加|place / completion-operator browser|実在店舗の公開実績なし|
|⑯-2 異なるジャンルを少数ずつ|部分実装|構造完了・実店舗0|既存3デモと4分野の構造維持。店舗数を作らない|place browser|実在掲載/分野別営業待ち|
|⑯-3 認知・予約・再発見、成果保証しない|部分実装|部分実装|発見・既存予約・My再発見と任意の自己申告を維持|experience browser / emulator|来店・再来店・購入の実績は未測定|
|⑯-4 基本情報＋体験必須・限定企画任意|部分実装|コード完了・審査で必須|基本情報/体験必須、任意特典、運営証跡の公開前確認|place emulator / operator browser|実店舗審査・許可待ち|
|⑯-5 既存地図・予約・問合せが基本|部分実装|コード完了|公式・予約・地図・問合せを維持、管理previewを成果計測しない|place cases / operator browser|実店舗リンク/実ネットワーク受入待ち|
|⑯-6 オンライン集計＋希望店舗の来店確認|部分実装|オンライン基盤完了・来店未提供|自店だけの集計、同一イベントの重複拒否、承認後の実削除job追加|metrics / operations emulator|来店方式/保持期間/本番cleanup未決定・未開始|
|⑯-7 基本無料、任意有料を段階導入|部分実装|基本無料を維持・有料未提供|無料掲載同意を管理入口へ接続。有料任意受付は停止|operator browser / emulator|有料内容・価格未決定|
|⑯-8 条件を厳密に絞り希望で推薦・理由|不具合|コード完了|硬い条件の厳密適用、未知情報除外、非自動緩和、比較解除を再検証|place cases / 5幅|実在データでの受入なし|
|⑯-9 任意のMemory・Reflection・Circle連携|未実装|コード完了・ローカルPASS|私的Reflection・任意Memory・別欄Circle、export/追加復元/tombstone保護|completion-data browser / sync emulator|本人確認：双方向同期/再ログイン/復元/削除PASS。実同時競合は未検証|
|⑯-10 完成目標・営業方法・件数・有料額・来店方式|未決定・要確認|未決定を保留|件数・営業・任意有料・来店方式を補完せず保留|operator-runbook / external-dependencies|本人・店舗・契約準備待ち|
|保護 既存データ／Auth／Fortune／Tree／会話／Circle|部分実装|ローカル境界PASS・実運用未確認|v3原本backup、v4CAS/削除lock、原本保護、旧端末の復活防止、復元/通知停止|sync / all13 emulator / all59 unit|本人確認：v4双方向同期/再ログイン/削除PASS。実同時競合/認証方式別/全面閉鎖/本番Rules適用は別判定|
|安全 認証と認可、他人のデータ、店舗境界、共有|部分実装|ローカル境界PASS・本番設定未変更|認証UID・scope・他店/他人拒否、支払署名境界、台帳/装飾server保護|全13 emulator / 59 unit|実権限配置・監視・保持運用は未設定|
|UX スマホ・読込・空状態・アクセシビリティ・低速|部分実装|5幅PASS・実機一部未確認|9画面シナリオ＋会話を各5幅再実行。低速・focus/keyboard/dialog/overflowを確認|50 viewportシナリオ。証拠はtest-evidence|Androidの同期/復元/削除/LINE/会話表示は本人確認済み。iOS/Samsung/OSkeyboard/VoiceOver/TalkBackは未検証|

## 機能別の差分

- データ保護：Myの不足記録だけを加えるファイル復元、復元前原本backup、別tab/別account停止。v4同期CAS、削除lock、root消失時の自動再送停止。共有取消・通知停止に失敗したら個人記録削除を止める。削除はAuthアカウントや契約の解約ではない。
- 店舗：女性向け個人profile/storeを起動しない独立入口、既存LINE/Google callback、担当scope、編集revision、下書き/審査/運営承認/停止。実店舗と証跡は未準備。
- AI：実Gemini SDKのJSON/stream usage取得、thinking/cache分離、試行/失敗/中断観測、送信receipt、専用trial枠の予約/返却/保留。実Gemini・原価請求書の一致は未検証。
- 紹介/装飾：新規登録時刻・identity検証、初回正常sync後の冪等完了hook、永久選択権のTree UI。catalog/数値/期間未決定で受付停止。
- 通知：明示サーバー保存とrevision、本人停止、汎用payload、頻度と重複拒否、送信直前停止再確認、不明結果保留。実driver・配信方式未選定。
- Plus：500円/月の検証済みイベント内部境界、invoice冪等、更新/取消/期限/全額返金順不同/部分返金保留、既存権利保護。実processor/checkout未接続、常時停止。
- 分析：既存PostHog実着信の読み取り、session_startの安全な経路UUIDを補完。本文を送らず、実支払以外でplus_completeを生成しない。現状の7段階ファネルは新Place導線の受入証拠ではない。

## PR・branch・commit

main基準：`91e95bac4237f5349d6c35e7a0ae7b24087dd5d3`。取得時刻と最新検証headはtest-evidence参照。

|PR|base|head branch|取得したhead SHA|
|---|---|---|---|
|[#62](https://github.com/Wertask11/camellia-beta/pull/62)|`main`|`feat/camellia-quality-foundation-20261110`|`e1d2c557225b9ee3dd1c186496aae4c82c0ba12f`|
|[#63](https://github.com/Wertask11/camellia-beta/pull/63)|`feat/camellia-quality-foundation-20261110`|`feat/camellia-place-quality-20261110`|`8f633e8ff7cdcaf595acdc852eba8b3874eba91a`|
|[#64](https://github.com/Wertask11/camellia-beta/pull/64)|`feat/camellia-place-quality-20261110`|`feat/camellia-experience-circle-20261110`|`c44c61351ae30e159e026f644d75653ff1c9eded`|
|[#65](https://github.com/Wertask11/camellia-beta/pull/65)|`feat/camellia-experience-circle-20261110`|`feat/camellia-operator-quality-20261110`|`d59c2b44a67aa815dfde509c2e9fbd518d3a05ad`|
|[#66](https://github.com/Wertask11/camellia-beta/pull/66)|`feat/camellia-operator-quality-20261110`|`feat/camellia-referral-quality-20261110`|`aa66fb3c38418495f6aafb7e7e64a3003f551717`|
|[#67](https://github.com/Wertask11/camellia-beta/pull/67)|`feat/camellia-referral-quality-20261110`|`test/camellia-quality-release-audit-20261110`|`fcc586c86275f89ddd1e46922626f3ed320275cf`|
|[#68](https://github.com/Wertask11/camellia-beta/pull/68)|`test/camellia-quality-release-audit-20261110`|`feat/camellia-completion-data-20261110`|`c42f255f9d8c005af828b0688a1e99e408fc972f`|
|[#69](https://github.com/Wertask11/camellia-beta/pull/69)|`feat/camellia-completion-data-20261110`|`feat/camellia-completion-ai-20261111`|`0335ce69b6edfdac4df29019f12cf3e705a3b0b9`|
|[#70](https://github.com/Wertask11/camellia-beta/pull/70)|`feat/camellia-completion-ai-20261111`|`feat/camellia-completion-operations-20261111`|`788010074a3b1417e73b3fd13093e1056ed822af`|
|[#71](https://github.com/Wertask11/camellia-beta/pull/71)|`feat/camellia-completion-operations-20261111`|`feat/camellia-completion-lifecycle-20261111`|`eb4de3c1716634b27c409dbc9d9ae300657b2549`|
|[#72](https://github.com/Wertask11/camellia-beta/pull/72)|`feat/camellia-completion-lifecycle-20261111`|`feat/camellia-completion-billing-20261111`|`94f868adf523ab702e6bd001ee69a3be8b6fa108`|
|[#73](https://github.com/Wertask11/camellia-beta/pull/73)|`feat/camellia-completion-billing-20261111`|`test/camellia-release-completion-20261111`|`0b85594ba2370fade15d019b9881c536812c68c1`|

#73の上表SHAは中間取得値。最新の機能差分と最終文書commitはGitHubのPR headを参照し、実行済みの検証はtest-evidenceのsource基準と照合する。PRをsquashでまとめて既存6差分を失わせない。

## 変更ファイル

全差分のファイル一覧は [changed-files.txt](changed-files.txt)。詳細な機能設計は [data-protection.md](data-protection.md)、[ai-runtime.md](ai-runtime.md)、[place-management.md](place-management.md)、[lifecycle.md](lifecycle.md)、[billing.md](billing.md)。これらの過去段階の試験件数は最新全体試験の代用にしない。

## 利用者への価値・制限

FreeはToday/Check/一枚/会話/Discover/Circle/Myの既存体験を保護。Plusの中心はPlace個別化と明示共有で月500円の案内のみ。未契約の利用者へ有料権限を付与しない。Camellia IDは既存LINE/Googleで保存、別passwordなし。体験→選択→My→保存の導線を維持する。

本番で宣伝可能な実掲載Place・Plus・紹介・新Circle連携の実績は作っていない。実機/店舗/決済の受入後に正式判定を更新する。

## 2026-11-16 JST 追補：本人の実機確認

同じ固定Preview・専用アカウントで、Android→PC、PC→Android、Android再ログイン後の保存、JSON export/復元、削除した振り返りの非復活、Androidからの個人記録削除と古いPCタブの再読込後の非復活を本人が確認した。[owner-acceptance.json](owner-acceptance.json)。端末内build番号やprivate原文をこちらで取得していないため、本人申告の実操作証拠として区別する。実同時競合、別provider、Circle新連携/運営対応、実Gemini原価、全面アカウント閉鎖、Production新コードのPASSへ広げない。

実ログイン方式は本人回答でLINE。YURA→Lactoneの両方で返答が少しずつ表示されることも本人確認済み。Google実ログイン・provider receipt/token/請求照合は未確認。

既存Circleについても、固定Previewの別2アカウントで投稿・コメント・リアクション・PC反映・通報・ブロック・解除を本人確認済み。新Circle→Place手動紐付けはOFF、運営対応処理は今回HEADの実操作未確認。既存本番の過去実績を最新HEADへ転記しない。
