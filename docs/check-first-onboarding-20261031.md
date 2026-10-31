# Check First onboarding — 2026-10-31

## 1. 変更ファイル一覧

| ファイル | 役割 |
|---|---|
| `app/page.tsx` | 未ログインCheck、認証後の本人確認・引き継ぎ・再開、既存アカウント復元 |
| `screens/WelcomeScreen.tsx` | Checkを主CTA、既存利用者のログインを副CTAにする |
| `screens/TodayScreen.tsx` | 既存のCheck質問・今日のあなたを再利用し、未ログイン時はその直後に保存CTAを表示 |
| `screens/AccountScreen.tsx` | LINE・Googleの既存認証を保存目的のカードとしても表示 |
| `screens/ProfileScreen.tsx` | 初回の必須3項目と任意設定を分離、引き継ぎ用の完了コピー |
| `app/globals.css` | 保存カード・CTAの余白とスマートフォンでの見出し折り返し |
| `lib/onboarding/guest-check.ts` | 期限付き下書き、認証試行との結び付け、一度だけの引き継ぎ |
| `lib/auth/camellia.ts` | 既存LINE callback検証後の下書き復帰、失敗・ログアウト時の後処理 |
| `hooks/useCamelliaStore.ts` | 元のCheck ID・日時を保った正式記録への追加、保存確認、再開イベント |
| `lib/analytics/posthog.ts` / `types/index.ts` | 最小限の追加イベントと属性allowlist |
| `lib/features.ts` / `.env.example` | 既存方式のビルド時Feature Flag |
| `screens/PrivacyScreen.tsx` / `public/privacy.html` / `public/terms.html` | 登録前Checkと短期OAuth復帰データの説明 |
| `tests/check-first-cases.mjs` | 下書き期限・認証復帰・アカウント分離・一度だけの採用 |
| `tests/check-first-browser.py` | A〜I、5幅、招待・停止・接続失敗、保存容量不足からの回復 |
| `tests/check-first-firestore.mjs` | ローカルFirestoreで正式保存・復元・権限境界を確認 |
| `tests/analytics-privacy.mjs` | 新イベントから回答・UID・自由文を除外 |
| `tests/ux-preview.mjs` | ローカル専用の認証・復元・失敗シミュレーション |
| `tests/chat-availability-cases.mjs` | 既存テストの25ms固定待機を、保存結果を待つ上限付き待機へ修正 |
| `tests/conversation-model-interaction.mjs` | 返答完了前のassertを避け、既存の操作不可状態が解けるまで上限付きで待機 |
| `tests/run-unit.mjs` / `tests/run-firestore.mjs` | 新しい検証を既存runnerへ追加 |
| 本書 / `docs/evidence/check-first-20261031/browser-qa.json` | 実装・検証範囲と結果 |

## 2. 各変更内容・着手前の確認

- 対象: `Wertask11/camellia-beta`。最新mainは `e9efd11f56341c2ee0511406951452ccb8d779c7`（PR #57）。着手時、remote mainと一致し、未コミット変更なし、open PRなし。
- 作業branch: `feat/camellia-check-first-20261031`。過去の作業branchからではなく、このmainから作成。
- ProductionはHTTP 200。配信中の入口bundleは `index-D9LSf9CX.js`。PR #56のLINE/Googleのみの入口と、PR #57のログイン下部コピー削除をbaselineにした。
- 既存Today One Flow・Check質問・結果生成をそのまま使う。別の診断・別の結果生成は作っていない。
- 既存認証はFirebaseの状態通知と既存LINE callback検証、既存同期は所有者・競合確認付きのFirestore archive。そこへ未ログイン下書きを直接混ぜない。
- SchoolParkの新規ログイン入口は復活させない。既存利用者のcallback・アカウント連携は維持。
- Service Worker登録やPWA独自のキャッシュ経路は見つからず、追加もしていない。routing・API・Firebase Rules・index・Gemini設定を変更していない。

## 3. 新しい新規ユーザーフロー

Welcome **「今日のわたしをCheckする」** → 既存Check → **今日のあなた** → **「LINEで記録を残す」「Googleで記録を残す」** → 利用資格・招待の確認 → 初回のみ最小プロフィール → 元のCheckを1件保存 → Todayの過ごし方・今日の一枚・今日どうする？・明日への続き。

初回プロフィールは名前／ニックネーム・生年月日・女性であることの自己申告。任意項目はMyのプロフィール編集から設定できる。年齢範囲・自己申告・利用規約への同意の要件は弱めていない。

## 4. 旧フローとの差分

| 対象 | 変更後 |
|---|---|
| 未ログイン・初回 | 登録する前にCheckと結果まで体験できる |
| ログアウト中の既存利用者 | Check後に既存記録へ戻れる。Welcomeから直接ログインもできる |
| ログイン済み | 既存のToday・Checkを継続。Guest画面を挟まない |
| 認証キャンセル・失敗 | Check結果を保ち、保存CTAから再試行できる |
| 認証成功 | Checkをもう一度求めず、元のID・日時で保存して続行 |

## 5. PostHog追加・変更イベント

`entry_flow=check_first`で旧入口と比較する。既存UTM・既存のランダムなセッションIDを再利用し、新しい利用者識別子やperson aliasを追加しない。

| 要求された段階 | 実際に使用するイベント |
|---|---|
| 入口 | 既存 `session_start` / `welcome_view` |
| welcome_check_clicked | 既存 `welcome_continue` + `entry_flow` |
| Check | 既存 `check_view` → `check_start` → `check_complete` |
| today_you_view | 既存 `daily_reflection_view` + `entry_flow` |
| 保存CTA表示 | 新規 `save_prompt_view` |
| login_method_selected | 既存 `auth_method_selected` |
| 認証 | 既存 `auth_returned` / `login_success` / `login_failure` |
| 初回プロフィール | 既存 `profile_view` / `profile_complete` |
| 正式な端末記録への採用 | 新規 `guest_check_saved`, `storage=device` |
| Today続行 | 新規 `today_flow_resume` |

追加は3イベントだけ。取り込み時に`check_complete`を再送しない。再読み込み・二重操作で同じCheckの保存／再開を増やさない。

`entry_session`は既存のランダムUUIDセッション値。認証後に既存プロフィールIDへ戻る場合の入口照合に使える。回答・名前・生年月日・Firebase UID・会話本文を属性へ入れない。UTM別比較は既存の安全なattribution属性を使用する。同じタブでは既存のsession attributionを継続し、別タブ復帰では入口セッションとの照合を使う。

**`guest_check_saved`は認証済みアカウントの端末への永続保存を示す。Firestoreの保存完了通知ではない。** 従来どおり同期を予約し、失敗時は既存Sync表示・再試行に従う。

依頼文のbaselineは82人→23人（28%）→11人→10人。これは提供された値であり、今回PostHogから再取得した値ではない。目標はsession_start→check_view 50%以上、check_start→complete 85%以上。公開後の比較が必要で、実装時点で改善達成とは判定できない。PostHog側の既存ファネル・設定は変更していない。

## 6. Firestoreへの影響

- ログイン前の回答は正式stateの`checkins`やFirestoreへ追加しない。匿名ユーザー文書も作らない。
- 認証・既存記録復元・プロフィール完了・現在の利用可否の確認後に、callbackが確定したアカウントへだけ追加する。
- `camellia_users/{uid}`以下の既存`daily`・`imports`形式を使用。schema migration、Rules deploy、index追加なし。
- 原CheckのID・createdAt・updatedAtを保つ。archiveの文書IDも同じなので同期再試行で増殖しない。
- 既存Check・会話・Memory・Tree・保存データを削除・一括書き換えしない。既存の端末／アカウント競合確認も維持。

## 7. Privacy / Security確認結果

- 通常のGuest下書きはメモリ＋sessionStorage、有効期限30分かつ当日JST内。固定選択の気分・睡眠・身体・ストレスと必要な内部メタデータだけを保持。自由文・月経・プロフィール情報を含めない。
- LINEの別タブ復帰にも対応するため、LINEの保存CTAを押した場合だけlocalStorageへ1回限りのOAuth復帰用下書きを置く。有効期限は最長10分。認証stateと試行IDを照合し、既存nonce/state/token検証の後にだけ消費する。
- 成功・失敗・キャンセル・logoutで復帰用下書きを削除。アプリが開いている間は期限を確認し、閉じていた場合は次のアクセス時に期限切れデータを削除する。**ブラウザを閉じた瞬間の物理削除や、閉じたままの時刻指定削除は保証しない。** Privacyの説明もこれに合わせた。
- UIDは認証後の一時的な所有者照合にだけ使用し、URL・PostHog属性へ送らない。Check回答もURLへ含めない。
- logout時はsession／復帰用下書きを破棄。別アカウントや期限切れ下書きは自動採用しない。
- Guestの採用は最新の利用可否が確認できた場合のみ。招待待ち・停止・接続状態不明のときに保存を先へ進めない。
- 下書き保存不可は画面へ通知し、LINE復帰用保存ができなければ遷移を中止してGoogleの選択肢を案内する。正式記録の保存失敗は既存StorageRecoveryで回復するまで下書きを保持する。

## 8. Feature Flag状態

`VITE_CHECK_FIRST_ONBOARDING`。既存`lib/features.ts`のビルド時flag方式を利用し、未指定／trueは有効、`off`は無効。`TODAY_ONE_FLOW`が無効の場合も新入口は使わない。

この変更を含むPreview buildでは有効。**Productionはmainの既存コードで、新入口は未反映。** リモート環境変数、招待制、Circle／Placeの公開flag、Gemini API keyを変更していない。11月1日の招待制ON操作は含めていない。

## 9. QA結果

実ブラウザはChromium。実際のPage／Store／各Screenを使い、認証・access・syncだけをローカルの合成応答に置換した。外部通信は遮断し、実ユーザーデータを使用していない。

| Case | 検証範囲 |
|---|---|
| A 新規 | Check→結果→保存CTA→3項目profile→同じCheck→Today |
| B ログアウト中の既存 | 異なるprofile IDの既存記録を復元し、過去のCheckを残して新しいCheckを追加 |
| C ログイン済み | Welcomeを挟まず既存TodayとCheckを継続 |
| D 途中離脱 | 再読み込み後も正常、未完了Checkを正式保存しない |
| E 保存キャンセル | 結果へ戻り、同じCheckから再試行 |
| F OAuth成功 | LINE相当のページ全体再読み込み／Google相当のpopup完了後、元のCheckを継続 |
| G OAuth失敗 | 正式保存なし、再読み込み後も同じ結果から再試行 |
| H logout→別アカウント | 実logout関数＋合成Firebaseで下書きを消去し、次のアカウントに混ざらない |
| I スマートフォン | 375 / 390 / 412 / 768 / 1280、横overflowなし、Check保存後の4タブを維持 |
| 追加 | 保存前のCheck選び直しでは最新の1件だけ採用し、結果／保存CTAの計測を更新。招待待ち・停止・access失敗で採用しない。端末容量不足時は下書きを保持し、保存回復後に1件だけ採用 |

機械可読の結果: `docs/evidence/check-first-20261031/browser-qa.json`。

ローカルFirestore emulatorでは、正式保存前のarchiveなし／本人の保存と完全復元／再送しても1件／既存記録の保持／未認証・他UIDの書き込み拒否を確認。実Firebase Productionでの受け入れ試験とは分ける。

## 10. Regression結果

46 unit suites、既存40項目のFirestore検証、新規Check FirstのFirestore検証を実行。Today／Check／今日のあなた／提案／Fortune／Reflection／会話・YURA・Lactone・reaction／Discoverのrecommendation／Circle／Place／My・Tree・Insight／認証callback／同期／削除／Privacy・Analyticsを含む既存の検証を継続。

lint・typecheck・46/46 unit suites・Preview相当buildはPASS。上記browserのA〜I／5幅／3種のaccess gate／容量不足からの回復もPASS。実サービスの全機能を実アカウントで再操作したという意味ではない。Gemini provider・prompt・モデル・Safety・Shared Rate Limitは変更していない。

Flag OFFの既存ブラウザ検証も4シナリオPASS（招待リンク、コード入力と誤りからの復帰、停止後logout、access接続失敗時の従来動作）。Guestの採用だけは最新の正常回答を必須にしており、従来のログイン済み利用者の動作を一律に変えていない。

## 11. 未解決事項

1. 同じ固定Previewで、本人による実LINE／Googleログインと、Check引き継ぎ・実Firestore同期の最終確認が必要。こちらから本人として勝手に認証しない。
2. 新入口イベントの実PostHog着信と公開後のKPIは未確認。合成ブラウザのイベント順序・回数とsanitizerは検証した。
3. 30分を超える／JST日付をまたぐ下書きは採用せず破棄する。長時間放置後までCheckの復帰は保証しない。
4. 元からあるGemini上流障害・無料利用のdataPolicy、Placeの実在掲載準備等を今回の入口改善で解消したとは扱わない。

## 12. Productionへ反映してよいか

コード・ローカル検証と、実OAuth／実同期の受け入れを区別する。PRと固定Previewを用意し、本人の保存動作確認後にProduction反映を判断する。**このタスクではProduction merge／deployはしない。**

固定Previewは従来の1つを使う:
https://camellia-beta-git-codex-camellia-alpha-relea-161533-school-park.vercel.app/

LINE Developersへ新しいURLを登録する必要はない。

## 13. rollback方法

1. `VITE_CHECK_FIRST_ONBOARDING=off`で対象環境をrebuild／redeployすると、従来のWelcome→LINE/Google→Profile→Checkへ戻る。runtime flagではないため、設定だけで即座には切り替わらない。
2. 必要ならこのPRのcommitをrevertして通常のdeployを行う。
3. すでに正式保存したCheckは既存schemaのまま残る。rollbackのためのデータ削除・一括migration・Rules変更は不要。残った未採用下書きは期限を過ぎた次のアクセスで無効化・削除される。
