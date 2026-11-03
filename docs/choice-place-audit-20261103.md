# Camellia「知る → 選ぶ → 行動する」監査・実装計画

## 着手時の確認

- 2026-11-03、remote mainは `994a72ea94b6d418089f0dcf5693443fac925c91`（Check-first PR #58）。未コミット変更なし、open PRなし。最新mainから `feat/camellia-choice-place-20261103` を作成。
- ProductionはHTTP 200、配信入口 `index-BmLiFqUF.js`。Gemini公開statusはenabled、サーバー認証設定present、shared rate limitはFirestore、dataPolicyはunknown。実Gemini成功をこのstatusだけから断定しない。
- Circle未認証APIは401。既存の参加・投稿・コメント・通報・ブロック・moderation基盤は維持。Place未認証APIは503で、本番掲載は無効。デモ3件を実店舗として公開しない。
- Check-firstは結果の直後にログインを求め、未ログインではメリィ・Discover・Myへ進めなかった。下書きは30分／JST当日、LINE復帰bridgeは最長10分。
- メリィの通常会話はGemini、YURA/Lactoneは話し方。既存のSafety、直近context上限、retry、Library、明示的Memory保存を維持。
- 記録は既存の端末archiveと `camellia_users/{uid}` 以下のimports/dailyへ同期。所有者・アカウント競合・revision確認を維持し、新規ID再発行や一括migrationをしない。
- Camellia IDは既存のLINE/Google認証と記録の結び付きを利用する無料の概念。パスワードや新しい公開識別子を追加しない。
- Plus・決済・パートナー共有の既存実装は見つからなかった。本人から「決済は未準備」「準備までは共有内容のプレビューのみ」と回答を受領。実送信・共有URL作成・自動加入・課金を公開しない。
- PostHog接続でteam 594848を確認。既存の新規入口ファネル `RVzzYxUm`、初回体験 `26TwFhaG`、機能利用 `vOCbYWIj`、会話 `EOspyX4a` を確認。本文・personデータは調査対象にしない。

## 実装の分割

1. 入口・コピー・Guest体験・選択保存・Place導線を先に実装。既存のCheck画面・メリィ画面・ActionSheet・Place掲載モデルを再利用。
2. 共有プレビュー・Plus案内・サーバーの権限基盤・Privacy・計測を別の差分にする。決済未準備の状態を明示し、支払い完了を仮装しない。
3. 各差分のunit／型／lint／buildを確認し、同じ固定Previewを更新。モバイル相当5幅でE2Eを確認した後、本番反映・公開画面監査を行う。

## 主な変更先とリスク

| 対象 | 変更 | 守るもの |
|---|---|---|
| Welcome / Today / app metadata | 選択と行動のコピー、メリィ・Discover・Placeへの出口 | Check質問、既存One Flow、Fortune条件 |
| `app/page.tsx` / GuestExperience | ログイン前にも選択まで進み、Myで価値を残す | 既存のログイン済み利用者・認証callback |
| Guest下書き / journey model / store | カタログの行動・Place選択を一度だけ採用 | 有効期限、所有者、元Check ID・日時、別アカウント分離 |
| Discover / ActionSheet / Place | Placeを主な選択肢へ、選ぶ・行動・共有プレビューへ接続 | 写真、Circle入口、デモ表示、公開掲載の審査 |
| My / archive map / restore / validation | 行動とPlace選択の積み重ね、無料IDとプラン案内 | 既存記録・会話・Tree・同期・削除 |
| membership / partner専用module・API | 保護されたプラン情報、将来の共有基盤、現状はプレビュー限定 | クライアントのplan値では権限を与えない。秘密情報や本文をURLへ含めない |
| Analytics / Privacy / Terms | 既存イベント再利用と最小追加、実装に合う説明 | 回答・会話・共有本文・氏名・UIDを送らない |

## 体験・データ方針

GuestはCheck→メリィの端末内体験→Discover→選択→Place（掲載がなければデモ）→Myまで利用できる。会話は画面内メモリに限定し、OAuth復帰用データや正式archiveへ入れない。Myで明示的に残す対象はCheckと、カタログから選んだ行動・Place。プロフィール・利用資格・招待・所有者確認後だけ保存する。

新しいPlace選択は任意の`placeChoices`とarchive kind `place-choice`を追加。旧データに必須fieldを増やさない。デモ選択は必ずdemo=trueを持ち、実店舗の予約・購入・掲載実績に数えない。再読み込み・OAuth・同期の重複と、既存の記録が消えないことを重点検証する。

Place推薦は希望を基本にし、本人の同意なしにCheckや行動を使わない。同意時も端末内で処理し、会話・My Tree・月経は利用しない。Sponsored/partnerの有無を順位に使わない。

## 計測の対応

メリィは既存`conversation_open`／`conversation_message_sent`、Camellia IDは既存`save_prompt_view`／`auth_method_selected`／`login_success`を使用。同じ意味のイベントを二重に作らない。

追加する選択・Place・My・共有プレビュー・Plusイベントはallowlistで属性を限定。`partner_share_created`はURL作成成功時だけ、`plus_start`／`plus_complete`は実際のcheckout・支払い確認時だけを意味する。今回のプレビュー限定公開では、それらの成功イベントは発生させない。

PostHogの新しいファネルは任意の会話を必須の利用条件にしない。基本の選択ファネルと、会話を経由したファネルを区別して読めるようにする。参考: https://posthog.com/docs/product-analytics/funnels#how-to-create-a-funnel

## 未準備の外部条件

実在店舗の掲載・写真許諾・決済サービス・実支払い・共有送信は今回の確認済み機能と混同しない。既存のGemini dataPolicy unknownも別課題として残る。これらを未確認のまま正式リリース全体の「完了」とは報告しない。
