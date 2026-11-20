# Plusの会話条件を承認後に適用する基盤

値は未決定・未適用。月500円、無料日30回、紹介7日/no auto billing、月3件の永久装飾、紹介自体無制限を変更しない。本機能のために既存Plusへ新しい上限を勝手に適用しない。

## 新規申込みだけに適用する

`config/billing.conversationPolicy` は approved / approvedBy / approvedAt / version / dailyLimit / historyMessages / historyChars を必要とする。`conversationPolicyReviewed=true`だけでは新規受付を開けない。販売者表示・料金・test/live・提供内容・保持承認などの既存条件も必要。

- 数値に既定値を設けない。テストの32/2/10、料金UI fixtureの30/8/500は合成値で、本番へ設定していない。採用案はproposed-settings.mdを参照し運営が決定する。
- dailyLimitは無料の30回を下回らない。100,000は異常設定の検証上限で、推奨・採用値ではない。
- 現行Privacyを越えないようhistoryMessagesは0〜8件、historyCharsは1〜500文字。件数は同じthreadの直近message数で、他thread・Memory・Treeを自動送信しない。8件を越える設計は別途Privacy/実装/受入が必要で、設定だけで拡張しない。
- 申込画面に条件を表示し、本人が確認したversionをサーバーが照合する。versionや承認内容が変わった場合、古い画面の同意を流用しない。
- カウンターは通常会話の送信枠。通信/取得失敗でも枠を消費し得ることを申込画面へ表示する。緊急Safetyの固定応答は通常枠/外部生成より先に返す。

## 契約条件の保存と正規決済の照合

1. 新規Checkout intentと同じトランザクションで非公開 `billing_contracts/{random uuid}` を作成。UID/顧客/Auth作成日時/承認済み条件を保存し、申込みの繰り返しでも同じ契約を使用する。
2. Stripeへ渡すmetadataは無作為な契約参照 `camellia_contract` のみ。UID・メール・会話・Check等は渡さない。この参照はバックエンドと結び付く仮名の識別子で、匿名化したとは扱わない。
3. 署名されたイベントから正規Invoice/PaymentIntent/Priceを取得し、月500円の支払いを照合する。確定Invoiceに保存されたsubscription metadataの契約参照を使用する。redirect・client申告・顧客の更新日時から推測しない。
4. 契約の顧客・UID・Auth作成日時を照合した場合だけ、新規の正規paid権利へ条件をコピー。参照不明/他所有者なら拒否し運営確認へ回す。購入URLの発行やreturnだけではPlusを付けない。
5. グローバル設定変更は過去の契約条件を更新しない。旧契約に参照がなければ旧権利を保護し、新設定を推測適用しない。

`billing_contracts`も保持承認が必要。保存年数は未決定で、新しい削除ジョブやTTLは開始していない。会計保存・解約・返金・既存権利の保護を確認せずに契約台帳を消さない。

## 実ランタイム

- JST日次カウンターは既存無料枠を引き継ぎ、アップグレード・style/thread変更でリセットしない。
- 新しい契約条件を持つ正規Plusだけ承認済み日次上限を適用。Shared Rate Limitと重複request抑止は別に維持する。
- serverのレート判定から、信頼できるhistory上限だけを同じrequestへ渡す。clientの偽のhistoryLimitsは無視し、追加の全履歴・私的原文を読み込まない。両modelで同じ境界。
- 新契約の条件が壊れた場合、上限なしへ倒さず無料30回を維持し、本文/UIDを含まない運営警告を記録。Place等の正規Plus権利は、この警告を理由に勝手に削除しない。
- 紹介trialは通常無料30回と明示的な専用枠を分離した既存仕様のまま。新しい有料条件を自動適用しない。

## 検証

78 unit / 25 emulator scriptsで既存全体を再実行し、契約snapshot→正規paid処理→日次上限/文脈制限を接続して確認。Free消費の引継ぎ、JST境界、グローバル変更、旧receipt、別operator権利、未知の契約、壊れた条件、更新、2話し方と共通Safetyを検証した。Stripe SDKの署名/正規Invoice metadataもfixtureで確認。

料金画面を375/390/412/768/1280で操作し、提供条件、同意、同一intentで再試行、Escape/focus、横overflowなし、未承認条件での停止を確認。Auth/Stripe/Geminiは合成で、実契約や決済成功の証拠ではない。CI/Preview/最終sourceはtest-evidence.mdとevidenceを参照。

## ロールバック

新しい契約を一度でも発行した後は、契約参照・承認済み上限を解釈できない旧Webhook/会話サーバーへ戻さない。受付を止める場合はcheckoutEnabledだけを止め、契約台帳・paid snapshot・正規Webhook/Portalを保持する。UIを以前の見た目へ戻す場合も、このserver互換性を維持した修正commitを作る。まだ受付OFFの現時点と、契約発行後の運用を区別する。


## 支払い計測との整合

同意時刻/帰属IDは、実際のCheckout intentと契約の作成時にだけ保存する。既存契約が残っていて申込めなかった操作でwindowを延ばさない。新しい契約の正規Invoiceは、その契約参照が分析bindingと一致するときだけ当該申込みへ帰属させる。再試行で送信同意を撤回した場合は送信先bindingを除去する。会話/Check/契約参照自体をPostHog payloadへ追加しない。


## 単価の安全停止と無料利用の保護

日30回を越える新規Plusの追加枠は、config/ai_observationのapprovedとpaidExpansionApproved、実際に構成されたprimary/fallback双方の承認済み・期限内の単価を必要とする。数値は未適用。条件不足なら新規の追加枠付き申込を止める。既存の新契約で単価が無効になった場合、追加枠だけを止め、通常の無料30回と既存のlegacy/operator Plusを保護する。会話本文やUIDを含まない運営警告を残す。単価設定の承認を実請求照合と同じものとして扱わない。
