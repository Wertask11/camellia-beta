# AI台帳の実形式に対する削除保護

実ランタイムのai_usage_receiptsはusageとestimate.statusを保存する。usageIncompleteというbooleanだけを見て消すと、実際のusage=null / estimate.status=usage_incompleteを見落とすため、共通のretention-safety判定へ揃えた。

- request leaseはsuccess/error/abortedの既知終端以外を保留。started/旧形式/不明状態は期限切れだけで消さない。
- usageは承認済み見積が成立し、billableなinput/output/thinking/cachedが非負整数のときだけ通常の終了扱い。取得不能を0へ変換しない。非課金集約totalの欠落と、billable使用量の欠落を区別する。
- 不明使用量を整理するには既存の版付きproviderUsageReviewedと理由/終了レビューが必要。請求照合を偽装しない。判定は既存expiryと新lifecycleで共通。
- 紹介の親grantの終了日時が欠損/不明なら予約・Identity/予算を保留する。比較結果NaNを期限切れと扱わない。

local emulatorで実ランタイム形式のnull usage、旧lease、不明親期限、既知0の使用量を区別して試験。クラウドのジョブやTTLは開始していない。Web/API/個人記録の形式・権限・無料上限は変更しない。
