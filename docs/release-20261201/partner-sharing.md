# 明示共有の接続と公開条件

URL発行・第三者閲覧・履歴・取消を実APIへ接続。既定はOFF。公開は `CAMELLIA_PARTNER_SHARING_ENABLED=true` と server専用 `camellia_admin/release_phase1/config/partner_sharing` の両方が必要。設定は version=partner_v1、enabled/approved/privacyReviewed/entitlementsReviewed=true、approvedBy/approvedAt。未設定でURL発行せず、既存の無料体験を妨げない。今回この設定を変更しない。

- 発行: eligibleな確認済みID＋server台帳で有効Plus/保護された紹介7日trial。membership/紹介grant/個人記録の削除lockを同じtransactionから確認。ブラウザの表示は権利を付けない。
- 投稿: 定型の気持ち、既存Action、公開Placeのallowlistのみ。本文自動要約、Check、会話、Memory、Treeの読み出しはしない。
- 本人が内容/相手/時期/1日・7日/同意を選ぶ。URL作成後も自動送信しない。Native Shareまたはclipboardは別の本人操作。
- tokenは256bitランダム、URL fragmentに配置。DBはSHA256のみ。公開レスポンスに本人ID/宛先/台帳は含めない。ログ/分析にもtokenや本文を出さない。
- URLの知得者はログイン不要。指定相手以外を技術的に閲覧不可にする機能ではないため転送注意を表示。共有相手の氏名/連絡先は収集しない。
- 取消・失効・本人記録の削除/再作成・Place停止は公開本文を非表示/scrub。期限の論理判定とDBの物理削除は区別。未決定の保持期間によるTTLは開始しない。
- 既存の1日10件の発行制限を維持。これは**紹介自体を無制限とする決定とは別機能**。紹介者の月3件は装飾特典のみ。
- 公開を止めても、所有者の履歴・取消・全取消はverified identityから使える。停止やPlusの失効を理由に取消を妨げない。

## 検証

`npm test` 69/69、`npm run test:firestore` 17 scripts、lint/typecheck/build PASS。新しい実ローカルHTTP試験で、発行→匿名の第三者閲覧→別ユーザー取消拒否→本人取消→404を検証。保護されたStripe権利・紹介trial・Free拒否・停止・期限/本文scrubも確認。追加試験でPlace停止・削除lockを確認。

認証はfixture、DBはdemo-camellia emulator。実ログイン/実支払い/Production共有URL発行ではない。375/390/412/768/1280の実Chromiumでは明示選択・同意・作成だけでは送信されないこと・NativeShare操作・取消・Escape・横overflowなしを確認した（各外部API/NativeShareはfixture）。

公開前: 固定Previewで本人の2アカウント＋未ログイン別ウィンドウ、NativeShareの実共有先選択、取消/期限/停止、Privacy/Termsと保持運用の受入が必要。今回ProductionをONにできる判定ではない。
