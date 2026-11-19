# リリース完成状況（開発進捗・正式公開未完了）

対象 main: `fe7f85947a0799f9b4d4097e34c389839c3f7ec1`。統合コード145aa5dに、支払い管理を独立させたアプリコード `af3de9e2226d15f57e7e1fb1e34323ae1e14f830` を追加。mainへmerge・Production deployしていない。

正式目標は2026-12-01。現時点の判定は **PARTIAL / Go不可（受入前）**。開発・本番技術・正式公開を分ける。未決定・未検証をPASSにしていない。

## 40項目の引き継ぎ

前回欄は既存40項目文書の当時の報告を引用したもので、新sourceの合格証拠ではない。現在の自動試験/ブラウザ証拠はtest-evidence.mdを参照。

|ID|採用済み仕様|前回報告|今回のコードと検証範囲|残る条件/未完了|
|---|---|---|---|---|
|①|Today中心1件＋別候補|コード完了・Preview本人確認|中心1件・別候補・Check非強制を維持。登録不要の全導線を統合試験。|実ユーザーが感じる提案価値は未測定|
|②|自動提案＋本人調整|コード完了・ローカルPASS|本人の希望・時間の明示調整を維持。条件を勝手に緩めない。|実店舗の候補による受入待ち|
|③|Plusの個別化・比較・Place|部分実装・提供保留|protected Plus比較を維持し、Stripe購入・承認不足停止と接続。|実店舗・Plus会話方針・実Stripe待ち|
|④|提案＋任意の店舗特典|構造完了・実特典0|対象・条件・期限・提供確認済みだけの任意特典を維持。|実特典0。架空の特典を公開しない|
|⑤|初期無料実証|基盤完了・運用未開始|0円・特典任意・自動有料化なしを維持。店舗募集入口を追加。|実店舗との受入・合意待ち|
|⑥|基本掲載無料・有料任意|基盤完了・有料保留|基本無料の申請→非公開審査→draft/自店scopeを接続。|申請受付OFF、店舗有料オプション開始なし|
|⑦|女性の希望に合う場所・体験|コード完了・ローカルPASS|エリア・予算・時間・本人の希望による条件と理由を維持。|実在カタログ0で推薦価値は未実証|
|⑧|4分野を同等に展開|構造完了|4分野を同等に扱う構造を維持。架空の店舗追加なし。|初期4店は提案。店数と営業は運営判断|
|⑨|登録前の価値体験|コード完了・Preview本人確認|登録不要の無料、メールID、LINE/Google互換を維持・再試験。|新sourceでの本人実ログイン受入待ち|
|⑩|Check→提案→Place/Discover→Action→Reflection|部分実装・実体験待ち|選択→私的体験→任意Reflection/Memoryを5幅で再操作。|実際の来店・体験確認ではない|
|⑪|店舗実在・許可・情報・履歴・停止|コード完了・実掲載待ち|私的連絡先を分離した申請、CAS審査、担当付与/解除、保管終了を追加。|実在確認/許諾/写真/実掲載0。新規保持の承認待ち|
|⑫|Plus500円・店舗基本無料・原価と転換計測|部分実装・事業未準備|Stripe500円、署名/正規照合、専用token/原価枠、計測Outbox、原本削除後も開ける支払い管理UIを接続。|実費/請求書・決済契約・料金運用未照合|
|⑬|正式リリース可否は運営判断|維持|main/Production/Rules/env/claims/各運用を変更せず、3判定を分離。|公開判断は運営。日付だけで自動公開しない|
|⑭-1|発見目的のToday・Check非強制|コード完了・Preview本人確認|Checkなし選択・保存・復旧・無料体験を現在sourceで再試験。|実端末の受入待ち|
|⑭-2|CircleのPlaceを手動選択|コード完了・新連携OFF|既存の本人手動Place紐付け・原文非混入・停止時非表示を再試験。|新連携OFF。新sourceの実2アカウント受入待ち|
|⑭-3|店舗投稿はPlaceのイベント・体験のみ|基盤完了・実運用未開始|自店イベント限定を維持し、申請からのscope付与/解除を接続。|実店舗担当者の受入待ち。consumer権利を付けない|
|⑭-4|Circle新着＋本人が選んだToday希望|コード完了・新連携OFF|新着と本人希望による表示を維持。秘密のCheckは自動照合しない。|新連携の実受入待ち|
|⑭-5|本人が選ぶ通知種別・頻度・停止|設定完了・配信未提供|明示許可・標準Web Push・固定本文・停止・不明結果の重複抑止を実装。|実OS配信未検証。設定・配信はOFF|
|⑭-6|体験価値・D7/D30・Circle→Place・感想|計測コード・定義追加／実測待ち|既存価値/D7/D30定義を維持。支払いのschema3と配送を分離。|PostHog実着信/集計・人数/継続率は未検証|
|⑮-1|明示共有・非公開原本保護・匿名の閲覧ページ|既存プレビュー維持・内部境界強化|選択/プレビュー/発行/第三者閲覧/履歴/取消/期限/削除をHTTP接続。|ローカル合成受入。本番発行OFF|
|⑮-2|新規登録完了で7日体験／紹介者月3件|内部基盤完了・未接続|確認済み新規ID・匿名→ID proof・7日体験・月3件装飾を接続。|予算/専用枠/期間等が未設定で受付OFF|
|⑮-3|任意装飾・永久保有・競争なし|基盤完了・デザイン未決定|永久の選択/装着UIと3点のSVGデザイン案を追加。|最終デザインとcatalog承認は未決定|
|⑮-4|7日終了・自動課金なし・1人1回・AI上限|基盤完了・実AI未接続|期限判定・自動課金なし・重複判定・回数/費用/token枠を接続。|保持・同一人判定の削除後限界と他体験重複方針の承認待ち|
|⑮-5|自己紹介・重複・大量登録の抑止|部分実装|確認メールHMAC、LINE/Google既存照合、旧ID拒否・冪等proofを追加。|本人確認しても物理的な一人を永久に保証するものではない|
|⑮-6|月予算・AI枠・異常増加・緊急停止|基盤完了・数値未決定|月予算予約・実usage精算・unknown保留・承認済み未使用見積返却を接続。|月額/専用数値は未承認。請求照合と運営監視の実受入待ち|
|⑮-7|正式リリース後のみ紹介開始|停止維持|12/1対象方針を維持。正式受入・設定不足なら受付できない。|日付だけでキャンペーンを開始しない|
|⑮-8|数値基準・超過時・重複規則・期間は保留|未決定を保留・安全に拒否|数値は設定式・未設定停止。月3件超過後の新規側はgrantに統一。|予算/AI枠/終了日/重複/最終装飾等は運営判断|
|⑯-1|希望に合う場所・体験を伝える|コード完了・実掲載待ち|希望に合う場所・体験という価値を維持し、募集/申請入口を追加。|実店舗受入待ち|
|⑯-2|異なるジャンルを少数ずつ|構造完了・実店舗0|少数・異分野を扱うカタログ構造を維持。デモ3件を明記。|実店舗0を実績として扱わない|
|⑯-3|認知・予約・再発見、成果保証しない|部分実装|閲覧/公式/予約/地図/問い合わせのクリックと来店を区別。|予約成立/来店/購入の実績値なし|
|⑯-4|基本情報＋体験必須・限定企画任意|コード完了・審査で必須|基本情報・体験紹介・4審査証跡、任意特典を維持。連絡先は非公開。|実在・許諾・営業時間等の運営確認待ち|
|⑯-5|既存地図・予約・問合せが基本|コード完了|既存外部導線とURL安全性、問い合わせ等のエラー表示を維持。|実店舗の実リンクと画像配信受入待ち|
|⑯-6|オンライン集計＋希望店舗の来店確認|オンライン基盤完了・来店未提供|自店だけの集計・重複排除・クリック種別を再試験。|来店確認の方式は未承認。架空の実績を作らない|
|⑯-7|基本無料、任意有料を段階導入|基本無料を維持・有料未提供|無料の掲載相談/審査/自店担当を接続。有料店舗契約を作らない。|任意有料の金額・営業開始は運営判断|
|⑯-8|条件を厳密に絞り希望で推薦・理由|コード完了|厳密な条件/本人希望/理由/無料事実比較とprotected個別比較を維持。|実在カタログでの受入待ち|
|⑯-9|任意のMemory・Reflection・Circle連携|コード完了・ローカルPASS|任意Reflection/Memory、別欄の公開Circle、自動原文共有なしを再試験。|新sourceの実環境同期・新連携受入待ち|
|⑯-10|完成目標・営業方法・件数・有料額・来店方式|未決定を保留|4分野4店を提案として残し、営業→申請→審査手順を用意。|件数/営業方法/有料額/来店方式を勝手に決めない|
|保護|既存データ／Auth／Fortune／Tree／会話／Circle|ローカル境界PASS・実運用未確認|v3/v4・CAS・tombstone・legacy会話・ID隔離を全試験。無料日30回を登録IDにも適用。|共有Auth自体の削除は個人記録削除と別。実環境の再受入待ち|
|安全|認証と認可、他人のデータ、店舗境界、共有|ローカル境界PASS・本番設定未変更|server認可、scope、秘密ID非公開、取引署名、重大/高リスク依存0へ修正。|中18/低5（実行）等は残存。新規台帳の保持/完全削除は未完部分あり|
|UX|スマホ・読込・空状態・アクセシビリティ・低速|5幅PASS・実機一部未確認|5幅の無料/ID復旧/会話両方向切替/公開前UIを再検証。入口を1つの固定Previewで維持。|実iPhone/Android OSキーボード/VoiceOver/TalkBack・回線/画像の実配信は未検証|

## 機能別100点評価

同じ尺度の前回点数は存在しないため、全項目「前回数値なし」。実装20/認可・原本保護20/当該sourceの自動検証20/Preview実受入20/Production運用20。未検証0、部分10、揃った範囲20。ローカルChromiumをPreview実受入へ加点しない。点数から公開可否を自動決定しない。

|機能|実装|保護|自動検証|Preview実受入|本番運用|計|前回比較|
|---|---:|---:|---:|---:|---:|---:|---|
|無料・Camellia ID・個人記録|20|20|20|0|0|60|前回数値なし|
|Today/Discover/Fortune|20|20|20|0|0|60|前回数値なし|
|YURA/Lactone会話|20|20|20|0|0|60|前回数値なし|
|Memory/Reflection/My Tree|20|20|20|0|0|60|前回数値なし|
|共有|20|20|20|0|0|60|前回数値なし|
|紹介/専用AI枠|20|20|20|0|0|60|前回数値なし|
|装飾（最終デザイン待ち）|10|20|20|0|0|50|前回数値なし|
|Circle/Place連携|20|20|20|0|0|60|前回数値なし|
|通知|20|20|20|0|0|60|前回数値なし|
|Place店舗受入|20|20|20|0|0|60|前回数値なし|
|Plus/Stripe|20|20|20|0|0|60|前回数値なし|
|計測/運用着信|10|20|20|0|0|50|前回数値なし|
|Security/全種類の保持・削除|10|20|20|0|0|50|前回数値なし|
|モバイルUX|20|20|20|0|0|60|前回数値なし|

## PR・branch・commit・Preview

branchとheadは読取時点。後続は前段をbaseにした独立PR。#91/#94はmain側の独立セキュリティ系統。統合PRは同じ修正を機能スタックにも取り込む。以前の機能PR headだけを本番候補として使わない。固定Previewだけを本人確認の入口とし、OAuth登録を増やさない。

|PR|branch|head|base|個別Preview（レビュー用）|
|---|---|---|---|---|
|[#84](https://github.com/Wertask11/camellia-beta/pull/84)|`feat/camellia-release-foundation-20261119`|`b8bef2350516db5a00b68cf7fba7423426cc6e2e`|`main`|https://camellia-beta-git-feat-camellia-release-foun-86ce38-school-park.vercel.app|
|[#85](https://github.com/Wertask11/camellia-beta/pull/85)|`feat/camellia-stripe-bridge-20261119`|`2be3daffd4f5e6ef6607a65b06f6d84404cbbc34`|`feat/camellia-release-foundation-20261119`|https://camellia-beta-git-feat-camellia-stripe-bridg-271d81-school-park.vercel.app|
|[#86](https://github.com/Wertask11/camellia-beta/pull/86)|`feat/camellia-stripe-checkout-20261119`|`ed21af14d9c47900068f2ccdcb7b6fe82115e0f0`|`feat/camellia-stripe-bridge-20261119`|https://camellia-beta-git-feat-camellia-stripe-check-e711d5-school-park.vercel.app|
|[#87](https://github.com/Wertask11/camellia-beta/pull/87)|`feat/camellia-share-runtime-20261119`|`353345efae8b59720ab0114a1f065feea2543461`|`feat/camellia-stripe-checkout-20261119`|https://camellia-beta-git-feat-camellia-share-runtim-c449be-school-park.vercel.app|
|[#88](https://github.com/Wertask11/camellia-beta/pull/88)|`feat/camellia-referral-id-20261119`|`e7369e265f948fddaa6d2c3bf9eb0ec187d47e50`|`feat/camellia-share-runtime-20261119`|https://camellia-beta-git-feat-camellia-referral-id-017db7-school-park.vercel.app|
|[#89](https://github.com/Wertask11/camellia-beta/pull/89)|`fix/camellia-member-free-limit-20261119`|`464544ec6165fa5048e990479d9143a611339fc6`|`feat/camellia-referral-id-20261119`|https://camellia-beta-git-fix-camellia-member-free-l-671b42-school-park.vercel.app|
|[#90](https://github.com/Wertask11/camellia-beta/pull/90)|`feat/camellia-web-push-20261119`|`4dc1d6b3c74261f948f46b667533379faf05a804`|`fix/camellia-member-free-limit-20261119`|https://camellia-beta-git-feat-camellia-web-push-20261119-school-park.vercel.app|
|[#91](https://github.com/Wertask11/camellia-beta/pull/91)|`fix/camellia-react-security-20261119`|`3c786d2d3e17f90fdeb3930f8b52ee08f192e1a5`|`main`|https://camellia-beta-git-fix-camellia-react-securit-820d17-school-park.vercel.app|
|[#92](https://github.com/Wertask11/camellia-beta/pull/92)|`feat/camellia-place-intake-20261119`|`cfc7ddad1149b03a2530e4d7c01382bc827bbd64`|`feat/camellia-web-push-20261119`|https://camellia-beta-git-feat-camellia-place-intake-18dbed-school-park.vercel.app|
|[#93](https://github.com/Wertask11/camellia-beta/pull/93)|`feat/camellia-release-controls-20261119`|`ce886da3b40b71973e91c5371c66c4ac4133ebfc`|`feat/camellia-place-intake-20261119`|https://camellia-beta-git-feat-camellia-release-cont-769b32-school-park.vercel.app|
|[#94](https://github.com/Wertask11/camellia-beta/pull/94)|`fix/camellia-dependency-security-20261119`|`b95a0f5822228bee9d511f53cabdabe6ad135863`|`fix/camellia-react-security-20261119`|https://camellia-beta-git-fix-camellia-dependency-se-b781b5-school-park.vercel.app|
|[#95](https://github.com/Wertask11/camellia-beta/pull/95)|`feat/camellia-trial-token-budget-20261119`|`3ee94738eece36a92a49e064b7ea4a01a9103bb0`|`feat/camellia-release-controls-20261119`|https://camellia-beta-git-feat-camellia-trial-token-553bda-school-park.vercel.app|
|[#96](https://github.com/Wertask11/camellia-beta/pull/96)|`feat/camellia-billing-analytics-20261119`|`446f3f510257627dd76e4b2644b3d980ec218d42`|`feat/camellia-trial-token-budget-20261119`|https://camellia-beta-git-feat-camellia-billing-anal-d41693-school-park.vercel.app|
|[#97](https://github.com/Wertask11/camellia-beta/pull/97)|`feat/camellia-release-integration-20261119`|`ae5003618203733ec1300a91ee836bcd1281f11e`|`feat/camellia-billing-analytics-20261119`|https://camellia-beta-7g536o3ce-school-park.vercel.app|
|[#98](https://github.com/Wertask11/camellia-beta/pull/98)|`feat/camellia-billing-management-20261119`|`61ac5c91a129bc1969674467511d1e2f711d47a2`|`feat/camellia-release-integration-20261119`|Vercel success: BLrSc3qtogLgDCS7MHaJcn52hxNb|

固定Preview: https://camellia-beta-git-codex-camellia-alpha-relea-161533-school-park.vercel.app/ 。最新候補の反映/Ready証拠はrelease-readiness.mdを参照。

## 明確に残ること

- 実店舗・写真/掲載許可0、実Stripeテスト0、実Web Push/OS表示0。契約や外部受入を合成データで代用しない。
- PostHog接続が応答せず、実着信・Insight/新funnel・D1/D7/D30・実転換率は未検証。配送コードとHTTP fixture成功を実着信へ読み替えない。
- 紹介予算/専用枠/終了日、Plus会話方針、他体験重複、装飾最終案、種類別保持の運営決定待ち。推奨値はproposed-settings.mdで未承認のまま。
- 保持の設定・安全停止・許可済み期限削除は実装したが、紹介成立/Identity HMAC/予算・永久権利の全ライフサイクル削除、決済法定記録、全事業者監査の削除は未接続/運用設計待ち。expiresAtだけで物理削除済みと言わない。設定承認だけで全種類の削除が完成すると案内しない。
- Myの個人記録削除と、共有Firebase Auth/SchoolPark等のログインID自体の削除を分離。自動的なAuth全削除は未実装・運営の範囲判断待ち。
- 依存監査の重大/高は0だが中/低は残る。到達性とリスク受入のレビューを完了していない。
- 実端末/実ログイン/新source同期/2アカウント/運営処理の受入を再取得する。過去の本人確認は回帰の参考情報で、新sourceのPASSではない。
- main/Production/Rules/env/claims/新機能ON/課金/通知/紹介の開始は未実施。P0/P1=0を実環境まで含めて確定できない。

保存/アクセス/期間/削除方法の全種類の一覧は[data-inventory.md](data-inventory.md)。詳細はrelease-readiness.md、operator-runbook.md、migration-and-rollback.md、external-dependencies.md、test-evidence.md。

プロフィール未作成/個人記録削除後の専用支払い管理UIを追加（billing-management.md）。ローカルの実API/5幅UIと、実メール・Stripe・固定Previewの受入を分ける。後者は未検証。
