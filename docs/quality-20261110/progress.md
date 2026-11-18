# 実装・検証の進捗

## Phase 0

最新main 91e95baから開始、40行の全採用事項監査をaudit.md／audit-matrix.jsonへ記録。既存48/48 suite PASS。本番・個人記録・feature flag・Rules・claim・決済契約は変更していない。本人から決済と実在掲載は未準備との回答。

## Phase 1：Today・推薦・Plus

- Checkをせず候補を選択し、Myから明示的に残せる。架空のCheckは作らない。
- Guest draft v1を維持し、Checkなしのv2を追加。LINEのnonce／10分bridge／30分期限、owner binding、取消・別アカウント・二重保存防止を維持。
- 希望と最大時間を調整し、時間の条件を勝手に緩めない。中心1件と別候補を維持。
- 「N日目」を「N日分の記録」へ変更し、連続利用の圧力と誤解を避ける。
- Plusの中心を本人が許可したパーソナル提案・比較として説明。課金・共有送信は停止を維持。
- lint／typecheck／build、Guest/OAuth単体、Check interaction、Today 59ケース PASS。全suite再実行を実施。
- 実Chromiumの375／390／412／768／1280でCheckなし→選択→My→合成LINE/Google→保存→refreshがPASS。Checkは0件、選択は1度だけ、横overflowなし。
- 既存のCheckありGuest→Camellia→Discover→Place→My→保存の5幅と両スタイルSafety6境界もPASS。
- 実ログイン・Productionの新機能公開・実Geminiの実行は未確認。合成認証を実認証の成功とは扱わない。


## Phase 2：Placeの基本品質

- 価格上限・所要時間・4分野・サービス・予約なし・JST営業時間／休業日を構造化し、条件不明を一致として扱わない。深夜営業も検証。
- 掲載前に実在・掲載許可・写真利用許可・情報確認の4確認と、非公開の許可証跡を必須化。公開projectionから証跡・運営UIDを除外。変更前後のauditと再審査・停止を維持。
- 任意特典に対象・条件・有効期限を追加。確認済みかつ有効な特典だけ表示。特典・スポンサーは順位に使わない。
- Freeでも3候補の事実比較ができる。Plusの個別比較APIはサーバーの有効プランを検証し、許可した希望だけを受け取る。
- 問い合わせと電話の導線を追加。デモの料金例は例のある1件だけ構造化し、他2件の価格を創作しない。
- CheckなしのOAuth bridgeをv1とは別keyへ分離し、古いタブによる消去を回避。既存v1のCheck引き継ぎを維持。
- lint／typecheck／build、Place条件の単体、既存Place境界、Guest互換性がPASS。ローカルFirestoreで権限・審査証跡・公開projection・audit・再審査・停止PASS。
- 実Chromium 375／390／412／768／1280で比較dialog/Escape、価格・時間制限、不明営業時間の除外、空状態、横overflowなしを確認。Checkなし保存の5幅回帰もPASS。
- Production公開・実在店舗掲載・課金・共有送信は行っていない。


## Phase 3：Circle・Memory・Reflection

- 投稿者が公開済みPlaceを手動で選ぶ連携。私的Check・Memory・Reflection本文は自動共有しない。新着と、本人が選ぶ希望に合うPlace付き投稿を区別。
- 店舗はprotected admin/place_scopeの割当Placeのイベント・体験だけ投稿可。役割の偽装、他店、無関係なコメント広告を拒否。通常の新着と店舗イベントを分離。
- 私的なPlace体験・感想・Reflection、本人申告と検証済み来店の区別、任意のMemory保存、個別削除を追加。デモを来店済みにできない。
- 新しい任意collectionの取り落としを防ぐため、初めて記録を作るときだけarchive/local version 4へ進む。v3の原本を先にバックアップ。バックアップ失敗・retryでは旧原本を保持する。旧readerはv4を拒否して上書きを止める。
- lint／typecheck／build、private体験・Memory・archive roundtrip・旧reader拒否・控え保存／quota失敗の単体PASS。既存Circle 40件と新しいPlace連携のlocal Firestore権限・停止・偽装・広告・削除境界PASS。
- 実Chromium 375／390／412／768／1280で私的Reflection、Memory選択、v3控え→v4、refresh、別欄からの手動Circle投稿、元の私的文章を送らないこと、Circle→PlaceがPASS。HTTPとAuthは合成で、実アカウントではない。
- 新しいCircle→Place連携はfrontend/serverの別フラグOFF。既存Circleの公開設定は維持。実店舗・scope設定・新機能のProduction公開はしていない。

### 保存形式とrollback

既存v3は新readerでそのまま読める。一括migrationなし。v4を作成済みの環境では、v4 readerと保存保護を残したまま画面だけ戻す。v4対応前のbuildへ丸ごと戻す場合はread-only recoveryとなるため、原本／pre-v4控えのexportを確保し、v4対応buildへ戻す。古いreaderで新しい記録を読み飛ばして再同期しないことを検証済み。

## Phase 4：店舗管理・オンライン集計・通知設定

店舗担当はserver-onlyの割当slugだけ。運営のみpublish、担当は自店draft/submit/suspend。営業用の別ログイン・事業者導入は未提供。自店イベント専用APIはCircle会員資格を付与せず、feed閲覧不可。無料実証は明示同意、特典任意、自動有料化なし。有料オプション／来店確認は未提供。

公開カタログの操作だけを日別集計。重複eventIdは一度、私的本文は拒否。店舗への自店集計はクリックであり来店ではない。通知は好み・頻度・停止を保存するだけで配信なし。AIの数値メタデータ台帳と承認単価の見積り関数まで。実Gemini原価観測は未接続、請求額・価格は未確認。

検証：専用unit、Firestore emulatorのscope/他店/公開権限/集計concurrency/契約/事業者イベント/撤回/停止、5幅の通知保存・reload・off PASS。lint/typecheck/build/full testsは各実行ログと最終報告を参照。Phase 3の全51 suite再実行もPASS。実店舗登録0、Productionの設定変更0。詳細はoperator-workflow.md。

## Phase 5：プレビュー共有・紹介の安全な基盤

共有送信・匿名公開は引き続き停止。共有owner削除時の読取を失効させるだけでなく本文もscrubする。紹介は未決定設定がないと起動しない内部transaction基盤を追加。7日体験、月3件の永久選択権、自己／連携ID重複、予算／trial専用枠、同時送信、期限、対象取消をローカルで検証。紹介の公開APIはstatusのみ、POST拒否。signup／実Geminiへの紹介連携は未接続、実際の特典提供と称さない。

Phase 4の全52 unit suites PASS。Phase 5の専用unit、referralと既存sharingのFirestore emulator PASS。5幅・全unit・buildは最終検証へ。未決定事項と未接続部分はreferral-workflow.mdに記載。本番の紹介データ・設定・装飾は0件変更。

## Phase 6：総合検証

全54 unit suites、lint/typecheck/build、全Firestore entry suiteがPASS。紹介取消後／期限後の再送を有効な新特典・AI予約と扱わないガードを追加し、専用emulatorでも再実行PASS。

5幅のCheckあり／なし、Place条件・比較、私的Reflection／任意Memory、手動Circle、通知設定・紹介停止・共有エラー復帰を確認。実PostHog SDKの横取り試験で送信privacy、503復旧・DNT・block・破損・容量不足がPASS。会話のsearch/pagination/legacy/モデル切替/reload/focus/Escape、低いviewportもPASS。

最終画面確認で、条件を変える前の比較候補が残る問題と、低い画面でguest会話入力がnavに隠れる問題を修正。Placeの詳細条件をnative detailsへ整理し、常時デモ表示を保持。低速150ms/200kB/s/CPU4倍遅延で5幅の入力とdialog focusも確認した。

固定Previewの本人確認は「選んだ行動と過去の記録を確認できた」。実際のproviderは回答にないので両認証方式の実操作PASSとはしない。Productionは公開statusの読取のみで、main91e95baと配信indexが変わっていないことを確認。最終レポートと40件の対応表に、未接続・未決定・未検証を分離した。
