# Phase 2C — Place MVP candidate

Base main03ff2cc。実在場所の登録・公開件数は **0件**。自動seedなし。テストの架空場所はdemoエミュレータと明示ラベル付きlocal fixtureだけで、本番へ一切送信しません。REAL PUBLISHED PLACE PASSは未達です。

## Architecture

- API `/api/camellia/place`。資格情報はPhase1のserverAdminを再利用。公開情報のGETは認証なしでも可能。アプリ内はログイン後に公開slugのリンクへ戻る方式。
- `camellia_admin/release_phase1/places/{slug}` はserver-only。draft/review/published/suspended。一般GETはpublishedのみ。保存済みに含まれていても停止・下書き情報は返しません。
- 公開項目：名称、カテゴリ、説明、地域/エリア/住所、価格帯、所要時間、営業時間、公式/Instagram/予約/地図URL、最大5写真URL、タグ、希望する過ごし方、提携/広告/特典、作成/更新/公開日。位置情報は取得せず緯度経度の必須項目はありません。
- 福岡から運用開始し、region/areaで他地域にも拡張できます。地域情報は手入力の公開情報だけで、ユーザーの現在位置を取得しません。
- 店舗へのリクエストはhttpsの外部リンクのみ、noopener/noreferrer。Check/会話/Tree等はURLに付加せず、APIも個人のCheckを読みません。写真はlazy loading/referrerなし。配信先へIP等が届く点をPrivacyへ記載。
- 希望する過ごし方の手動filterはquiet/rest/try/move。医学的状態・効能による推薦はしません。Sponsoredは通常候補とは別のPR・広告section。partner公開には担当者の明示確認が必要。
- 公開候補と本人の保存一覧は20件ずつ。filterは取得済みページに対して適用し、「さらに場所を見る」で追加取得できます。大規模掲載時はserver filter検索を追加する余地があります。

## Favorites, privacy and deletion

本人の保存先は `camellia_users/{uid}/place_saves/{slug}`、slug/saved/updatedAtだけ。既存v3の会話/Checkのarchiveは変更せず、別端末でも同じ本人のserver保存を参照します。一般ユーザーは自分の保存だけを操作できます。公開が停止した場所は保存画面にも詳細を返しません。Myの個人記録削除対象へplace_savesを追加。運営の掲載情報・監査は個人記録削除の対象外です。Circle削除方針には変更なし。

PostHog5イベントはplace_view/save/external_open/booking_open/map_open、プロパティは公開slugのみ。本文・氏名・Check/会話/Treeや外部URLを渡しません。

## Operator workflow

1. Previewだけ CAMELLIA_PLACE_ENABLED=true / VITE_PLACE_ENABLED=true と正しいserver資格情報を準備。Productionはfalseのまま。security/firestore.indexes.jsonのplaces(status,slug)とplace_saves(saved,slug)を運営がレビュー。Rulesは既存のserver-only namespaceと本人データ境界を維持。
2. 信頼できる運営者へ専用claim camelliaPlaceOperator、または専用camelliaAdminを付与。管理者が承認後 `node scripts/place-operator.mjs --grant <UID>` を実行可能。ビルド・アプリ・今回作業では実行しない。認証し直して権限を更新。
3. 実在・住所・公式情報・写真の権利を確認した場所のJSONを、本人の認証付きPOSTへ送る。`{operation:"save",place:{slug,name,category,region,area,address,officialUrl,imageUrls,...}}`。statusを指定してもdraftになり、直接公開できない。シークレット/tokenをGit・チャット・スクリーンショットへ出さない。
4. 運営画面の「draft / reviewを確認する」で詳細・写真・リンクをプレビュー。APIでもGET ?operator=1&slug=...を利用可能。
5. submitでreviewへ。確認した担当者だけpublishを実行（verified:true、提携はpartnerConfirmed:true）。公式URL・住所・写真が不足すると公開拒否。営業・価格・写真・提携許可の証拠は運営が別途保管する。
6. 変更はsaveでdraftへ戻し、再review。掲載停止はsuspend。全変更はplace_auditに担当者・操作・日時・確認フラグを記録。

共有URLは `/?open=place&place={公開slug}`。認証前の公開slugだけを30分保存し、ログイン後に戻します。共有URLへ認証IDやCheckを入れません。

## Acceptance

lint/typecheck/unit/buildとエミュレータ、5幅のlocal fixtureを別々に記録します。最低1件の実在場所を運営が確認してPreview公開し、実写真・リンク・保存/別端末・削除を確認するまで公開可とは判定しません。CLIや固定fixtureのpublish成功は実在Place公開の証明ではありません。

## 説明用デモ（本人の追加要望）

`/?open=place-demo` はログイン不要の読み取り専用デモ。3つの架空例を「デモ・実在の掲載ではない」と常時明示し、参考写真の意味も説明します。予約/地図/保存/店舗への送信/Place analyticsは動かしません。APIやFirestoreへデータを投入せず、status=draft・公式URL空の別ファイル data/place-demo.ts から表示します。後から同ファイルを編集できます。実在Place公開とは別で、REAL PUBLISHED PLACE PASSの件数には数えません。

デモ追加の検証：実際のapp/page入口を未ログイン・認証/API差し替えなしでChromium375/390/412/768/1280から開き、3例の一覧、カテゴリ絞り込み、詳細URL再読み込み、外部リンク/保存操作なし、Place API通信0を確認。参照写真の配信先はこの実行環境でブロックされるため、写真の実表示は本人のPreview確認が必要です。
