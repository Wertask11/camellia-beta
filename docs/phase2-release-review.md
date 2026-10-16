# Camellia Phase 2 実装・公開判定（2026-10-16）

## 最初に見るもの

各変更は最新main `03ff2cc52b3d1292e47eb776499d99a010786127`（Phase 1 #31 merge後）を基点とする独立PRです。main・Production設定・Firestore Rules・実ユーザーclaimは変更していません。force pushなし。他作業者の変更を削除していません。

Placeは本人の追加要望により、**ログイン不要の説明用デモ3例**を残しました。`/?open=place-demo` で開きます。実在の掲載とは常時区別し、予約・地図・保存・API登録を行いません。後から `data/place-demo.ts` を編集できます。実在の確認済み場所は別の運営公開フローを使います。

確認用に全変更を組み合わせた `codex/camellia-phase2-preview-20261016` branchも用意しています。これは統合確認用で、巨大な追加PRや本番mergeの代わりではありません。個別PRのmerge順序では共通ファイルの調整が必要です。統合branchに、その調整と検証結果を記録しています。

**現時点の判定は正式リリース NOT READY。実装とローカル検証は進みましたが、実ユーザー・実Gemini・実在PlaceのGateは未達です。** ローカルfixture・エミュレータ・Vercel build成功を、実利用の成功とは扱いません。

## Branch / commit / PR / Preview

|変更|branch|commit|PR|Preview（Vercel build成功）|
|---|---|---|---|---|
|Discover写真|`codex/camellia-discover-photos-20261016`|`3fbfb787dd2161881d83e3c27be27818162f05ff`|[#32](https://github.com/Wertask11/camellia-beta/pull/32)|https://camellia-beta-dbv12mewv-school-park.vercel.app|
|2A Circle|`codex/camellia-phase2a-circle-20261016`|`903d4976f21d064ce109f7026899244372e87c0c`|[#33 Draft](https://github.com/Wertask11/camellia-beta/pull/33)|https://camellia-beta-dzudj7u0u-school-park.vercel.app|
|2B Conversation|`codex/camellia-phase2b-conversation-20261016`|`b64ce0dbb0ef544a446c96f68deeb28001649c64`|[#34 Draft](https://github.com/Wertask11/camellia-beta/pull/34)|https://camellia-beta-1xohr8fx5-school-park.vercel.app|
|2C Place / デモ|`codex/camellia-phase2c-place-20261016`|`e76c1d4d41a969f4542aecccbb1c63b88140ef59`|[#35 Draft](https://github.com/Wertask11/camellia-beta/pull/35)|https://camellia-beta-36eohjhuq-school-park.vercel.app|
|2D My / Tree / Insight|`codex/camellia-phase2d-reflection-20261016`|`cbfccb7217abaa7725925bc8534ca41b24e01f46`|[#36 Draft](https://github.com/Wertask11/camellia-beta/pull/36)|https://camellia-beta-1o7gnd8pt-school-park.vercel.app|

## 本人の確認はスマホとパソコンでできる

- Placeのイメージ：上記Place Previewに `/?open=place-demo` を付けて開く。ログイン不要。写真・一覧・カテゴリ・詳細を確認する。写真は参考画像で実在掲載先ではありません。
- Circleの相互操作：**スマホとPCで別々のCamelliaアカウント**を使う。Aが参加→投稿→コメント→Reaction。Bが参加→Aの投稿を見る→コメント→Reaction→通報→Block→非表示→解除。A/Bそれぞれ編集・削除・退出後の削除も確認する。同じアカウント2台では同期の確認ができますが、相手との権限・Block確認にはなりません。
- 運営担当者は通報一覧でdismissとremoveを別々の対象に実施し、対象内容と対応記録を確認する。これはユーザー2人の操作とは別に必要です。
- Conversation：仕事のミス→今は聞いてほしい→別の話題、など30ケースを現threadで確認し、内容を拾うか、質問過多でないか、許可したActionだけを表示するかを評価する。失敗表示や固定ローカル応答を成功に数えない。
- 同じ本人の2台で既存記録・会話・Tree・Place保存を確認する。データ削除の実確認は既存の大切な記録を使わず、本人が管理するテストアカウントで行う。

Circle / 実PlaceのPreview環境準備は運営設定が必要です。今回の実行環境にはVercel管理資格情報・Gemini key・Firebase Admin資格情報がなく、本人ブラウザのログインも共有されていません。Previewドメインと写真配信先へのアクセスも実行環境のネットワーク許可で拒否されました。設定済みと推測して進めたり、認証を偽装して公開済み扱いにはしていません。

## 要求された55項目

|番号|項目|結果・証拠・限界|
|---|---|---|
|1|Camellia総合判定|**NOT READY（正式リリース）**。4独立PRと写真PRを作成。Productionは変更なし。実環境Gateは未完了。|
|2|Phase 2A Circle|**NOT READY**。コード・エミュレータ・UI検証済み。実2アカウント・運営処理のGateが残る。|
|3|Phase 2B Conversation|**NOT READY**。v2コード・安全境界・ローカル履歴UI検証済み。LIVE GEMINI PASS未取得。|
|4|Phase 2C Place|**NOT READY（実在Place公開）**。運営公開・保存基盤あり。本人要望の読み取り専用デモ3例あり。実在公開0件。|
|5|Phase 2D My / Tree / Insight|**NOT READY（総合公開判定）**。実装・ローカル検証済み。既存/新規認証・複数端末・削除の実確認が残る。|
|6|各branch|上記表。全てPhase1後の最新mainが基点。統合確認専用branchを別途作成。|
|7|各commit|上記表。全commitは通常push。未コミットのユーザー変更を巻き戻していない。|
|8|各PR|#32〜#36。2A〜2Dはlive Gate未達を明示したDraft、全てbase main。mergeしていない。|
|9|各Preview URL|上記表。ビルド成功のURLであり、この実行環境から認証後の画面を操作した証拠ではない。|
|10|Circle完成機能|6テーマ、一覧/説明/参加人数/参加中、参加/退出/My参加中、投稿・コメントの作成/編集/削除、3Reactionと選択保持、通報、Block/解除、Moderator処理/対応記録、Guidelines、公開slugリンク、20件ページ送り。古い投稿への操作も直近Feed件数に依存しない。|
|11|Circle Security|既存server基盤を再利用。verified token/本人所有/参加をserverで確認。protected namespaceへ直接client書込不可。公開IDは署名に基づく別名、raw UID/LINE/Google/Passportや個人記録を公開しない。通報は同一対象で重複保存せず新規対象数を制限。実deployed Rules/indexは運営確認が必要。|
|12|Circle Moderation|専用camelliaModerator/camelliaAdmin claimのみ。Report対象・public author ID・理由・日時、dismiss/remove、任意対応メモとaudit。競合再処理は409。一般admin名/body指定では権限を得られない。CLIは用意したが実claimは未付与。User suspensionは今回含めない。|
|13|Community Guidelines|専用Guidelinesで誹謗中傷/晒し/性嫌がらせ/出会い目的接触/営業/宗教投資勧誘/差別/危険推奨/医療デマ/診断/自傷推奨/違法と、相手の状態を決めつけない原則を明記。|
|14|Circle 2-user test|**未実施（実アカウント）**。エミュレータの別ユーザー権限・Block等とローカル画面検証はPASSだが代替にしない。スマホ/PCの別アカウント＋運営担当者の確認手順を上記に記載。|
|15|Conversation Before / After|既存Library/thread/search/retryを維持。Library30件、thread40メッセージごとの表示。既存履歴は消去/自動分割しない。本人の言葉を明示プレビューしてMemory保存。server6候補から最大1Action cardを表示し実Actionへ移動、dismiss可。|
|16|Live Gemini test|**未実施**。key/本人認証にアクセス不可。公式@google/genai、既定gemini-3.8-flash / fallback gemini-3.1-flash-liteを既存baselineから維持。ProductionのGETがenabled=trueであっても生成成功には数えない。|
|17|Conversation quality evaluation|30ケースをJSONで作成。疲れ/仕事/関係/喜び/恋愛/孤独/怒り/不安/生活/医療/薬/自傷/暴力/緊急等。具体性・自然さ・押し付けなさ・短さ・らしさ・安全性の評価軸。全件liveResult=UNVERIFIED。固定応答で30件PASSとは報告しない。|
|18|Place architecture|`/api/camellia/place`。server-only掲載catalogと個人place_savesを分離。一般GETはpublishedのみ。draft→review→published / suspended、operator claim、audit、20件ページ、手動地域/カテゴリ/過ごし方、位置取得なし。デモは別静的dataでAPI/Firestoreを使わない。|
|19|登録済み実在Place件数|**0件**。本人に実在候補がないため架空店舗を実在掲載として登録していない。説明用デモ3例は件数に含めない。|
|20|Place operator workflow|専用camelliaPlaceOperator/camelliaAdmin。運営endpointでdraft登録→運営詳細プレビュー→review→実在/公式/住所/写真権利/提携を確認→publish。必要情報なしでは拒否。編集はdraftへ戻し再確認。変更は監査。手順 docs/place-mvp.md。|
|21|partner / sponsored|partnerは担当者の明示確認が必要。SponsoredはPR・広告と表示し通常候補と別section。支払いに応じた通常おすすめ順位変更なし。店舗へCheck/会話/個人状態を渡さない。|
|22|My Tree Before / After|既存人物/関係/意味タグ/編集削除を維持。最近の葉/本人の振り返り/複数葉の意味タグ、更新日、任意のReflectionきっかけ。点数・心理断定・Reminderなし。既存reflection.textへ保存、Gemini/Circleへ自動送信なし。|
|23|My Before / After|最近の私/今週/Insight/Tree/Memory/やったこと/保存を上へ、profileは折りたたみ、Account/Privacy/削除は下へ。参加Circle/保存Place入口。本人JSON exportに含む/含まない情報を明記。|
|24|Insight Before / After|対象期間/根拠件数/事実/仮説を分離。少なくとも4観測、睡眠事実は4日以上。少数時は十分でないと表示、未来記録を除外。否定feedbackが翌日の同パターンにも継承。月経情報不使用。因果・健康診断なし。|
|25|Today regression|One Flow/昨日/最近/週/Actionは作り直さず既存回帰suite PASS。5幅Todayコンポーネント PASS。実ユーザー翌日継続の長期確認は未実施。|
|26|Discover regression|写真へ戻す独立#32。旧14枚を復元、拡張候補はカテゴリ写真を利用。Action/入口の5幅操作 PASS。外部写真の実取得はネットワーク制限により未検証、本人端末で要確認。|
|27|Fortune regression|Check後・JST1日1枚・Reflectionの既存仕様を変更しない。日付等の回帰suite PASS。実端末の翌日境界は未実施。|
|28|LINE|認証方式は維持。public slugへの戻り先を30分保持、秘密IDをURLへ入れない。callback回帰PASS。新PreviewドメインのLINE callback登録/実ログインは未検証。|
|29|Google|既存方式維持、callback/restore suite PASS。新Preview authorized domain・実ログインは未検証。|
|30|SchoolPark|既存Passport/連携データ境界を維持。既存sync/auth suite PASS。実既存アカウント復元は未検証。|
|31|Firestore Sync|v3既存個人archiveを変更せず、Place保存だけ別collection。削除対象にplace_savesを追加。エミュレータと既存sync tests PASS。実複数端末・account conflictは未検証。|
|32|Delete|既存方針を維持：個人記録/会話/Tree/新Place保存を本人手順で削除、Circle本文はCircle内で本人が削除。Circle通報/運営監査/Place掲載情報を一括自動削除する新方針は選んでいない。画面/Privacy/Termsと整合。実アカウントでの削除は未実施。|
|33|Privacy|Circle公開本文・公開別名・Block/Report・運営閲覧、Place外部リンク/写真/広告/保存、Tree/Insight、個人削除対象を更新。PostHog identityは実コードどおりprofile由来の乱数IDの変換で端末間継承され得ると修正。会話/Tree本文を分析へ送らない。|
|34|Terms|Community/運営対応・Place掲載/外部リンク/PR広告・削除の適用範囲と実装を整合。実在確認/写真権利の担当運用は公開前に必要。|
|35|PostHog|Circle8イベント＋join後のJST days_since_joinでD1/D7分析可。Place5イベントは公開slugのみ。会話/Tree/Circle本文・名前・UID・URL・Checkを送信しないallowlist regression PASS。実プロジェクト受信/コホート作成は未確認。|
|36|Shared Rate Limit|Phase1のFirestore原子処理を再利用、別client並行budgetをエミュレータでPASS。Production GETはrateLimitMode=instanceで、共有PASSとは判定不可。運営がAdmin資格情報とCAMELLIA_SHARED_RATE_LIMIT_REQUIRED=trueを設定し実確認するまでGate未達。|
|37|Performance|Circle/Place20件、Library30件、会話40件のページ表示。写真lazy loading/async decode、Place詳細aspect ratioで領域確保。統合client全JSは1,483,700 bytes / gzip 444,824 bytes（全9ファイルの合計、初期転送量そのものではない）、500KB超chunk警告あり。Lighthouse/実モバイル通信/実Firestore read費用は未計測。初期chunk分割は残課題。|
|38|375|ローカルChromium：Today/Discover/Action、Circle、会話Library/80履歴、My/Tree、Place実装fixture・公開デモ PASS。写真配信/実認証は未確認。|
|39|390|同上PASS。横overflow/JS errorなし。|
|40|412|同上PASS。横overflow/JS errorなし。|
|41|768|同上PASS。横overflow/JS errorなし。|
|42|1280|同上PASS。横overflow/JS errorなし。|
|43|lint|各PRと統合状態 PASS。|
|44|typecheck|各PRと統合状態 PASS。|
|45|all tests|統合29/29 suites PASS（Gemini境界88ケース含む）、Circle/共有制限Firestore27 checks、Place emulator7 checks PASS。デモ追加のPlace validationもPASS。テスト資格情報はdemoローカルのみ。|
|46|build|各PRのlocal build / Vercel build PASS。デモ追加後の統合最終buildもPASS。Productionへは反映していない。|
|47|P0|確認済みのデータ消失・権限漏洩P0は0件。未実施の実環境確認があるため「全環境でP0=0確認済み」とは言わない。|
|48|P1|確認済みローカル機能のP1不具合は0件。公開を止める未完了Gate：実Circle2-user/Moderation、実Gemini30/共有制限、実在Place、実Auth/Sync/Delete。未実施のため正式P1=0認定はしない。|
|49|P2|初期chunk改善、写真配信の実視確認、Place filterは読み込み済みページのみ、Circle block後に空page＋次pageとなる場合あり、個人exportはCircle/サーバーPlace保存を含まない。|
|50|正式リリースまで残ること|上記live Gate、実ドメインで5幅/キーボード/タッチ/スクリーンリーダー、実モデル待ち時間/障害/価格Privacy方針、運営担当・対応体制、実写真権利/掲載内容、複数端末/削除。Gate合格後に個別PRレビュー/merge/Production反映を本人が承認。|
|51|Circleを宣伝してよいか|**いいえ**。OPEN READY未取得。実2-user＋運営処理が通ってから。|
|52|Camellia会話を宣伝してよいか|**新v2品質の保証としてはまだ不可**。LIVE GEMINI/30品質/実障害確認が必要。現在Productionの存在と新v2の公開を混同しない。|
|53|Placeを宣伝してよいか|**実在場所サービスとしては不可**。本人要望の「デモ・掲載イメージ」と明示した紹介は可能。実在公開0件、予約機能なし。|
|54|Production公開に必要な本人作業|下記の段階的手順。今回はProduction flag/Rules/claimsを変更していない。すべてのGate前に本番ONを依頼しない。|
|55|次に撮る宣伝動画3本|下記。実画面で15〜30秒。Circle/会話はlive Gate合格後、Placeは当面デモ明示で撮影。|

## 運営設定と公開前の順序

1. [Vercel環境変数](https://vercel.com/school-park/camellia-beta/settings/environment-variables)で**Preview**だけ準備する。既存のGemini key/model/data policyに加え、server-only `FIREBASE_SERVICE_ACCOUNT_JSON`、32文字以上の安定した `CAMELLIA_CIRCLE_SIGNING_SECRET`、`CAMELLIA_SHARED_RATE_LIMIT_REQUIRED=true`。秘密値はチャットへ送らず、`VITE_`へ付けない。
2. CircleのPreviewだけ `CAMELLIA_CIRCLE_ENABLED=true` と `VITE_CIRCLE_ENABLED=true`、実Place検証時だけ `CAMELLIA_PLACE_ENABLED=true` と `VITE_PLACE_ENABLED=true`。再deploy。説明用Placeデモにはこれらのflagや運営権限は不要。
3. 実際にdeployedされているFirestore Rulesと複合indexをFirebase担当者が確認する。`security/firestore.indexes.json`は確認用。SchoolPark既存Rulesへテスト用snapshotを上書きしない。**今回Rules deployなし**。
4. 信頼できる運営担当者への専用claimは本人承認後に担当者が設定する。手順は `docs/circle-phase2a.md` / `docs/place-mvp.md`。**今回claim付与なし**。
5. Previewの実ドメインをLINE callback/Firebase Google authorized domainsへ必要に応じ登録し、本人が実ログインする。スマホ/PCで上記操作を行う。実在Placeが用意できるまではデモのみ確認する。
6. 実Gemini30件、障害/再試行、shared limit、Circle運営、Auth/Sync/Delete、実写真/リンクをPASSした結果を記録する。全GateがPASSした時点で、各PRのmergeとProduction環境/公開flagの具体的変更内容を提示し、本人承認を待つ。

## 15〜30秒の実画面動画

1. **Circle「同じ気持ちの人と」**：Discover入口→テーマ→参加→本人が書いた短い投稿→相手のやさしいReaction。実名/他人の本文を映さず、許可したテストアカウントで撮る。OPEN READY後。
2. **Camellia「今日の続きから話す」**：TodayのCheck→Camelliaで新しい会話→仕事の一言→具体的な短い返答→本人が希望した場合だけActionへ。履歴一覧への戻りも映す。LIVE GEMINI合格後。
3. **Place「過ごし方から選ぶ」**：当面は画面の「デモ・掲載イメージ」を映したまま→カテゴリ→詳細写真/説明。予約/実店舗の紹介と誤認させない。実在掲載後は実写真/公式情報→地図または予約の導線を、掲載許可確認後に撮る。

## 検証の範囲

ローカルUIのCircle/Placeは明示したfixture、Firestoreはdemo emulatorです。公開Placeデモだけは実app入口を未ログイン・API/認証の差し替えなしで5幅確認し、Place API通信0を確認しました。外部通信を遮断しているので写真配信成功・実認証の証明にはしません。実アカウントの作成・tokenの偽造・秘密情報のcommitはしていません。

統合最終client bundle検査：Gemini key変数名、Firebase Admin資格情報変数名、秘密鍵マーカー、system prompt/Action指示のマーカーは各0件。公開Firebase client configは秘密鍵とは別です。PII/analytics境界は回帰テスト済みですが、実ユーザーtoken付き通信の検査は本人確認時に必要です。
