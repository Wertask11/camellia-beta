# 残工程の実装メモ（開始判断ではない）

Phase 3でprivate placeExperiencesと明示Memory source explicit_placeを追加。新記録を古いreaderが無視して再同期するのを防ぐため、記録を初めて追加するときだけローカル／archiveのversionを4へ上げる。元v3は必ず先にバックアップし、保存失敗時の再試行でもバックアップを省かない。v4 readerを残さず旧版へ戻さない。旧版reader fixtureで拒否を検証。既存v3はそのまま読める。

Circleの新Place連携はVITE_CIRCLE_PLACE_LINKS_ENABLED／CAMELLIA_CIRCLE_PLACE_LINKS_ENABLEDを別のOFFフラグで保持。サーバーはPlace本体の公開も必要。公開されたPlaceだけ手動で添付、private admin/place_scopeのslugsだけを店舗権限に使う。店舗投稿は自店イベントのみ、広告は通常の新着と分離。私的振り返りはCircleへ渡さず、本人が別欄へ書く。scopeは現在どの実アカウントにも設定していない。

## Phase 4（次）

- PlaceOperatorへmanagedSlugsを追加し、APIでprivate camellia_users/{uid}/admin/place_scopeから取得。管理者は全件、店舗担当は割当slugのみ。publishは運営だけ。draft/preview/submit/suspendと他店舗拒否を検証。
- 店舗の基本無料実証への同意を0円・特典任意・自動有料化なしの固定条件で記録。有料オプション額は未決定で受付不可。
- online metricsはdetail/official/booking/map/contactの公開カタログ操作のみ。eventIdをhashで冪等化し、日別の集計だけ店舗scopeへ返す。クリックを来店にしない。来店確認は方式未決定なので起動しない。
- 店舗担当に私的Circle feedへの資格を自動付与しない。必要ならPlace側の事業者scope限定イベント投稿APIを使い、CircleServiceにはserver-only identity markerを渡す。placePostで再度scopeを検証し、一般利用者のmembership認可は維持する。
- 通知の好み・種類・頻度・停止を本人が保存できるようにするが、配信providerやbrowser permissionを勝手にONにしない。配信準備中を明示。
- AI原価はpricing未確定。観測token数・承認済みの単価・予算上限を分離し、金額や実測を創作しない。新しい原価ledgerはOFF。

## Phase 5

- 共有作成・閲覧はCOMMERCE_PREVIEW_ONLY=trueのまま。匿名ページ・revoke・期限・削除連動をローカルで検証する。公開URLにはraw UID/本文/Check/Memory/Reflectionなし。実送信開始は別承認。
- 紹介の7日trial、登録完了で付与、referrer月3件、永久の装飾選択権をprotected台帳とtransactionで扱う。自己紹介・canonical provider重複・再付与・concurrencyを拒否。Firebase AuthのcreationTimeとprofileのserver createTimeを使い、既存アカウントを新規扱いしない。
- 既存のcamellia_auth_identitiesはbackend/camellia-auth.jsがserver-only作成。provider/subjectHash/camelliaUidがある。Google providerDataもAuthの管理SDKだけから取得。端末指紋・本人確認書類・Check/Memory/Reflectionは使わない。未連携のLINEとGoogleが同じ人かは断定できない。
- 月予算・trial専用AI枠・開始数値・装飾catalog・月3件超過時の新規側処理・trial重複ルール・期間は未決定。すべて明示設定され、正式リリース・原価・プライバシー・価値・retentionが運営承認されるまで受付不可。未設定を適当な数値で埋めない。
- 月予算の予約上限と実原価を分離。新受付の停止と、既に有効なtrialの維持を分ける。trial専用AIの予約枠はserver transactionで制御し、未接続の拡張AIを利用可能と宣伝しない。Freeの既存基本会話を新たに遮断しない。
- 装飾はデザイン未決定。永久選択権と、承認catalogから一度だけ選ぶ台帳まで。架空デザインを公開しない。ランキング・成長点なし。

## Phase 6

各phaseのunit/Firestore/browserを通してから次へ。全unit、emulatorの全境界、5幅、低速相当、keyboard viewport、既存Auth/Sync/Delete/Tree/会話の回帰をまとめる。PostHogは実定義と設計・合成テスト・本番着信を区別。D7/D30と本人の体験価値を主軸とする。コード・Preview・Productionを区別し、今回の本番公開は運営判断待ち。新機能flag・決済・共有送信・紹介・通知・Rules・claimを勝手に開始しない。
