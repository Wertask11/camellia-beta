# 計測の追加修正（2026-11-18 JST）

判定は引き続き **PARTIAL**。メールID・Android復元・登録不要の両会話の本人報告は既存の証拠として保持する。以下は別sourceでの新しい自動検証であり、実PostHog着信や新たな実認証の合格に読み替えない。

## 調査と改修前後

PostHog 594848の技術照合では、2026-11-17T03:20:48Z〜2026-11-18T01:53:48Zの `experience_version=free_id_v1` に一致する session_start / check_complete / camellia_id_start / camellia_id_complete / record_transfer_complete / conversation_response_received はすべて0件。旧版やホスト不明の着信は、この版の成功に数えていない。healthのactive ingestion_warningは0件、sdk_outdatedが1件で、実装の1.434.2に対し推奨1.450.0。警告は手動dismissしない。SDKの古さを未着信の原因と断定していない。

- `posthog-js` を1.450.0へ固定し、lockfileの関連3パッケージも更新。キー・環境変数・DNT・opt-out・bot filtering・autocapture/replay/flags設定は変更しない。
- 実SDK＋ローカルHTTP受領＋実画面を組み合わせた追加試験で、**認証成功直後の `camellia_id_complete` が届かない**ことを再現した。旧実装ではFreeの計測IDでenqueueした直後にaccount画面の計測IDへ切り替わり、本人確認成功のイベントだけが旧IDのoutboxに残った。引き継ぎ自体は成功しており、記録消失の不具合ではない。
- 認証成功時は、同じタブのsessionStorageへUIDに限定した最小の計測引き継ぎ情報を置く。アカウントの記録を準備し、保存が可能になった後で、当該アカウントのイベント台帳へ同じUUIDを追加する。別UIDは取得できず、イベント内へUIDをコピーしない。保存失敗時には引き継ぎ情報を先に消さない。
- 保存後の一致したイベントだけをacknowledgeする。再読み込みでもUUIDを保ち、既存のHTTP受領/重複排除を利用する。10分を過ぎた計測引き継ぎは利用せず、次回読み取りで除去する。これはFirestore TTLや自動削除ジョブの実績ではない。
- FreeとIDの人物をaliasしない。元のCheckをID取得済みに変更しない。既存のランダムentry_sessionで導線を照合でき、成功は新規アカウント作成の証明ではなく認証成功として扱う。`id_operation=access|link`を許可属性として維持。

## 検証範囲

新しいunitで、同じイベントの再読込、別UID拒否、異なるack拒否、期限/時計逆行、改変された私的属性の除外、ストレージ失敗を検証。実SDKブラウザ試験でメール認証→明示移行→保存確認を結合し、成功イベントのローカルHTTP受領、1件のみの発生、再読込後1件の台帳、ID状態の変化、FreeとIDの非alias、メール/認証URL/UIDの非送信を検証する。

実SDKの5幅試験ではSDK版も照合し、flags/decide/replay等の別経路リクエストが発生していないことを監視。DNTは送信0件。Free/メールIDの5幅操作も再実行。SDKのbot判定を避ける通常ブラウザ模擬は**ローカルfixture限定**で、製品側のbot判定や本人のDNTを回避していない。

実行コマンド・結果は `evidence/analytics-followup-20261118.json`。ローカルHTTP受領は実PostHogの受領ではない。Auth/メール/cloud/Geminiはfixtureで、実ログイン・実メール・本番AI成功とも区別する。

## 残る実環境確認

固定Previewの `?diagnostics=analytics` → My → 動作確認で、本人ブラウザの抑止状態・送信先の一致・直近の送信結果を確認する。今回の全イベント未着信が、SDK・接続・抑止・環境設定のどれによるものかは未特定。SDK更新と上記の限定的な取得成功イベント修正をもって、全着信解決とは報告しない。

Production・main・Rules・claims・キー・環境変数は変更しない。課金・共有送信・紹介・通知の停止も維持。40項目の対応表と正式公開の外部条件は既存文書を引き継ぐ。

実行結果：lint / typecheck / 65 unit suites / 15 Firestore emulator scripts / build はすべてPASS。375 / 390 / 412 / 768 / 1280で実SDK・Free・メールIDの3群を確認。実SDKのメール移行結合とDNT試験もPASS。ブラウザ証拠は専用JSON3件へ保存した。

## 11:23 JST 本人診断と実PostHog受領

本人の確認結果はSDK ready・通常ブラウザ・DNT/opt-outなし・送信許可・標準送信先一致。6種類のイベントがhttp_acceptedとなっていた。独立にProject594848で固定Previewホスト＋free_id_v1、2026-11-18T02:16:45Z〜02:25:30Zを照合し、session_start / check_view / check_start / check_complete / daily_reflection_view / my_viewを各1件確認。SDK1.450.0、schema2、ID状態legacy_external。後半4件のplanはfreeで、最初の2件は権利未確認のためnullという現行設計どおりだった。

これは今回の既存外部IDのCheck導線の受領PASSであり、未登録会話・実メールID完了・実移行完了の着信とは区別する。以前の未着信の原因を断定しない。診断待ちという前節の状態はこの時点で解消した。証拠は `evidence/owner-posthog-receipt-20261118.json`。

8359d9098e5b098218e53eee05db1301f68729c5 のGitHub CIは全項目成功、固定Previewも2026-11-18 11:16:45 JSTにVercel success。PR #80は未merge。本人の結果に認証ID・キー・メール・本文は含まれない。
