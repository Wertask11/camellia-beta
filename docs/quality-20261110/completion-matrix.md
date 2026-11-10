# 全採用事項の対応表

改修前はPhase 0の原本のまま。完了表記はコードと記載した検証範囲に限定し、Production公開・運用開始とは区別する。実施していない項目は明記する。

|採用事項|改修前|改善内容|改修後|主要ファイル|検証|残り|
|---|---|---|---|---|---|---|
|① Today中心1件＋別候補|部分実装|Checkなしでも中心1件・理由・別候補。無選択でも利用可|コード完了・Preview本人確認|screens/TodayScreen.tsx; lib/recommendation/adjustments.ts|quality-journey-cases / quality-browser|Production未反映|
|② 自動提案＋本人調整|部分実装|カテゴリと時間の本人調整。条件不一致を自動で緩めない|コード完了・ローカルPASS|components/RecommendationControls.tsx; lib/recommendation/adjustments.ts|quality-journey-cases / 5幅|実利用の提案価値は未測定|
|③ Plusの個別化・比較・Place|部分実装|Free事実比較、Plusのprotected個別化比較、本人の端末内同意|部分実装・提供保留|components/PlaceComparison.tsx; api/camellia/place.ts|quality-place-cases / quality-place-browser|決済・実店舗・実AI原価未準備|
|④ 提案＋任意の店舗特典|部分実装|対象・条件・有効期間のある任意特典。未確認／期限外を出さない|構造完了・実特典0|lib/place/details.ts; lib/place/model.ts|quality-place-cases|実際の店舗特典は未提供|
|⑤ 初期無料実証|部分実装|0円・特典任意・自動有料化なしへの明示同意|基盤完了・運用未開始|lib/place/metrics.ts; screens/PlaceScreen.tsx|quality-operator-firestore|事業者導入・実店舗未準備|
|⑥ 基本掲載無料・有料任意|部分実装|無料と任意有料を区別。有料受付を拒否|基盤完了・有料保留|api/camellia/place.ts; operator-workflow.md|quality-operator-firestore|有料額は未決定|
|⑦ 女性の希望に合う場所・体験|部分実装|本人の希望＋エリア・予算・時間・予約・サービス・営業時間|コード完了・ローカルPASS|lib/place/conditions.ts; screens/PlaceScreen.tsx|quality-place-cases / browser|実在カタログなし|
|⑧ 4分野を同等に展開|部分実装|飲食・美容・休息・体験の分野を同等に扱う|構造完了|lib/place/details.ts; lib/place/recommendation.ts|quality-place-cases|実店舗件数の均等化・架空追加なし|
|⑨ 登録前の価値体験|部分実装|Checkなしの選択保存とLINE/Google既存認証への接続。私的会話は引継ぎしない|コード完了・Preview本人確認|lib/onboarding/guest-check.ts; screens/GuestExperience.tsx|quality-browser / owner-preview-acceptance.json|本人の利用providerは未特定。両方式実操作済みとはしない|
|⑩ Check→提案→Place/Discover→Action→Reflection|部分実装|選択→My→私的体験→任意Memory・別欄Circle|部分実装・実体験待ち|components/PlaceExperienceDialog.tsx; lib/place/experience.ts; screens/MyScreen.tsx|quality-experience-cases / browser|現実の店舗体験は未確認|
|⑪ 店舗実在・許可・情報・履歴・停止|部分実装|4つの審査証跡、変更前後履歴、再審査・停止、私的証拠の非公開|コード完了・実掲載待ち|lib/place/service.ts; lib/place/operator.ts|quality-place-firestore / quality-operator-firestore|実在確認・許可済み掲載0|
|⑫ Plus500円・店舗基本無料・原価と転換計測|部分実装|500円案内・protected判定・件数制限維持。実原価と見積を区別|部分実装・事業未準備|lib/membership; lib/server/ai-usage.ts; lib/analytics/quality-kpis.ts|commerce-cases / quality-operator-cases|決済・原価の実ランタイム接続・有料額未決定|
|⑬ 正式リリース可否は運営判断|完了|開発・本番公開・各運用開始を分離|維持|requirements.md; operator-workflow.md; referral-workflow.md|公開API停止確認・Production公開status読取|本番反映は本人承認後|
|⑭-1 発見目的のToday・Check非強制|不具合|Checkを強制しないTodayと、選択だけの個人記録保存|コード完了・Preview本人確認|lib/journey/adoption.ts; screens/TodayScreen.tsx|quality-browser / owner-preview-acceptance.json|架空Checkを作らない|
|⑭-2 CircleのPlaceを手動選択|未実装|公開Placeを投稿者が手動選択。私的原本は送らない|コード完了・新連携OFF|screens/CircleScreen.tsx; lib/circle/service.ts|quality-circle-place-firestore / experience-browser|新flagはOFF、既存Circleは維持|
|⑭-3 店舗投稿はPlaceのイベント・体験のみ|未実装|自店イベントだけ。権限偽装・他店広告を拒否。Circle資格を付けない|基盤完了・実運用未開始|api/camellia/place.ts; lib/circle/service.ts|quality-operator-firestore|別の店舗ログイン・営業導入未提供|
|⑭-4 Circle新着＋本人が選んだToday希望|部分実装|新着を維持し、本人の希望と公開Place特徴による表示を分離|コード完了・新連携OFF|screens/CircleScreen.tsx; lib/circle/service.ts|quality-experience-browser|非公開Checkを自動照合しない|
|⑭-5 本人が選ぶ通知種別・頻度・停止|未実装|通知の希望・種類・頻度・停止。汎用ロック画面文のみ|設定完了・配信未提供|components/NotificationPreferences.tsx; lib/notifications/preferences.ts|quality-operator-cases / 5幅browser|permission・配信provider・実配信なし|
|⑭-6 体験価値・D7/D30・Circle→Place・感想|部分実装|体験価値の固定回答、Circle→Place、D7/D30定義|計測コード・定義追加／実測待ち|lib/analytics/posthog.ts; lib/analytics/quality-kpis.ts; analytics.md|quality-analytics-cases / analytics-browser|新イベント本番着信・継続実測・保存insight未用意|
|⑮-1 明示共有・非公開原本保護・匿名の閲覧ページ|部分実装|本人選択の内容確認、匿名画面、取消・期限・削除時scrub|既存プレビュー維持・内部境界強化|lib/partner/service.ts; screens/PartnerShareScreen.tsx|commerce-cases / commerce-firestore / referral-browser|共有URL発行・送信・公開読取は停止|
|⑮-2 新規登録完了で7日体験／紹介者月3件|未実装|新規登録時刻・7日・JST月3件・冪等transaction|内部基盤完了・未接続|lib/referral/service.ts; lib/referral/membership.ts|quality-referral-firestore|signup hook未接続、紹介受付停止|
|⑮-3 任意装飾・永久保有・競争なし|未決定・要確認|永久の選択権台帳、承認catalogから一度だけ選ぶ。競争なし|基盤完了・デザイン未決定|lib/referral/service.ts; components/ReferralPreparation.tsx|quality-referral-firestore|実デザイン・My Tree装着UI未提供|
|⑮-4 7日終了・自動課金なし・1人1回・AI上限|未実装|7日期限・自動課金なし・重複拒否・専用予約枠|基盤完了・実AI未接続|lib/referral/service.ts; lib/referral/membership.ts|quality-referral-firestore|trial AI数値・実生成への接続未提供|
|⑮-5 自己紹介・重複・大量登録の抑止|未実装|Admin Authとprotected連携IDの重複抑止。私的本文や指紋不使用|部分実装|lib/referral/identity.ts; lib/referral/service.ts|quality-referral-firestore|未連携LINE/Googleの同一人物判定・大量登録運営監視は未完成|
|⑮-6 月予算・AI枠・異常増加・緊急停止|未決定・要確認|atomic月予算予約・専用AI枠・原価超過review・対象trial取消|基盤完了・数値未決定|lib/referral/config.ts; lib/referral/service.ts|quality-referral-firestore|金額・専用枠・実原価接続・監視運用が必要|
|⑮-7 正式リリース後のみ紹介開始|完了|正式公開・運営承認前はstatusのみ。POST拒否|停止維持|api/camellia/referral.ts; lib/referral/config.ts|quality-referral-cases|新キャンペーンを開始しない|
|⑮-8 数値基準・超過時・重複規則・期間は保留|未決定・要確認|必要設定に初期値なし。新受付停止と付与済trialを分離|未決定を保留・安全に拒否|lib/referral/config.ts; referral-workflow.md|quality-referral-cases / firestore|予算・枠・開始閾値・catalog・上限後・重複・期間は本人決定待ち|
|⑯-1 希望に合う場所・体験を伝える|部分実装|どんな体験ができるか、登録事実と提案理由を区別|コード完了・実掲載待ち|lib/place/details.ts; screens/PlaceScreen.tsx|quality-place-browser|実在店舗は未準備|
|⑯-2 異なるジャンルを少数ずつ|部分実装|4分野の分類と既存デモ3件を保持|構造完了・実店舗0|lib/place/details.ts; data/place-demo.ts|quality-place-cases|絶対件数基準を作らない|
|⑯-3 認知・予約・再発見、成果保証しない|部分実装|発見・既存予約・Myの再発見・任意体験回答|部分実装|screens/PlaceScreen.tsx; screens/MyScreen.tsx|choice-flow-browser / quality-experience-browser|来店・再来店の実成果未確認|
|⑯-4 基本情報＋体験必須・限定企画任意|部分実装|基本情報と体験を公開前に確認。限定特典は任意|コード完了・審査で必須|lib/place/service.ts; lib/place/details.ts|quality-place-firestore|実店舗の審査未実施|
|⑯-5 既存地図・予約・問合せが基本|部分実装|公式・予約・地図・問い合わせ・電話。既存導線を利用|コード完了|lib/place/model.ts; screens/PlaceScreen.tsx|quality-place-cases / place-cases|実店舗のリンク運用未確認|
|⑯-6 オンライン集計＋希望店舗の来店確認|部分実装|公開操作の日別集計、冪等・自店だけ閲覧。来店と呼ばない|オンライン基盤完了・来店未提供|lib/place/metrics.ts; lib/place/metric-client.ts|quality-operator-firestore|来店確認方式・TTL/定期削除は未準備|
|⑯-7 基本無料、任意有料を段階導入|部分実装|無料実証の合意と有料オプションの拒否|基本無料を維持・有料未提供|lib/place/metrics.ts; api/camellia/place.ts|quality-operator-firestore|任意有料の価値検証・価格は未決定|
|⑯-8 条件を厳密に絞り希望で推薦・理由|不具合|硬い条件→希望で順位付け。不明な事実は適合扱いしない|コード完了|lib/place/conditions.ts; screens/PlaceScreen.tsx|quality-place-cases / browser|ページ未読候補を全件なしと断定しない|
|⑯-9 任意のMemory・Reflection・Circle連携|未実装|私的Reflectionと任意Memory。Circleは別欄の本人文章|コード完了・ローカルPASS|lib/place/experience.ts; components/PlaceExperienceDialog.tsx|quality-experience-cases / browser|自己申告を検証済み来店としない|
|⑯-10 完成目標・営業方法・件数・有料額・来店方式|未決定・要確認|実店舗数の絶対基準・営業・有料・来店方式を補完しない|未決定を保留|operator-workflow.md; requirements.md|公開停止とサーバー拒否|本人と店舗の準備待ち|
|保護 既存データ／Auth／Fortune／Tree／会話／Circle|部分実装|protected役割・Plus・共有・台帳、旧v3保護→lazy v4、原文不送信|ローカル境界PASS・実運用未確認|lib/storage; lib/schoolpark; lib/referral; api/camellia|54unit / emulator全suite / privacy browser|実Rules設定・実端末v4複数端末/削除・保持方針は未確認|
|安全 認証と認可、他人のデータ、店舗境界、共有|部分実装|店舗scope・認可・他人の記録・共有／特典台帳をserver側で保護|ローカル境界PASS・本番設定未変更|api/camellia; lib/circle/service.ts; lib/place/service.ts; lib/referral|全Firestore emulator suite / analytics privacy|実運用の保持・監視・担当者設定・別承認が必要|
|UX スマホ・読込・空状態・アクセシビリティ・低速|部分実装|条件を折りたたみ、条件変更で比較解除。guest入力欄をnav上に確保|5幅PASS・実機一部未確認|screens/GuestExperience.tsx; screens/PlaceScreen.tsx; app/globals.css|quality-slow-browser / conversation-v3-browser / 5幅|iOS・Samsung実機、実OSkeyboard、screen reader手動確認は未実施|
