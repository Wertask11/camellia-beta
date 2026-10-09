# Camellia β2 初回体験・Check導線・継続体験 実装報告

確認日：2026年10月9日（日本時間）。Productionには反映していません。

## 1. 調査した現在仕様

- 最新mainをfetch。開始時branchは`work`、HEADとorigin/mainはともに`da978b943dfdba43ac45468917d90fe21ac612e1`。未コミット変更なし。作業branchは`codex/camellia-first-check-ux`。
- Production `https://camellia-beta.vercel.app/` のWelcome→CTA→LoginをChromiumで確認。公開HTML/JS/CSSは既存のOS信頼ストアによるHTTPS検証付きGETで取得し、ブラウザへ供給。その他の通信は遮断。本番記録を書き込んでいない。
- 実アカウントのセッション・認証情報はないため、Productionの認証後画面を見たとは扱わない。Profile・Today・Check・結果・過ごし方・Fortune・会話・My Tree・Discover・Memory/Insightは、現行コードを読み、実際のPageとstoreを隔離したChromiumでも操作してから実装した。
- 認証は共有Firebase AuthとRenderのCamellia認証API。LINE/Passportはcustom tokenで既存のcanonical UIDへ接続。匿名ユーザーはappへ入れない。以前のβ用guest関数は存在するが新しい入口は追加していない。
- 初回はProfileで名前・生年月日・対象確認・規約/Privacy同意。完了後Todayへ。使われている初回画面は`ProfileScreen`で、旧`OnboardingScreen`は現在のPageでは呼ばれていない。
- Checkは気分5択から開始、睡眠/身体/ストレス/月経は任意。保存は既存store。結果、Recommendation、一日一枚のFortuneが既に存在していた。
- 結果はJSTの日ごとに最後の実Checkを採用。未来の記録は除外。初回・昨日比較・3回・7回という既存段階を利用。`weekly`という内部stageは直近7回を意味し、暦週ではない。
- 会話は端末内のルールベース処理。外部LLMへ送らない。Structured Check contextと、本人が保存を選んだMemoryは別。会話履歴はMemoryとは別に保存する。
- Discoverは実在する`data/actions.ts`の行動を既存エンジンが順位付け。記事CMSや生成記事ではない。Circle/Placeは準備中。
- My Treeは本人用の人とのつながりの記録。評価・順位付け・相手への通知はない。
- 保存はlocalStorage v3と`camellia_users/{uid}`、`profile/*`、`daily/{JST日付}`、復元用`imports/*`。同期は衝突/アカウント違いを確認してから行う。管理APIはowner認証を通った運営が詳細を取得できる。
- Rulesは本人限定の記録アクセス、`camellia_auth_*`はクライアント読書き禁止、`admin/*`は本人readのみ。権限のある運営による閲覧は既存PrivacyとProfileに明記されている。
- PostHogは許可項目だけを送る明示イベント方式。自動収集・録画を無効化し、認証の戻り値を含むURL queryを除去する。既存イベントと同期用操作記録の対応を確認した。
- Privacy/Termsの既存文言、本人同意、運営閲覧の説明を確認。UXテストの点数や推定離脱率を実測の利用データとして扱っていない。

## 2. UX問題と実装箇所の対応

| 問題・要望 | 対応 | 実装箇所 |
| --- | --- | --- |
| 何ができるか入口で分かりにくい | 1分のCheck・昨日との差・今日の過ごし方を短く説明 | WelcomeScreen |
| β2を主役にしない | Camelliaと世界観を維持、β2は小さな補助表示 | WelcomeScreen/CSS |
| ログインの理由が不明 | 今日の記録を明日につなぐ理由を説明 | AccountScreen |
| Passportが不明、LINEが見つけにくい | LINEを先に、Passportを共通IDの説明付きで表示 | AccountScreen |
| 初回Todayで迷う | Check枠の視覚的優先、初回案内と所要時間、既存の気分5択へ誘導 | TodayScreen/CSS |
| Check自体は高評価 | 質問・5択・任意入力・気分を選ぶ基本操作を維持 | TodayScreen |
| プライバシーが不安 | 実際の運営アクセスを説明する既存Privacyへリンク | TodayScreen |
| 結果のあとがばらばら | 結果→過ごし方→一枚→今日どうする？の順序と任意の移動 | TodayScreen/Page/FortuneScreen |
| 翌日に戻る理由 | 初回結果に明日の手がかりとなる記録の意味を明示 | reflection/engine |
| 継続すると昨日との差が埋もれる | 3回/7回段階でも実際の昨日があれば比較を前に表示 | reflection/engine/TodayScreen |
| 古い疎な記録を「ここ数日」と誤解しうる | 「この3回の記録」と実際のサンプル数を表示 | reflection/engine |
| 会話の始め方が不明 | 入力欄付近に3つのチップ、今日のCheckがあればその入口を表示 | conversation/starters/CamelliaScreen |
| Checkと会話がつながらない | 既存contextの実際の気分選択を会話へ返す。自動Memory保存なし | conversation/engine |
| My Treeの役割が分からない | 大切な人・関係・思い出を自分のために残す場所と説明 | TreeScreen |
| Discoverが単なる一覧 | 今日のCheckがある時だけ既存提案を「今日のあなたに」と表示 | DiscoverScreen |
| 機能一覧化、継続ユーザーの重複入力 | Check後はフォームをたたみ、再Checkはいつでも可能。Insight/進行中行動を主導線の後へ | TodayScreen |
| 「話す」で不要な選択画面 | 「Camelliaに話す」で直接会話へ。既存ナビは維持 | Page/TodayScreen |
| 薄い色・操作ラベル | CTA/補助文字/タブ等のコントラスト、選択欄ラベル、focus、チップの44px目標 | CSS/Today/Camellia/Discover |
| Analytics互換性 | 既存イベント維持。チップ選択1イベントだけ追加 | posthog/types/CamelliaScreen |
| 通知 | 今回は実装せず、下記の次Phaseメモのみ | 本報告 |

## 3. 変更ファイル

アプリ：`app/globals.css`、`app/page.tsx`、`screens/WelcomeScreen.tsx`、`screens/AccountScreen.tsx`、`screens/TodayScreen.tsx`、`screens/FortuneScreen.tsx`、`screens/CamelliaScreen.tsx`、`screens/TreeScreen.tsx`、`screens/DiscoverScreen.tsx`、`lib/reflection/engine.ts`、`lib/conversation/engine.ts`、`lib/conversation/starters.ts`（新規）、`lib/analytics/posthog.ts`、`types/index.ts`。

テスト：`tests/check-interaction.mjs`、`tests/daily-reflection-cases.mjs`、`tests/first-experience-cases.mjs`（新規）、`tests/ux-preview.mjs`（新規）、`tests/ux-preview-entry.tsx`（新規）、`tests/ux-browser.py`（新規）。報告：本ファイル。

## 4. 変更内容と最小差分の方針

既存store・認証処理・データモデル・復元/同期・推薦・カード抽選を再利用した。追加したUI状態は再Checkの開閉と、Fortuneから行動の見出しへ戻す要求。新しい利用者分類やmigrationはない。

再Checkは新しい気分の選択から始め、同日内の複数Checkを既存方法で残す。比較はその日の最後の記録。FortuneはCheck後のみで、再Checkしても追加の一枚は引けない。途中でTodayへ戻る/各機能だけ使う/今日は何もしないという選択を維持した。

## 5. Welcome before / after

Before：時間帯の挨拶・今の私への問い・CTA・「今日のあなたを知るCheckへ」。具体的な返り値や翌日の価値は分かりにくかった。Production Welcomeにはβ2を大きく表示する見出しはなかった。

After：時間帯の挨拶と花を維持。「今日は、自分のために何する？」に続けて「1分のCheckから、今日の自分を知る。昨日との違いと、今日の過ごし方をCamelliaが一緒に考えます。」。CTAは「今日のわたしに会いにいく」を維持。β2は下部の補助表示。

## 6. Login before / after

Before：「どこからはじめますか？」と大きなPassport→LINEの2カード。Passportの意味は説明されていなかった。

After：「今日の記録を、明日のあなたへ。」と記録をアカウントへつなぐ理由。LINE→Passportの順で「続ける」に統一。Passportは「SchoolParkで使える、あなた専用の共通IDです」。次のProfileで明示同意する既存契約を維持。

## 7. Today before / after

Before：Checkのあとも5択フォームを常時表示し、結果・提案・進行中行動・意向等が並んでいた。

After：未CheckはCheck枠を強め、初回は「まずは、今日のあなたを教えてください」「1分くらいで、気分だけでも」。既に画面内に質問があるため、別の開始ボタンや新しいCheck画面は作らず、気分を選ぶ一手を維持。Check後はフォームをたたみ、任意の再Checkボタンと結果への道筋を表示。

## 8. Check後 before / after

Before：結果と3件までの提案、今日の一枚は既に存在。初回の翌日案内もあったが、継続段階では昨日比較が埋もれた。

After：今日のあなた→今日の過ごし方→今日の一枚→今日どうする？。結果保存時は見出しへfocus/スクロール。短い移動リンクで途中利用も可能。初回は今日の記録が明日の手がかりになると明示。2日目以降は昨日の実データがあると比較を前に表示。3回以上/7回以上の既存傾向表示も残す。「今週」と偽って表示しない。

Fortuneの既存結果/行動選択に加え、Todayの「今日どうする？」へ直接戻れるボタン。引かない場合も同日の一枚制御を維持。

## 9. Camellia会話 before / after

Before：画面上部の固定チップ3つ。Check専用の話し始めや、その入力を確認する返事がなかった。

After：入力欄付近に3つ。「今日あったことを話したい」「ちょっと愚痴りたい」「頭の中を整理したい」。今日の実Checkがあり人物の話をしていない時は「今日のCheckについて話したい」を先頭に。疲労/ストレスを推定してチップを出さない。Checkチップでは実際に選んだ気分を確かめる返事。会話は保存するがMemoryには自動で入れない。

## 10. My Tree before / after

Before：「私をつくってきた、人とのつながり。」の上部コピーと空の木。

After：既存コピーを維持し、「大切な人、その人との関係や思い出を、自分のために残しておく場所です。相手への通知はありません。」を追加。人物の自動登録・評価・ランキングは追加していない。

## 11. Discover before / after

Before：既存推薦エンジンで並んだ行動一覧とカテゴリ。

After：役割を短く説明。今日のCheck後、カテゴリ未指定の時は同じ既存エンジンの提案を「今日のあなたに」へ。通常一覧との重複は除く。本人がカテゴリを選んだら、その指定を優先する。昨日/未来のCheckでは今日専用セクションを出さない。架空記事なし。

## 12. 375 / 390 / 412px確認結果

| Chromium viewport | 結果 | 確認内容 |
| --- | --- | --- |
| 375×667 | PASS | Welcome CTAが最初の画面内、Check選択がナビより上、主要操作可能、横方向のはみ出しなし |
| 390×844 | PASS | 同上、結果/戻りのfocus、チップ折り返し、My Tree説明、Discoverカテゴリ |
| 412×915 | PASS | 同上、初回・2日目・3回・7回の表示/導線 |

全幅でWelcome→Login→Profile→Today→Check→結果→過ごし方→一枚→今日どうする？→会話→My Tree→Discoverを操作。履歴/プロフィール/Privacy/ログアウト/テスト用Passportでの復帰も確認。主要CTA・チップ・カテゴリの44px以上、キーボードEnter/Spaceとfocusを確認。ページ実行エラー0。390pxの夜テーマも確認。

幅検証の認証/同期/Analyticsはmock。実端末・実スクリーンリーダーによる読み上げテストではない。外部通信を遮断したためUnsplash画像はこの環境のスクリーンショットでは未読込（接続allowlistでも403）。画像サイズ指定は既存のまま。

## 13. PCへの影響

768×1024と1280×900も同じ操作がPASS。既存の最大460pxの中央カラム/PCシェルを維持。見出しの折り返しと可読性、カード/チップ/ナビの操作を確認。PC専用の構造やナビ変更なし。

## 14. 認証への影響

`lib/auth/camellia.ts`、Firebase初期化、認証callback、LINE/Passport API、canonical UID、SchoolPark側の戻り先許可を変更していない。AccountScreenのcallback・通知・エラー処理も維持。初回Profileの同意処理、既存アカウントの復元/衝突保護もそのまま。

実LINE/Passportの往復ログインは未検証。新しいPreview originはSchoolParkの既存の明示的な戻り先許可2件に含まれない。LINEの新origin登録状況も未確認。Previewの認証を通すためだけに許可先や認証方式を変更していない。Previewでのログイン完了を保証しない。

## 15. Firestoreへの影響

Rules・パス・スキーマ・同期/復元処理・削除処理・管理APIは変更なし。新しいAnalyticsイベントも既存の操作記録の構造で保存する。Check値をMemoryに移さない。migration/データ消去なし。

実ブラウザテストはFirebase/sync/authを置き換え、外部へのHTTPを遮断。本番データ書き込み0。別途Firestore Emulatorへ実際のmainのRulesを読み込んでアクセス制御を検証。本番に配信されたRulesそのものを取得して比較したわけではない。

## 16. Privacyへの影響

Privacy/Terms本文・同意版・運営閲覧の説明は変更なし。Check付近から既存の公開Privacyへ到達できる。ログインの理由とPassportの補足は既存保存/認証仕様と整合。「完全非公開」「運営も読めない」といった保証は追加していない。医療診断/治療の表現も追加していない。

## 17. Analyticsへの影響

既存`session_start`、`check_view`、`check_start`、`check_complete`、`fortune_open`、`fortune_draw`、`fortune_action_selected`等の名前/プロパティ/送信契約を維持。Loginは既存`login_view`/`auth_method_selected`、My Treeは既存`tree_open`を使い、同義イベントは増やさない。

追加は`conversation_starter_selected`だけ。チップのどの入口が利用されるか判断する目的。許可プロパティは`starter_id`の固定ID `today/vent/organize/check`のみで、不正な値を送信前に除去。会話本文・人物名・Check値・自由入力を送らない。SDKの録画/自動収集設定も変更なし。今回のテストでは本番PostHogへ配信していない。

## 18. テスト結果

| 検証 | 結果 |
| --- | --- |
| 開始時の既存16スイート | 全PASS |
| 変更後の17スイート（既存16＋first-experience） | 全PASS |
| Check再開/二重保存/StrictMode/イベント順の最終再検証 | PASS |
| `npm run lint` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |
| 実Chromiumの5 viewport、夜テーマ、Terms | PASS |
| Camellia認証・管理API・Passport接続の既存backendテスト | 7 PASS、失敗/skip 0 |
| 既存Camellia認証Rulesテスト | 7 PASS、失敗/skip 0 |
| 記録/会話/Memory/管理情報/IDの追加Rules確認 | 5 PASS、失敗/skip 0 |
| 主要な文字色/背景色10組のコントラスト | 全4.5以上（最小5.55） |
| `git diff --check` | PASS |
| release buildへテスト用認証mockが混入しないこと | PASS |

17スイートにはAuth callback/cancellation、Profile復元、同期/衝突、データ削除、Recommendation、Fortune、会話/Memory context、Insight、Check入口/UI/操作、Privacy計測、β2の準備中機能制御を含む。単体テストの成功と実認証/本番同期の成功は区別する。

隔離したブラウザ検証を再実行する場合：`node tests/ux-preview.mjs`で専用サーバーを起動し、Python Playwright/Chromiumを用意して`python tests/ux-browser.py`。これは通常のdev/Previewとは別のテスト環境。mockはrelease buildに使用しない。

## 19. P0 / P1 / P2 / P3残件

| 区分 | 状態 |
| --- | --- |
| P0 | 検証したコード/隔離ブラウザ/エミュレータ範囲で確認された問題0。本番の実アカウントと配信RulesによるE2Eは未確認で、保証範囲外 |
| P1 | 同範囲で確認された問題0。Previewの認証戻り先制約があるため、実LINE/Passport/本番保存/既存実アカウント復帰のリリース確認は未完了 |
| P2 | 本環境の外部画像取得が403で、画像読込を含めた見た目の確認が未完了。実機スクリーンリーダー/OS文字サイズ拡大の確認も未実施。確定したアプリ障害とは区別 |
| P3 | 通知は次Phase。実測の利用/再訪と本人の通知希望を確認してから、同意/時間帯/停止方法/センシティブ情報を通知へ出さない設計を別途検討 |

## 20. Preview URL

Vercel Preview（実装commit、deployment成功）：https://camellia-beta-lv0j97w1q-school-park.vercel.app/

Draft PR：https://github.com/Wertask11/camellia-beta/pull/20

この実行環境から新しいPreviewホストへの接続はプロキシのallowlistで403となるため、公開Previewをここから閲覧できていない。デプロイ成功はGitHub/Vercelの状態で確認した。通常Previewも現在の本番Firebase/Render設定を使うため、実データを書き込むテストは行っていない。新規/継続利用の操作検証は、実際のPageを使った隔離ローカルChromiumの結果として報告する。

スクリーンショット/検証JSONはこの作業環境の`/workspace/outputs/camellia-ux/`に保存。Productionの入口before、隔離した現行版の認証後before、変更後の各幅afterを区別している。ブラウザ内だけのローカルURLを共有Previewとは扱わない。

| 画面 | before | after（390px） |
| --- | --- | --- |
| Welcome | `production-welcome-before.png` | `390-welcome-after.png` |
| Login | `production-login-before.png` | `390-login-after.png` |
| Today | `today-before.png` | `390-today-after.png` |
| Check後 | `check-result-before.png` | `390-check-result-after.png` |
| 会話 | `conversation-before.png` | `390-conversation-after.png` |
| My Tree | `tree-before.png` | `390-tree-after.png` |
| Discover | `discover-before.png` | `390-discover-after.png` |

検証結果：`browser-results.json`、`tests.json`、`contrast-results.json`。追加Rules確認の実行コード：`firestore-records-regression.cjs`。画像は検証用の架空プロフィール/記録を使用。

## 21. commit hash

実装/テストcommit：`6cde8830832f774dab10e7ae6b09e701225621dc`。報告を含む最新HEADはPRのcommit一覧を参照。

## 22. Production反映可否

**未反映・公開判断は保留。** 実装と検証可能な回帰テストは完了した。mainは開始時の`da978b9`のまま。実LINE/Passportの認証、本番保存と履歴復元、既存実ユーザーの利用に対するリリース確認を終え、P0/P1がないこととあなたの承認を確認してから反映する。PRはDraftで、勝手にmerge/deployしない。
