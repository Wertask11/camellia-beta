# 選択・行動／Place公開候補の検証記録

## 公開する仕様

FreeのCheck、Today、今日の一枚、メリィ、Discover、Circle、Myは既存利用条件を維持する。初回はCheck→結果→メリィのお試し／Discover→行動の選択→Placeの体験イメージ→Myまでログイン不要。メリィのお試しは端末内の応答で、Gemini利用成功として扱わない。ログイン済みの通常会話・Safety・YURA/Lactone・履歴・Memoryの仕様は維持する。

Myの「今日のあなたを残す」から無料のCamellia IDへ進む。既存のLINE/Googleを使い、Check ID・日時と、選択したカタログの行動・Placeだけを一度採用する。会話をOAuthデータや正式記録へ自動保存しない。利用資格・招待制・所有者確認・アカウント競合の保護は維持する。

Placeは地図検索の代替ではなく、今日どう過ごしたいかを選ぶ入口にする。本人が希望を選び、Check・行動による並び替えは明示同意があるときだけ端末内で行う。会話・月経・Treeは使わず、店舗へ個人の状態を送らない。実在掲載0件、デモ3件。デモには掲載イメージの表示を残し、予約や実在店舗の来店として扱わない。

パートナー共有は本人の指示により**プレビューのみ**。固定の気持ち、選択した行動またはPlace、伝える相手、今日／今度を選び、送信内容を確認する。会話本文の取り込み・共有URL作成・外部送信はしない。未ログインでもプレビュー可能。APIも作成を503、公開閲覧を404で止める。

Camellia Plusは月500円の案内と保護されたサーバーのプラン判定を実装。中心価値は今後のPlace提案とパートナー共有。決済未契約のため申込・支払い・自動加入・共有無料枠は提供しない。既存Free機能に新たな課金壁を追加しない。`plus_start`／`plus_complete`を案内の表示だけで送らない。

## 検証済み（コード／ローカル）

- foundation: `efe7c71196f6fa46564b113dc297f29c5631c4a3`、PR #59。
- lint、typecheck、48/48 unit suites、buildが成功。
- Firestore emulator: 既存40件、Check-first、Commerce権限・保存・期限・取り消し・所有者削除／再作成の境界が成功。実決済・実共有の公開成功を示すものではない。
- 実Chromiumの375／390／412／768／1280: Guest Check→メリィ→Discover→行動保存→Placeデモ→My→明示保存→合成認証→プロフィール→My→refresh。元Checkと選択内容の一度だけの保存、会話の除外、ログイン前の保護API呼び出しなし、横overflowなし。
- 合成の既存アカウントで行動→Placeの希望引き継ぎ、同意の初期OFFと再表示時の保持、Myから全Place閲覧、既存Conversation Libraryが成功。
- native dialogのキーボードfocus、Escape、共有プレビューからPlus案内を開いて閉じる操作。支払・送信ボタンが無効でAPIを呼ばない。
- Guest YURA/Lactoneそれぞれ自傷／診断／薬中止／暴力／虐待／緊急症状の6境界で共通Safety、外部AI呼び出しなし。
- rollbackの旧Check-firstブラウザ検証も成功。既存記録の復元、別アカウント分離、招待／停止、ログイン取消、保存失敗時の復旧を確認。
- ブラウザ合成認証は実際のLINE/Google・実端末同期の確認とは区別する。

## PostHog

既存名を維持: `session_start`, `check_view`, `check_start`, `check_complete`, `conversation_open`, `conversation_message_sent`, `discover_view`, `save_prompt_view`, `auth_method_selected`, `login_success`。

追加: `discover_action_selected`, `place_view`, `place_recommendation_view`, `place_selected`, `my_view`, `partner_share_view`, `plus_offer_view`。将来の共有作成／送信／取り消し／閲覧、課金開始／完了も型を用意したが、今回の公開では成功イベントを作らない。属性は許可リストに限定し、会話・回答・氏名・Tree本文・共有本文を送らない。

Project 594848に本番host限定の基本ファネル `5JIQ1IT0`、会話経由 `R7o5494t`、決済未開始のPlus `UaXOQMRw` を追加。既存insightは維持。設定保存やイベント定義追加は、実イベント着信の証拠とは区別する。デモの選択は来店／予約ではない。既存アカウントへのログイン復帰でpersonが変わる場合、native funnelは過少集計し得るためentry_sessionとの照合が必要。

## Preview／Productionの検証

固定Previewは https://camellia-beta-git-codex-camellia-alpha-relea-161533-school-park.vercel.app/ を更新。LINEのcallback URLを増やさない。基盤PR: https://github.com/Wertask11/camellia-beta/pull/59 、体験PR: https://github.com/Wertask11/camellia-beta/pull/60 。

実アカウントでの保存確認を本人へ依頼済み。こちらでは本人のLINE/Googleログインを代行できないため、その確認結果は未受領。Productionへのmerge・公開画面監査・新イベントの本番着信確認はまだ行っていない。このファイルのローカルPASSやVercel Previewビルド成功だけでProduction PASSとは判定しない。決済・共有の送信は確認対象にせず、今回も停止状態を維持する。

## 残る外部条件と公開判断

- 掲載許諾・写真利用権を確認した実在店舗の登録は未実施。
- 決済サービス、実支払い、共有送信は本人方針により未提供。今回のUIから申し込み・課金はできない。
- 将来の共有公開時は削除連動・物理TTL清掃・作成の冪等性・運用を別途検証してから有効にする。
- 通常会話のGemini課金／データポリシーunknownは既存課題。今回の画面変更だけで解消したとはしない。
- Circleのflag／Firestore Rules／moderator claim／招待設定／APIキー／環境変数は変更しない。
- 機能rollbackは `VITE_CHOICE_ACTION_FLOW=off` で従来のCheck-first UIへ戻せる。保存済み任意fieldを一括削除しない。

正式リリース全体の完了ではなく、選択導線とプレビュー限定の公開候補として評価する。

## 変更ファイル一覧（基盤＋画面）

- `.env.example`
- `api/camellia/membership.ts`
- `api/camellia/place.ts`
- `api/camellia/share.ts`
- `app/globals.css`
- `app/layout.tsx`
- `app/page.tsx`
- `components/ActionSheet.tsx`
- `components/BottomNav.tsx`
- `components/PartnerShareDialog.tsx`
- `components/PlanCard.tsx`
- `components/PlusOffer.tsx`
- `docs/choice-place-audit-20261103.md`
- `docs/choice-place-release-20261103.md`
- `docs/evidence/choice-20261103/browser.json`
- `docs/evidence/choice-20261103/member-smoke.json`
- `docs/evidence/choice-20261103/posthog-configuration.json`
- `docs/evidence/choice-20261103/rollback.json`
- `hooks/useCamelliaStore.ts`
- `lib/analytics/posthog.ts`
- `lib/features.ts`
- `lib/journey/model.ts`
- `lib/membership/client.ts`
- `lib/membership/model.ts`
- `lib/membership/server.ts`
- `lib/onboarding/guest-check.ts`
- `lib/partner/client.ts`
- `lib/partner/model.ts`
- `lib/partner/service.ts`
- `lib/place/model.ts`
- `lib/place/recommendation.ts`
- `lib/schoolpark/map.ts`
- `lib/schoolpark/restore.ts`
- `lib/server/shared-limit.ts`
- `lib/storage/validation.ts`
- `public/privacy.html`
- `public/terms.html`
- `screens/AccountScreen.tsx`
- `screens/CamelliaScreen.tsx`
- `screens/ConversationWorkspace.tsx`
- `screens/DiscoverScreen.tsx`
- `screens/GuestExperience.tsx`
- `screens/MyScreen.tsx`
- `screens/PartnerShareScreen.tsx`
- `screens/PlaceScreen.tsx`
- `screens/PrivacyScreen.tsx`
- `screens/TodayScreen.tsx`
- `screens/WelcomeScreen.tsx`
- `tests/choice-flow-browser.py`
- `tests/choice-journey-cases.mjs`
- `tests/commerce-cases.mjs`
- `tests/commerce-firestore.mjs`
- `tests/place-cases.mjs`
- `tests/run-firestore.mjs`
- `tests/run-unit.mjs`
- `tests/ux-preview.mjs`
- `types/index.ts`
