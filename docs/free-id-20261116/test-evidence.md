# 検証証拠 — 2026-11-17 JST

機能source **305713796a68ba44d8a5c354673ce25271aadd26**。この後の文書だけのcommitと区別する。新コードに対して再実行し、以前の本人確認を新しい合格へ転記していない。

## 自動試験

| コマンド | 結果 | 範囲 |
| --- | --- | --- |
| npm run lint | PASS | oxlint |
| npm run typecheck | PASS | TypeScript noEmit |
| npm test | PASS 64/64 suites | 旧会話/認証/同期/料金/Tree/Today/Fortune/Circle/Place/Memory/Safety/SDK、Free/メール/移行/計測の追加 |
| npm run test:firestore | PASS 15 scripts | local demo-camellia:8085、実SDK/Rules、private/cross-owner/権利/店舗/通知/紹介/課金境界 |
| npm run build | PASS | vinext/Vite、Circle index設定はskipped。Rules/本番index適用なし |

[実行記録・ログdigest・完了JST時刻](evidence/commands.json)。元ログは `work/final-{lint,types,unit,firestore,build}.log`。秘密鍵・実token・本人本文は使わず、emulator/合成fixtureだけ。CIはPR headのCheckを別途確認する。

会話上限の34件同時transactionは最初の並列getでemulator lock timeoutが発生した。transaction内の複数getを1回のgetAllへ修正し、**同じ34件の試験を維持したまま**最終runで受入30件・超過拒否を確認した。失敗した旧runを合格としていない。

## 実ブラウザ・合成環境

Chromiumで実コンポーネント/localStorage/File APIを操作。375/390/412/768/1280px。下記は外部Auth・メール・provider・cloud・PostHogの実受入ではない。

| コマンド | 各5幅の確認 |
| --- | --- |
| python tests/free-experience-browser.py | 登録不要Check→今日の一枚→Tree→会話→明示Memory→Place→Reflection→reload。旧アカウントcacheを変更しない、private Treeを会話requestへ送らない。390pxで別タブ競合保護 |
| python tests/email-id-browser.py | メール入口→確認callback→件数確認→明示移行→cloud確認前の控え保持→確認後解放→ログアウト後新Free分離。氏名/DOBを捏造しない |
| python tests/free-id-recovery-browser.py | Checkなし選択/保存・評価なしReflection、メール送信失敗/戻るの原本保護、既存IDへメール追加してもUID/旧記録維持。390pxでFree削除とFortune回答のscope、旧ID記録と他人回答を保護 |
| CONVERSATION_V3_BROWSER_OUTPUT=/workspace/outputs/camellia-free-id-20261117/conversation python tests/conversation-v3-browser.py | legacy履歴/検索/pagination、YURA3turn→Lactone3turn→逆切替、refresh、model attribution、focus/Escape/keyboard/inert/touch。viewportを低くしたcomposer確認は実OS keyboardとは区別 |

実行には `FREE_USE_FIXTURE=on CHECK_FIRST_FIXTURE=on CHOICE_FLOW_FIXTURE=on node tests/ux-preview.mjs` と `node tests/conversation-v3-layout.mjs` のローカル専用ハーネスを使用。fixtureを製品buildへ混ぜていない。結果JSONは [evidence](evidence/)。画像は `/workspace/outputs/camellia-free-id-20261117/`、Free初期群は `/workspace/outputs/camellia-free-id-20261116/free/`。横overflow/JS例外は各群0。

## 追加の権限・原本保護

- 新 `email-auth-boundaries-cases` は実handlerでsaved Place/operator status/share list/revokeAll/notification stopの未確認メールtokenを拒否し、private DBへ進まないことを確認。token verifierだけ注入。
- メールunitは送信受付と認証完了を区別し、違うメール/UID変更/未確認/期限/既存IDの同UID追加/URL scrubを確認。実メールは送信していない。
- 移行unitは別UID/違う認証方法/古いsource/再ログイン復旧/tombstone/設定/権利/分析再送禁止、移行元控えとFortune回答の所有者別削除を確認。
- 実Firestore clientのcloud containmentは安定root revision・各record・現UIDを確認。過去saved表示だけで完了しない。
- packageのrequire(ESM)無効化による既存server SDK初期化試験を継続。実Gemini・請求確認の代用ではない。

## 接続・Production・性能

公開HTTPは [public-status-20261117.json](evidence/public-status-20261117.json)。Production root/chat/membership GET200。新コードのProduction受入は未実施。固定Previewと写真CDNへはこの環境の接続policyが403を返すため実接続を確認できない。別経路で制限を回避していない。

静的build全体は約5.13MB、JS合計約1.69MB。[static-build-size.json](evidence/static-build-size.json)。これは全成果物の合計で初回転送量・実ネットワークLCPではない。初期表示の実モバイル性能、画像配信、iOS/Samsung、実OS keyboard、VoiceOver/TalkBackは未検証。実ユーザー数・体験価値・継続率・予約・来店・実請求を作っていない。

## 本人受入

以前のAndroid/PC・LINE・v4同期・export/restore・削除・Circle確認は `../release-completion-20261110/owner-acceptance.json` の旧sourceの履歴。今回のメール/Freeの合格として使用しない。新しい本人受入は [owner-acceptance.json](evidence/owner-acceptance.json)：実メール/明示移行/保存確認、PC→AndroidのメールID復元、IDなしのYURA/Lactone段階表示が本人報告PASS。使用token/請求、実30回境界、Googleは未確認。

## 計測診断の追加（source30d09b7）

[追加の全チェック](evidence/diagnostic-commands.json)：64unit/15emulator/lint/typecheck/build PASS。通常Free/メール5幅も再実行。`python tests/analytics-sdk-browser.py` は実posthog-jsと端末store/HTTP受領をローカル専用token/endpointで確認し、5幅の診断欄にキー・ID・本文が出ないこと、DNTでHTTP送信0件を検証。通常ブラウザを模したfixtureでは自動操作フラグをfalseにしており、製品のbot判定や実利用者のDNT/opt-outを解除していない。合成試験を実PostHog着信と呼ばない。

## GitHub CIの競合失敗と再検証（source80c2881）

30d09b7のGitHub CIは上限試験のtransaction lock timeoutで失敗し、build段階へ進まなかった。ローカルPASSとは別記録。80c2881で予約競合を安全に拒否する処理と試験を追加し、権限エラーは拒否として隠さず伝える。34同時の受入は最大30、残枠は単独で利用できることを検証する（34同時すべての成功保証ではない）。[最新の5コマンド](evidence/quota-commands.json) と [失敗/修正/最終20件同時受入の記録](evidence/quota-contention.json)。以前の「同時30件受入」というローカル結果を今回の一律保証に使わない。

## テスト入力の非決定性の修正

d5dc4d2のCI run44045572751はunitの「source変更拒否」試験で失敗した。fixtureが空配列を再代入し、更新時刻をnow+1msへ変えるだけだったため、CIの時計解像度によって元のJSONと同じ内容になる場合があった。2b82852でプロフィールの実値を確実に変更し、元のJSONと異なること自体もassertしてから拒否を検証するよう修正。製品の引継ぎ条件を緩めていない。64unit/lint/typecheck/buildはローカル再PASS。アプリ・サーバーのソースは80c2881から変更していない。最新CIで15emulatorも再確認する。

GitHub最終コード確認：run44046516911 / head2b82852で全qualityチェックPASS。実行source80c2881との製品コード差分なし。[ci-final.json](evidence/ci-final.json)。文書更新の後続commitは実装の新規受入とは分ける。

## 2026-11-18 SDK・取得成功計測

[追加報告](analytics-followup-20261118.md)と [新しい実行証拠](evidence/analytics-followup-20261118.json)。旧64suite等の合格を新sourceに流用せず、新しい65suiteと全Firestore試験、build、5幅を再実行する。追加した実SDK＋メール/移行の結合試験は修正前に `camellia_id_complete` 不在でFAILし、他の受領を取得成功として扱っていない。

source9b60003のGitHub run44224189611は全項目PASS（2026-11-18 11:37:04 JST）。固定Previewは同日11:36:17 JSTに同sourceのデプロイ成功。本人の未登録会話→メールID保存の受入と、会話/ID/移行のPostHog未受領は [個別証拠](evidence/owner-email-flow-20261118.json) に分離した。この追記以降に機能コードの変更はない。
