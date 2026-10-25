# Analytics 全イベント棚卸し（2026-10-21）

検査対象は今回のbranch。到達欄はコード経路を意味し、実PostHog着信の証明ではありません。全行で共通のallowlist・URL除去・DNT・HTTP receipt/再送を通過します。project 594848接続後、指定の既存4 Insight（初回体験/Fortune/Check Retention/利用パターン別DAU）の実定義と照合しました。Dashboard欄はこの4件に限定し、他の未取得Insightでの利用まで否定しません。着信ありの記載は10月15〜22日のProduction/固定Previewでの存在確認で、既存実装の交通を含みます。本文/個人名/生UIDを送らない境界を単体テストし、Today・Fortune・Conversation・Discover・Treeの一部を実SDKのローカルブラウザでも確認します。

| Event | 発火元 | 条件・重複防止 | 固有プロパティ（値も制限） | 到達経路 / Privacy | 既存4 Insight |
|---|---|---|---|---|---|
| place_view | `screens/PlaceScreen.tsx:82`<br>`screens/PlaceScreen.tsx:107` | 実在Place詳細表示。demoでは送らない | place_id | 実装経路あり / allowlist / 今回の実着信は未検証 | 指定4件で未使用 |
| place_save | `screens/PlaceScreen.tsx:305` | 保存操作成功後。demoでは送らない | place_id | 実装経路あり / allowlist / 今回の実着信は未検証 | 指定4件で未使用 |
| place_external_open | `screens/PlaceScreen.tsx:262`<br>`screens/PlaceScreen.tsx:267` | 公式/Instagramリンク押下。URLは送らない | place_id | 実装経路あり / allowlist / 今回の実着信は未検証 | 指定4件で未使用 |
| place_booking_open | `screens/PlaceScreen.tsx:272` | 予約リンク押下。URLは送らない | place_id | 実装経路あり / allowlist / 今回の実着信は未検証 | 指定4件で未使用 |
| place_map_open | `screens/PlaceScreen.tsx:277` | 地図リンク押下。位置情報は送らない | place_id | 実装経路あり / allowlist / 今回の実着信は未検証 | 指定4件で未使用 |
| circle_view | `screens/CircleScreen.tsx:126`<br>`screens/CircleScreen.tsx:130`<br>`screens/CircleScreen.tsx:177` | 一覧/詳細を表示。再取得/既存重複防止あり | circle_id, days_since_join | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| circle_join | `screens/CircleScreen.tsx:861` | serverで参加成功後 | circle_id | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| circle_leave | `screens/CircleScreen.tsx:984` | serverで退出成功後 | circle_id | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| circle_post_create | `screens/CircleScreen.tsx:346` | serverで投稿成功後 | circle_id | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| circle_comment_create | `screens/CircleScreen.tsx:346` | serverでコメント成功後 | circle_id | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| circle_reaction | `screens/CircleScreen.tsx:401` | serverでリアクション操作成功後 | circle_id | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| circle_report | `screens/CircleScreen.tsx:1010` | serverで通報成功後 | circle_id | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| circle_block | `screens/CircleScreen.tsx:464` | serverでブロック成功後 | なし | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| session_start | `hooks/useCamelliaStore.ts:60`<br>`hooks/useCamelliaStore.ts:71` | タブ/プロフィールごと。30分無操作またはJST日付変更で更新 | なし | 実装経路あり / allowlist / 本人Preview実着信PASS | 初回体験① / Retention復帰 / DAU |
| welcome_view | `app/page.tsx:106` | Welcome表示、タブ内で重複防止 | period | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| welcome_continue | `app/page.tsx:190` | Welcomeの開始ボタン | period | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| login_view | `app/page.tsx:110` | ログイン画面の表示、タブ内で重複防止 | authenticated | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| login_success | `app/page.tsx:165` | 認証成功後、復元済みprofileへ帰属 | method, needs_profile | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| login_skip | 現行callerなし | 定義のみ。現行UIに発火元なし | なし | 未使用 / allowlist | 指定4件で未使用 |
| profile_view | `app/page.tsx:118` | 初回プロフィール入力の表示、セッション内1回 | なし | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| profile_complete | `app/page.tsx:192` | 初回プロフィールを完了 | なし | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| auth_method_selected | `app/page.tsx:191` | LINE/Google/SchoolParkを選択 | method, auth_method | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| auth_returned | `app/page.tsx:152`<br>`app/page.tsx:163`<br>`app/page.tsx:191` | 認証から復帰。成功時は記録復元完了後 | method, auth_flow | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| login_failure | `app/page.tsx:153`<br>`app/page.tsx:191` | 許可した認証失敗カテゴリのみ | method, stage, reason | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| conversation_starter_selected | `screens/CamelliaScreen.tsx:268` | 許可したきっかけを押す | starter_id | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| conversation_open | `screens/CamelliaScreen.tsx:122` | 会話thread表示、状態確認後にセッション内1回 | provider, model_id | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| conversation_message_sent | `screens/CamelliaScreen.tsx:163` | 明示送信時の選択モデル。本文なし | provider, model_id | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| conversation_response_received | `screens/CamelliaScreen.tsx:199`<br>`screens/CamelliaScreen.tsx:221` | 返答を受信。再試行も対象、基盤/選択モデル/時間のみ | provider, response_time_ms, model_id | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| conversation_error | `screens/CamelliaScreen.tsx:186`<br>`screens/CamelliaScreen.tsx:225` | 許可した失敗カテゴリ。本文や例外文字列なし | provider, error_category, model_id | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| conversation_model_selected | `screens/CamelliaScreen.tsx:134` | 上部selectorで明示選択 | model_id | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| conversation_model_switched | `screens/CamelliaScreen.tsx:135` | 本文のあるthreadで別modelを明示選択 | model_id, from_model, to_model | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| conversation_reaction_shown | `screens/CamelliaScreen.tsx` | YURA／Lactone が彼女のメッセージにリアクションを付けたとき（送信直後・返事の前。2026-10-25追加） | reaction（heart/smile/clap/thumbs/cry）, model_id | 実装経路あり / allowlist / 未着信。メッセージ本文は送らない | 指定4件で未使用 |
| character_profile_open | `screens/CamelliaScreen.tsx` | 会話の上のキャラクターをタップしてプロフィールを開いた（2026-10-25追加） | model_id | 実装経路あり / allowlist / 未着信 | 指定4件で未使用 |
| character_renamed | `screens/CamelliaScreen.tsx` | プロフィールからキャラクターの名前を保存・初期名に戻した | custom_name（初期名以外か。名前そのものは送らない） | 実装経路あり / allowlist / 未着信 | 指定4件で未使用 |
| account_link_started | `components/AccountSettings.tsx:44`<br>`components/AccountSettings.tsx:56` | ログイン方法の連携開始 | auth_method | 実装経路あり / allowlist / 今回の実着信は未検証 | 指定4件で未使用 |
| account_link_success | `app/page.tsx:164`<br>`components/AccountSettings.tsx:63` | ログイン方法の連携成功 | auth_method | 実装経路あり / allowlist / 今回の実着信は未検証 | 指定4件で未使用 |
| discover_view | `screens/DiscoverScreen.tsx:15` | Discoverへの訪問、マウント内1回 | なし | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| check_view | `hooks/useCamelliaStore.ts:75` | Today訪問1回。同じ画面に滞在して新セッションになった場合も1回 | なし | 実装経路あり / allowlist / 本人Preview実着信PASS | 初回体験② |
| check_start | `hooks/useCamelliaStore.ts:80` | 気分の最初の選択。進行中は重複させず、完了後の選び直し/新セッションは再計測 | なし | 実装経路あり / allowlist / 本人Preview実着信PASS | 初回体験③ |
| check_complete | `hooks/useCamelliaStore.ts:85` | Check保存成功。hasDetailsの真偽のみ | hasDetails | 実装経路あり / allowlist / 本人Preview実着信PASS | 初回体験④ / Retention開始 |
| daily_reflection_view | `screens/TodayScreen.tsx:153`<br>`screens/TodayScreenClassic.tsx:149` | Today振り返りの表示、段階別の既存重複防止 | reflection_stage, history_days | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| weekly_insight_view | `screens/TodayScreen.tsx:154`<br>`screens/TodayScreenClassic.tsx:154` | 週の振り返りの表示 | history_days | 実装経路あり / allowlist / 今回の実着信は未検証 | 指定4件で未使用 |
| fortune_open | `app/page.tsx:317` | 今日の一枚への入口を押す | なし | 実装経路あり / allowlist / 実着信あり（既存含む） | 初回体験⑤ / Fortune① |
| fortune_draw | `screens/FortuneScreen.tsx:85` | Check済み/JST当日1枚を引く。二重タップ防止 | cardId | 実装経路あり / allowlist / 実着信あり（既存含む） | 初回体験⑥ / Fortune② |
| fortune_complete | `screens/FortuneScreen.tsx:89` | drawと同時に既存互換の完了を記録 | cardId | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| fortune_action_selected | `screens/FortuneScreen.tsx:175` | Fortune結果の既存Actionを押す | actionId | 実装経路あり / allowlist / 実着信あり（既存含む） | 初回体験⑦ / Fortune③ |
| fortune_skip | `screens/FortuneScreen.tsx:85` | カードを引かない選択 | cardId | 実装経路あり / allowlist / 今回の実着信は未検証 | 指定4件で未使用 |
| fortune_reflect | `screens/FortuneScreen.tsx:64` | yes/some/noの回答のみ | value | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| tree_open | `app/page.tsx:321`<br>`app/page.tsx:369` | My/TodayからMy Treeを開く | なし | 実装経路あり / allowlist / 実着信あり（既存含む） | 指定4件で未使用 |
| tree_add_start | `screens/TreeScreen.tsx:28` | 人物追加を開く | なし | 実装経路あり / allowlist / 今回の実着信は未検証 | 指定4件で未使用 |
| tree_add_complete | `hooks/useCamelliaStore.ts:99` | 葉を追加。category/tagCountのみ | category, tagCount | 実装経路あり / allowlist / 今回の実着信は未検証 | 指定4件で未使用 |
| tree_leaf_open | `screens/TreeScreen.tsx:23` | 葉を開く。経過日数のみ | leafAgeDays | 実装経路あり / allowlist / 今回の実着信は未検証 | 指定4件で未使用 |
| tree_leaf_edit | `screens/TreeScreen.tsx:26` | 葉の編集を保存 | なし | 実装経路あり / allowlist / 今回の実着信は未検証 | 指定4件で未使用 |
| tree_reflection_add | `hooks/useCamelliaStore.ts:103` | 本人が振り返りを保存。本文なし | なし | 実装経路あり / allowlist / 今回の実着信は未検証 | 指定4件で未使用 |
| tree_archive | `screens/TreeScreen.tsx:34` | 思い出の葉へ変更 | なし | 実装経路あり / allowlist / 今回の実着信は未検証 | 指定4件で未使用 |
| invite_view | `screens/InviteScreen.tsx` | 招待コード入力画面の表示（2026-10-24追加）。セッション内1回 | from_link（リンクのコードが入っているか） | 実装経路あり / allowlist / 未着信。コード本体は送らない | 指定4件で未使用 |
| invite_submit | `app/page.tsx`（リンクのコード）<br>`screens/InviteScreen.tsx`（入力） | 招待コードを確かめた結果 | result（accepted/already/not_found/used_up/expired/revoked/own/invalid/rate_limited/suspended/error）, from_link | 実装経路あり / allowlist / 未着信。コード本体は送らない | 指定4件で未使用 |
| invite_accepted | `app/page.tsx` | 招待コードで入れたとき | invite_kind（operator/member）, invite_channel（運営が付けた配り先名。英字で始まり数字7連続なし。利用者の招待は無し） | 実装経路あり / allowlist / 未着信 | 指定4件で未使用 |
| access_suspended_view | `screens/InviteScreen.tsx` | 利用停止の画面の表示。セッション内1回 | なし | 実装経路あり / allowlist / 未着信 | 指定4件で未使用 |
| member_invite_open | `components/MemberInvite.tsx` | Myで自分の招待コードを表示・作成。セッション内1回 | なし | 実装経路あり / allowlist / 未着信。コード本体は送らない | 指定4件で未使用 |
| member_invite_share | `components/MemberInvite.tsx` | 招待を共有・コピー | share_method（share/copy） | 実装経路あり / allowlist / 未着信 | 指定4件で未使用 |

共通項目: UTM（文字種制限）、$insert_id、event_schema=1、app_version=beta-v3、usage_cohort、機能利用有無の真偽、$process_person_profile=false。匿名のprofile由来distinct_idと限定したSDK端末/ページ情報も付与。sessionIdは端末内の重複防止専用で外部送信しません。

定義合計: 52。login_skipは現行callerなしであり、計測できたことにしません。
