# 運営手順（2026-11-11）

## 共通原則

main統合、Production deploy、Rules/index適用、担当権限変更、料金徴収、公開flag、共有送信、紹介受付、通知配信は別の操作とする。この作業では実行していない。秘密値をPR・チャット・ログへ貼らない。まずread-only確認とdry-runを行い、承認した変更だけを適用する。

固定Previewは1つ：
https://camellia-beta-git-codex-camellia-alpha-relea-161533-school-park.vercel.app/

店舗入口は同じoriginの `/?open=place-operator`。利用者のCheckやprivate Treeは不要。新たなLINE callbackを登録する必要はない。

## 1. 店舗担当の受入

1. 担当者が専用入口から既存LINE/Googleでログインする。運営はFirebase Auth側で本人identityを確認する。公開URLへUIDを含めない。
2. 運営権限を確認した環境で `node scripts/place-scope.mjs OPERATOR_UID STAFF_UID slug-a,slug-b '理由'` を実行する。これはdry-run。対象店舗と担当者を別の目で照合する。
3. 承認後だけ `CAMELLIA_OPERATOR_CHANGE_APPROVED=true` とCLIの `--apply` を使う。適用とauditを確認する。実担当へglobal operator/moderator claimを渡さない。
4. 解除はslug欄を `-` とし、同じdry-run/承認/適用/監査の順。無効化・削除済み担当者も解除可能。
5. 担当者が下書き→編集→審査依頼。公開/停止はserver側の役割を確認。編集保存はupdatedAt照合で、競合したら最新を読み直し、手元の入力を確認して再操作する。公開情報の修正は下書きへ戻り再審査。
6. 運営は実在/掲載許可/写真権利/情報確認の証跡を非公開で登録し、写真・公式・予約・地図・問合せ・住所・営業時間・体験内容をpreviewで確認。draft→review→published、問題時suspended、修正後reviewを一巡させる。
7. 別の担当者/一般利用者/未認証から他店編集・公開・証跡取得が拒否されることを確認する。担当ログインからCircleへ自由投稿できる権利は付かない。
8. 基本掲載無料、特典任意、自動有料化なしを確認。本人の希望に基づく推薦順位を広告と混ぜない。実店舗の承認がない今は公開しない。

管理previewの閲覧やリンク確認は利用者のクリック実績へ足さない。担当者の集計は自店のview/official/booking/map/contactの**クリック件数**。来店人数、予約成立、購入と呼ばない。古い/停止Placeや消えた投稿の情報は再読込し、リンクだけから私的原文を復元しない。

## 2. AI原価と障害

通常会話のFree経路は維持する。共通Safety→認証/eligibility→共有rate limit→送信receipt→実SDKの順。内容・UID・生request IDをログに残さない。YURA/Lactoneの変更で枠を回避しない。

運営はまずproviderの公開データ方針と公式単価を確認する。protected `config/ai_observation` の承認者・日時・保持期間と、モデル別input/output/thinking/cache単価、公式sourceUrl、checkedAtをレビューする。単価不正はunknownで、0円としない。Freeの観測保存失敗は返答失敗にせず1秒で待機を区切るが、未観測の警告を見落とさない。

読み取り集計：`node scripts/ai-cost-report.mjs YYYY-MM-DD YYYY-MM-DD`。JSTの日別/モデル別で試行/失敗/中断/Safety/token取得/不明/推定を確認する。invoiceVerified=falseを実請求済みと扱わない。実請求書・請求APIと照合できなければ「未照合」。監視閾値は運営が決定する。

紹介専用laneは公開OFF。承認した入力上限/単価/予算/枠が揃った後もcountTokens→最大試行の予算予約→生成→精算を確認する。未dispatchのみ返却し、dispatch後のtimeout/503/中断/usageなしは不明費用としてhold。再送しても同じreceiptを二重生成しない。異常時は専用trial受付を止め、既存Freeを一括で停止しない。

provider障害では502/503/timeoutのカテゴリ・model・attempt・timedOutだけを照合。生エラー本文を収集しない。利用者には技術語ではなく再試行可能な案内を出し、ローカル定型文を実Gemini成功と数えない。連続失敗時は無制限retryせず、provider復旧を待つ。stream断後は失敗/中断として記録する。

## 3. Plus・決済

現在checkoutReady=false、Webhook503。選定前に解除しない。

契約/税/法定表示/規約/返金・保持方針を確定→sandbox checkoutでserverのverified identityへ顧客をbinding→raw body署名/時刻/canonical invoice検証adapterを接続→500円JPY月額の承認priceだけを許可する。client bodyのUID/paidフラグは信用しない。

支払、重複・改変・順不同、未払、更新、取消、期限、旧invoice返金、新invoice更新、全額返金が先に来る場合、部分返金、processor障害、再送をsandboxで受入する。取消は支払済み期間を保護。部分返金の権利方針は運営確認。個人記録resetは契約の解約ではない。

検証済みinvoiceのoutboxだけを冪等publisherからPostHogへ送る。固定insert IDと既存の仮名ID、金額/通貨のみ。未接続の今は送信しない。障害では未払いに有料権限を付けず、保護済み既存権利を消さない。返金等はprocessorの正式操作と確認済みWebhookで同期する。

## 4. 紹介・装飾

7日・JST暦月3件・永久の任意装飾・自動課金なしを維持。予算/AI枠/開始基準/最終デザイン/超過時/重複/期間が未決定なので受付OFF。

開始前は専用テストidentityでtoken→10分intent→新規LINE/Google→初回正常sync→1回だけ付与、既存/自己紹介/他人intent/同時完了/期限/予算上限/停止を検証。未連携LINE/Googleを自動で同一人物と決めない。登録時刻はAdmin Authとserver rootで確認する。

装飾は承認assetとprotected catalogを実画像で確認してから選択可能にする。最終デザインをfixtureからコピーしない。1選択権1回、永久所有、Free/Plusどちらも表示、解除しても所有が残ることを確認。停止時は新受付と付与済み権利を区別する。

## 5. 通知

現在は希望の保存と停止だけ。permissionを自動要求せず、provider/driver/jobを起動しない。

方式決定後は、希望→明示permission→検証済み登録先→承認configの順。driverは冪等keyを保証し、返答をdelivered/rejected/unknownに分ける。unknownを成功にも未配信にも決めつけない。種別横断のJST日/週/月枠、直前の同意/停止/revision/登録先/運営停止を確認する。

本人停止は登録先削除とserver停止を確認する。個人記録削除でも先に停止し、失敗したら原本削除を止める。既に外部へdispatch済みの通知は撤回できない。ロック画面は汎用コピーだけ、Check/会話/人名/店舗で推測できる機微情報を含めない。

再送は確認済みrejectedだけ同じ冪等keyで行う。unknownはprovider照会して解決するまで保留。実driverの端末許可失効/停止直後競合/重複/復旧を受入後に、別承認で配信を開始する。

## 6. 保持・削除ジョブ

inventoryはexternal-dependencies参照。期間未承認なら停止する。`node scripts/retention.mjs COLLECTION` は固定collectionのdry-run。protected policyのapproved/approvedBy/approvedAt/retentionMsが必須。期限と承認保持期間の両方を過ぎ、createdAtが分かるものだけを候補にする。

運営が件数と対象範囲を確認し、承認後だけ `CAMELLIA_OPERATOR_CHANGE_APPROVED=true node scripts/retention.mjs COLLECTION DIGEST --apply` を実行する。設定/原本が変わればdigest不一致で停止。100件ごとのnextCursorを `--after=` に渡す場合は新ページでdry-runし直す。監査には件数とdigestを記録し原文をコピーしない。

本番では未設定・未実行。job scheduler/TTLは稼働していない。expiresAtを見ただけで削除済みと報告しない。運営監査自身の保持期間も別に決める。

## 7. 本番統合・障害復旧

1. release-readinessの未検証項目を閉じ、現在main/PRhead/flag/Rules/indexのread-only snapshotを取得。本人データをログ/PRへ出さず、承認されたbackupと復旧先を準備する。
2. #62→#67→#68→#73を独立PRのまま順番にレビュー。後続baseを更新し、差分の取りこぼし/重複/競合、最新headのCIを確認。main反映とdeployの具体的承認後だけ実行する。
3. Rules/index変更が必要な場合、共有SchoolParkの既存Rulesを残した最小差分をレビュー。専用projectでpermission回帰→必要index有効を確認→別承認で適用する。削除CASを満たすRulesの準備なしにv4書込を始めない。
4. 未公開flagはOFF。main deploy後に公開status→実ログイン→既存復元→Today/会話/Discover/My→専用v4同期/Circleの実スモーク。新料金/通知/紹介/共有受付を同時開始しない。
5. 問題時は後続統合を停止し、migration-and-rollbackのv4対応版へ戻す。旧mainのv3 readerへ全revertしない。原本がない状態で再migrationや一括削除をしない。

各操作の日時/担当/commit/設定差分/結果/戻し方を非公開運用記録へ残す。正式リリース・宣伝開始はこの技術作業と別の運営判断。
