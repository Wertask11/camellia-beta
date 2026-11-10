# 計測の整理と実確認範囲

PostHogスキルを使用。本人指定のproject594848を接続先として読み、既存「Camellia 初回体験ファネル」（26TwFhaG）の定義を確認した。既存7段階session_start → check_view → check_start → check_complete → fortune_open → fortune_draw → fortune_action_selected、1日windowを維持。既存insight・filter・flagは変更していない。

既存URL：https://us.posthog.com/project/594848/insights/26TwFhaG

## 今回追加／維持したイベント

- `guest_choices_saved`：Checkをしなかった選択保存。Check完了イベントを仮装しない。
- `experience_feedback`：`helpful / okay / not_for_me`、`experience_status`、demo/publishedだけ。本文は送らない。
- `circle_place_open`：公開Circle/Place IDのみ。
- `place_contact_open`：公開Place IDのみ。
- 既存の `session_start/check_*/conversation_*/discover_*/place_*/my_view/save_prompt_view/auth_method_selected/login_success/guest_check_saved/plus_*` を再利用。
- 紹介・通知配信・決済・共有送信を開始していないので、成功イベントを仮造しない。`plus_complete` は支払い未提供のため発生させない。

## KPI定義（まだ運営承認済みの数値基準・実測値ではない）

`lib/analytics/quality-kpis.ts`に既存命名の導線を整理。中心は本人の体験価値の回答。無回答を否定と扱わず、自己申告・デモと検証済み来店を区別する。

Check任意の発見導線、Checkあり導線、Circle→Place、Checkなし保存／Checkあり保存、Plusの各funnelを分離。全利用者にCheck完了を要求する単一funnelへ変更しない。本文、名前、会話タイトル、共有token、紹介codeを追加しない。既存のランダムなentry_sessionは維持する。

D7/D30は、同じ識別子の日本時間暦日での再利用を定義する。登録済み利用者・匿名のCookie・端末変更を区別し、匿名IDだけの継続をアカウント継続と断定しない。現行projectのtimezoneはUTCで、OS=Linuxを除外するテストfilterがある。日本時間と同じ日として読んだり、すべてのLinuxを検証者と断定したりしない。既存設定の変更はしていない。

## 検証と未確認

- 全54 unit suitesのうち新しいprivacy testで、固定enum、原文・名前・Check・Memory・紹介codeの除外、URL query/hash除去を確認。
- 実Chromium＋実PostHog SDKをローカルで動かし、外部通信をすべて横取り。5幅、503→再読込→online→200、DNT、tracker block、壊れた保存、容量不足を確認。架空の本番着信は送っていない。
- 現在の新イベントは今回のProductionへ未反映。本番着信・D7/D30の実測・本人の体験価値は未確認。新しい保存insightを作ったとは報告しない。コード内の導線定義と実PostHog UIの用意は区別する。
- metric catalogの読取scopeがないため、承認済みKPI定義との照合は未確認。追加の接続・権限依頼で作業を止めず、既存insightとコードで確認できる範囲を記録した。

公式のquery parameters参照：https://posthog.com/docs/api/queries#query-parameters
