# Web Push検証 — 2026-11-19

- lint/typecheck/Production相当build PASS（最終のstatus投影/worker待機上限後も再実行）
- unit 72/72 PASS
- Firestore emulator全20 scripts PASS。その後、driver attemptの保持承認も必須にし、Web Pushのemulator試験を再実行PASS。最終head全体のCI結果は別途照合。
- 新試験: CommonJSからの実SDK読込、実SDKのAES128GCM/VAPIDリクエスト生成（送信なし）、SSRF/鍵/入力拒否、SWの固定文/固定URL/キャッシュなし。
- emulator: 購読の他人上書き拒否、承認/保持なし停止、並列送信claim、固定payload、サービス受付とOS表示の区別、希望OFFでURL/鍵削除、停止race、404/410、明確な拒否のみ再試行、不明結果の再送禁止。
- Chromium 375/390/412/768/1280: 開くだけではpermission0、本人操作で許可/登録/停止、準備中はpermission0、横overflowなし。新しいstatus/owner/device判定後も再実行PASS。

Auth/Notification/ServiceWorker/PushManager/配信APIはfixture。実OS許可・実購読・実Push・実機表示・Preview受入・Production反映は未実施。鍵/環境変数/cronを設定せず、通知を送っていない。

別途npm production auditで既存React RSC等の脆弱性報告を検出。新Web Pushを原因と断定せず、mainから分離したsecurity修正で調査/対処する。正式リリースの安全性PASSとはしない。
