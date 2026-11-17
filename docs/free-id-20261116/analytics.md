# 新Free / メールIDの計測仕様

2026-11-17 JST、PostHog Project 594848。既存Insight `26TwFhaG` を読み直し、session_start→check_view→check_start→check_complete→fortune_open→fortune_draw→fortune_action_selected、1日窓、timezone UTCであることを確認。定義は変更していない。新しい実イベントの着信・ファネルは、まだ新コードを固定Previewへ配信していないため未確認。既存の着信や旧コードでの本人確認を新コードの合格に流用しない。

## 分類

- 新規生成イベントのみ `event_schema=2`, `experience_version=free_id_v1`。
- `plan=free|plus` と `id_state=none|obtained|legacy_external` は別軸。Free端末のplanはfree。登録済みのplanは現在UIDのサーバー応答だけで分類し、不明なら省略する。未確認の有料利用者をFreeへ分類しない。
- メール確認・password providerが付いたIDはobtained、既存LINE/Googleはlegacy_external。UIDやメールは送らない。これは「取得経路」ではなくイベント時点でのID状態で、既存IDへのメール追加後はobtainedとなる。
- 属性はイベント発生時に保存し、後日の加入を過去のFreeイベントへ書き戻さない。旧イベントはschema1のまま。
- 分析用のランダムなプロフィールIDは既存仕様。新Freeプロフィールと認証済みの別プロフィールをaliasしない。明示引き継ぎの短期intentに既存のランダムentry_sessionだけを残し、同じ操作の段階を照合する。別人物・別IDの無条件結合は禁止。

## 既存イベントを再利用

session_start、check_view/start/complete、fortune_open/draw/complete、conversation_open/message_sent/response_received/error、discover_view/action_selected、place_recommendation_view/view/selected、circle_*、my_view、experience_feedback、tree_reflection_add、plus_offer_view/start/completeを維持。新しい公開名もCamelliaなのでmelly_*という重複イベントは追加しない。

新規：

| イベント | 成功の意味 |
| --- | --- |
| camellia_id_prompt_view | 任意のID案内を開いた |
| camellia_id_start | メール確認、または旧LINE/Googleを本人が選んだ |
| camellia_id_complete | Firebase認証完了と現在UIDを確認。メールの配送受付では発火しない |
| camellia_id_error | 認証の失敗。自由文・メール・コードは含めない |
| record_transfer_complete | 現在UIDのクラウド内容を照合して控えを解放した |
| record_transfer_error | 引き継ぎ/保存照合の失敗。原本の控えを保護 |
| reflection_saved | 任意の振り返りを保存。評価未回答でも発火。本文は含めない |
| place_comparison_view | 掲載事実の比較、または許可済みPlus比較を表示 |

ID操作の `id_operation=access|link` を分ける。ID完了は既存IDへの再アクセスも含み、新規アカウント人数と同一視しない。linkは取得率の分母・分子から除外する。配信再送は同一UUID/$insert_id/timestampを維持し、HTTP200だけでPostHogで集計済みと報告しない。

## ファネル定義（まだ実測値なし）

- 初回体験：schema2 + session_start→discover_action_selected（Checkを任意にした主要ファネル）。Check経由：check_complete→fortune_draw→discover_action_selectedを別に観察。
- 会話利用：conversation_message_sent、成功はprovider=geminiかつconversation_response_received。端末内の安全応答/fallbackとは区別。
- Place：published/demoを分け、place_recommendation_view→place_view→place_selected。comparisonは別の任意段階。外部リンクはクリックだけで予約/来店/購入ではない。
- ID：camellia_id_prompt_view→start→complete、短期entry_sessionで引継ぎを照合。ID取得前後のdistinct_idは別のままなので、同一人物ファネルを自動統合済みとはしない。複数端末の同じ登録済みプロフィールは従来どおり。
- Plus：plus_offer_view→plus_start→plus_complete。現状決済停止のためstart/completeはUIから発火しない。契約済みの保護された決済処理のoutboxだけが完了を生成できる。
- 体験価値：experience_feedbackのhelpful/okay/not_for_me。未回答を否定に数えない。
- 継続：D1/D7/D30、同一識別子、JST暦日のstart日からそれぞれの暦日のsession_start。各日まで観測期間が満了したcohortだけを分母に含め、重複event UUIDを排除。ID未取得は端末/ブラウザの再利用で、人の厳密な継続率とは断定しない。
- プロジェクトUTCとJSTを混同しない。JST 00:00は前日15:00 UTC。旧Insightは維持し、新ファネルを作る際はschema2、Production `$host=camellia-beta.vercel.app`、demo除外等の条件を明記する。

PostHogのmetric catalogはこの接続にread権限がなく、上記はアプリの新しい計測設計であって既存の承認済み事業指標ではない。実人数・継続率・転換率は作っていない。
