# ID取得後の無料AI上限 — 2026-11-19

監査で、登録不要の会話は日30回だが、ID取得後の無料会話には短時間レート制限だけがある差分を確認。確定仕様「無料AI日30回」をID取得後にも接続する。

- ID取得前: 既存の署名付きHttpOnly端末cookie＋通信元ハッシュの日次台帳を維持。
- ID取得後の無料: verified UIDのSHA256とJST日付のサーバー専用台帳をtransactionで更新。30回を超えるprovider dispatchを拒否。YURA/Lactone/thread切替で増えない。
- Plus: 未決定の日次上限・文脈範囲を新たに決定しない。既存の検証済みPlus権利と共有burst limitを維持。紹介の専用laneは別の承認済み予算・枠で検証する。
- 同時更新でABORTEDになった場合は空き枠と誤認せず拒否。日次上限と通信・混雑を分け、上限時は翌日JST午前0時に再開できると案内する。Plus購入へ強制誘導しない。
- 危険な内容への既存安全応答はproviderを呼ばず、日次枠より前の共通Safety境界を維持。
- IDごと/端末・通信元ごとの技術的上限であり、物理的な1人の厳密識別ではない。複数ID、登録前後の台帳切替、共有Wi-Fiには限界がある。勝手なアカウント統合や端末指紋を導入しない。
- 日付を変えた論理リセットと台帳の物理削除は別。期限フィールドだけで削除済みとはしない。承認済みcleanupのallowlistへ日次台帳/決済rate windowを加えるが、保存期間未設定では削除を開始しない。

検証: lint/typecheck、unit71/71、Firestore emulator19 scripts、Production相当build PASS。35並列で上限を超えないこと、競合後の残枠利用、JST日付切替、偽Plusの拒否、既存Plus/削除lock、上限時のprovider呼出0を確認。Googleへの生成依頼、本番利用者の枠消費、Production反映は行っていない。
