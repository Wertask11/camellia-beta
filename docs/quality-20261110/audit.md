# Phase 0：全採用事項の現状監査（2026-11-10 JST）

着手時の作業treeはclean、旧作業branch `fix/camellia-conversation-label-20261103` は6738443。remote mainは91e95bac4237f5349d6c35e7a0ae7b24087dd5d3、open PRは0件。最新mainから独立worktreeと `feat/camellia-quality-foundation-20261110` を作成した。AGENTS.mdは見つからなかった。

ProductionはHTTP 200、配信入口index-DfJLd4me.js。chat公開statusはenabled、Firebase設定present、shared rate limit Firestore、dataPolicy unknown。membershipはFree／500円案内／checkoutReady false。Place GETは503 PLACE_UNAVAILABLE、Circle未認証は401。公開statusだけで実Gemini、実店舗、ログイン成功を判定しない。個人の記録・秘密情報は取得していない。

既存仕様はCheck-first、写真のDiscover、YURA/Lactone、会話ライブラリ、明示Memory、Today One Flow、Circle moderation、protected subscription、任意fieldのarchive同期。データ一括migrationは予定しない。公開設定・招待・Rules・claim・決済・配信・キャンペーンを勝手に変更しない。公開表記はCamelliaを維持し、指示書中の「Camellia AI」を新たな画面名として復活させない。

本人から決済と実在掲載はどちらも未準備と回答を受領。未決定の月予算・trial専用AI枠・開始数値・装飾デザイン・上限超過時の扱い・重複規則・期間・店舗有料額・来店確認方式は、null／未設定を許容する設定モデルとし、安全に起動できない場合は開始を拒否する。架空店舗・特典・装飾・決済成功・来店確認は作らない。

|採用事項|改修前|コードの根拠|不足と実施方針|Phase|
|---|---|---|---|---|
|① Today中心1件＋別候補|部分実装|`screens/TodayScreen.tsx:315 / lib/today/flow.ts:todayPlans`|中心1件・理由・別候補はあるがCheck前に使えない|1|
|② 自動提案＋本人調整|部分実装|`lib/recommendation/engine.ts / screens/TodayScreen.tsx:flow-intent`|カテゴリ入口のみ。条件を保持した再提案と明示的な希望調整が不足|1|
|③ Plusの個別化・比較・Place|部分実装|`lib/membership/model.ts / api/camellia/place.ts:recommendation`|サーバーPlus判定あり。Free共通の条件適合、比較UI、原価情報が不足|1–2|
|④ 提案＋任意の店舗特典|部分実装|`lib/place/model.ts:specialOffer`|説明文字列のみ。対象・条件・有効期限・実提供確認が不足|2|
|⑤ 初期無料実証|部分実装|`lib/place/service.ts:change`|店舗課金なし。実証条件の明示的合意・記録なし|4|
|⑥ 基本掲載無料・有料任意|部分実装|`lib/place/model.ts / components/PlusOffer.tsx`|基本無料を壊さない。店舗有料オプションの金額は未決定|4|
|⑦ 女性の希望に合う場所・体験|部分実装|`lib/place/recommendation.ts / screens/PlaceScreen.tsx`|希望チップあり。硬い利用条件が不足|2|
|⑧ 4分野を同等に展開|部分実装|`lib/place/model.ts:PLACE_CATEGORIES`|飲食を含む分野整理が不足。件数均等化や架空店舗追加はしない|2|
|⑨ 登録前の価値体験|部分実装|`screens/GuestExperience.tsx / lib/onboarding/guest-check.ts`|Check後の体験あり。Checkなしの選択保存が拒否される|1|
|⑩ Check→提案→Place/Discover→Action→Reflection|部分実装|`app/page.tsx / screens/MyScreen.tsx`|選択まであり。Placeの実体験・振り返りの明示操作なし|1–3|
|⑪ 店舗実在・許可・情報・履歴・停止|部分実装|`lib/place/service.ts:publish / place_audit`|住所・公式URL・写真は確認。掲載許可と写真権利の別証跡、情報変更前後の履歴なし|2–4|
|⑫ Plus500円・店舗基本無料・原価と転換計測|部分実装|`lib/membership/model.ts / lib/server/shared-limit.ts / lib/analytics/posthog.ts`|決済停止。件数制限あり。実原価未確定、店舗有料額未決定|1,4,5|
|⑬ 正式リリース可否は運営判断|完了|`指示書13章 / 現行の共有・決済停止`|判定を開発と分離し、今回も自動開始しない|全体|
|⑭-1 発見目的のToday・Check非強制|不具合|`screens/TodayScreen.tsx:showForm / GuestExperience.tsx:select`|Check前の推薦・選択・保存を実用的に完結できない|1|
|⑭-2 CircleのPlaceを手動選択|未実装|`lib/circle/service.ts:write`|投稿本文のみ。Place連携なし|3|
|⑭-3 店舗投稿はPlaceのイベント・体験のみ|未実装|`api/camellia/circle.ts / CircleIdentity`|店舗の権限・区別なし。店舗としての投稿は現在提供しない|3–4|
|⑭-4 Circle新着＋本人が選んだToday希望|部分実装|`lib/circle/service.ts:feed`|新着順は維持。おすすめは未実装|3|
|⑭-5 本人が選ぶ通知種別・頻度・停止|未実装|`screens/MyScreen.tsx`|通知配信基盤・設定なし。配信開始は別判断|4|
|⑭-6 体験価値・D7/D30・Circle→Place・感想|部分実装|`lib/analytics/posthog.ts / actionFeedback`|基本操作はある。体験価値KPIとD30の指標定義が不足|3–4|
|⑮-1 明示共有・非公開原本保護・匿名の閲覧ページ|部分実装|`components/PartnerShareDialog.tsx / api/camellia/share.ts`|内容プレビューのみ、作成503・読取404を維持中。公開開始とは分離|5|
|⑮-2 新規登録完了で7日体験／紹介者月3件|未実装|`lib/auth/camellia.ts / lib/membership/server.ts`|認証は既存を再利用。特典台帳・冪等付与なし|5|
|⑮-3 任意装飾・永久保有・競争なし|未決定・要確認|`指示書13-3/13-8`|具体デザイン未決定。権利台帳と選択可能な構造だけ実装し、架空の装飾を付与しない|5|
|⑮-4 7日終了・自動課金なし・1人1回・AI上限|未実装|`lib/membership/model.ts`|既存operator_trialと新紹介trialを区別。専用AI枠数値は未決定|5|
|⑮-5 自己紹介・重複・大量登録の抑止|未実装|`lib/auth/camellia.ts`|既存のアカウント連携は保持。紹介特典用の重複台帳なし|5|
|⑮-6 月予算・AI枠・異常増加・緊急停止|未決定・要確認|`指示書13-6/13-8 / shared-limit.ts`|金額・専用AI枠を勝手に設定しない。設定不備時は紹介受付を閉じる|5|
|⑮-7 正式リリース後のみ紹介開始|完了|`現在紹介機能なし／今回追加の開始フラグはOFF`|コード実装とキャンペーン開始を分離|5|
|⑮-8 数値基準・超過時・重複規則・期間は保留|未決定・要確認|`指示書13-8`|必要設定が揃うまで開始不可。既存有効特典を新受付停止と混同しない|5|
|⑯-1 希望に合う場所・体験を伝える|部分実装|`screens/PlaceScreen.tsx / lib/place/recommendation.ts`|写真・説明・希望あり。体験紹介と事実／推測の区別が不足|2|
|⑯-2 異なるジャンルを少数ずつ|部分実装|`data/place-demo.ts / lib/place/model.ts`|デモ3件のみ、実在掲載は確認できない。実在件数の合格基準は決めない|2|
|⑯-3 認知・予約・再発見、成果保証しない|部分実装|`PlaceScreen.tsx / Place analytics`|基本遷移あり。店舗集計・再発見・体験価値の循環が不足|3–4|
|⑯-4 基本情報＋体験必須・限定企画任意|部分実装|`lib/place/model.ts / lib/place/service.ts:publish`|情報項目の一部は任意のまま。公開審査と任意企画の区別を強化|2|
|⑯-5 既存地図・予約・問合せが基本|部分実装|`screens/PlaceScreen.tsx:external`|地図・公式・予約あり。問い合わせ／電話の扱い不足。追加予約機能は必須にしない|2|
|⑯-6 オンライン集計＋希望店舗の来店確認|部分実装|`lib/analytics/posthog.ts / PlaceScreen.tsx`|クリックイベントのみ。来店とは扱わない。来店方式未決定のため開始不可|4|
|⑯-7 基本無料、任意有料を段階導入|部分実装|`料金・権限基盤`|店舗への有料課金なし。オプション契約・明示承認の基盤が不足|4|
|⑯-8 条件を厳密に絞り希望で推薦・理由|不具合|`lib/place/recommendation.ts / PlaceScreen.tsx:filtered`|エリアとカテゴリのみ。予算・時間・予約・サービスの硬い条件不足|2|
|⑯-9 任意のMemory・Reflection・Circle連携|未実装|`types/index.ts / useCamelliaStore.ts`|Place体験記録なし。訪問済み自動判定・自動投稿はしない|3|
|⑯-10 完成目標・営業方法・件数・有料額・来店方式|未決定・要確認|`指示書14-10`|今回のコードで確定・営業実施・有料受付・来店受付をしない|全体|
|保護 既存データ／Auth／Fortune／Tree／会話／Circle|部分実装|`既存48 suite / Firestore emulator / 関連screens`|現状の基盤維持。新差分ごとの回帰・保存・権限を追加検証|6|
|安全 認証と認可、他人のデータ、店舗境界、共有|部分実装|`eligibility.ts / protected admin path / CircleService`|既存境界あり。新しい店舗／紹介／体験記録への適用が必要|2–6|
|UX スマホ・読込・空状態・アクセシビリティ・低速|部分実装|`既存ブラウザfixture / 主要screens`|前回5幅確認。今回新導線を実ブラウザで再確認|6|


## 依存関係と検証順

1. Today／希望調整／Checkなしの保存は既存の認証・owner bindingを最優先。単体・OAuth取消／復帰・別アカウント・一度だけ保存を通してから次へ進む。
2. Placeに公開用と運営専用の証跡を分離。利用条件は不明を一致として扱わず、予算等を勝手に緩めない。審査／公開／更新／停止を統合検証する。
3. Circleの手動Place選択、店舗のscope、本人だけの体験記録と任意の公開を接続。既存block／moderation／pollingを再検証する。
4. 店舗scope付き管理と集計、無料掲載と任意契約、通知の選択を整備。クリックと確認来店を分け、未決定の来店方式は起動しない。
5. 共有停止を維持した閲覧基盤、紹介・trial・装飾権利・予算・AI枠・冪等台帳を実装。未設定時・二重付与・自己紹介・別アカウント・同時処理・期限を検証。
6. lint／typecheck／全suite／Firestore emulator／5幅の実Chromium／低速相当／保存と回帰を通し、PreviewとProductionを区別して証拠をまとめる。

実装は段階ごとのcommit／PRへ分割し、前段の重大な失敗を残して次へ進めない。コード完成・本番公開・正式リリース・課金受付・紹介開始・通知配信の開始はそれぞれ別に扱う。
