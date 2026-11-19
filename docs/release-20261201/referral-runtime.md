# 紹介の受付接続とCamellia ID（未公開）

確定事項：12/1正式リリース対象、紹介自体は無制限、新規Camellia ID取得者はPlus7日/自動課金なし、紹介者の装飾選択権はJST暦月3件まで、取得装飾は永久保有・無料/Plus共通。月3件は紹介そのものの上限ではない。一時的な大量リクエストの防止は別。

## 接続

固定の常時falseを、サーバーフラグ＋承認済みキャンペーン＋価格/AI枠＋装飾catalog＋保存方針の検証へ置換。未設定ならpublic statusはenabled=false、POSTは503。通常の無料利用・保存・既得trial/装飾に影響させない。

- `CAMELLIA_REFERRAL_ENABLED=true` と server-only `CAMELLIA_REFERRAL_IDENTITY_HMAC_KEY`（暗号学的乱数32byteを64桁hex。秘密なのでチャット/Gitへ送らない）。今回設定しない。
- config/referral は予算・reserve・trialAiRequests・開始/終了・超過時/重複規則・装飾ID・数値基準・運営承認が全て必要。未承認の提案値を初期値にしない。
- config/ai_observation はtrialGenerationApproved、maxTrialInputTokens、現在使用するprimary/fallbackの承認済み単価とvalidUntilが必要。有効期限を過ぎた単価では専用AI拡張を停止。無料のbasic laneは停止しない。
- config/tree_decoration_catalog は運営承認済みcatalogが必要。存在しない/未承認assetを公開承認しない。
- config/retention.collections のreferral_intents/referral_grants/referral_identities/ai_usage_receiptsについて保持方針の数値・承認者・日時が必要。このreadiness判定自体は削除ジョブを起動しない。永久装飾の権利を削除する設定と結びつけない。

Myの紹介欄はサーバーstatusで準備状況を確認し、受付中だけ本人の明示操作でリンク発行。発行だけで共有先を開かず、NativeShare/clipboardも別の本人操作。URLに氏名・Check・会話を含めない。紹介着地はqueryをanalytics開始前に除去し、captureの通信待ちでTodayを止めない。

## IDの安全性

確認済みメールのみ秘密鍵付きHMACで照合。メール原文や辞書照合しやすい単純SHAを台帳に保存しない。Google/LINEの既存protected identityも維持。大文字小文字・前後空白だけを正規化し、Gmailの点や+aliasを勝手に同一視しない。複数メールが同じ人であるとは断定できず、予算・レート制限と運営監視を併用する。

既存Free匿名UIDが先に作られていても、登録前captureでサーバーが匿名かつ未連携と確認したproofがあれば、後の確認済みメールIDへの変更を判定できる。本人の申告時刻/フラグを信用しない。既存LINE等のcustom accountを匿名と偽ること、既存IDの個人記録を消して新規を装うことは認めない。異なるUIDへproofを移せない。

通常はAdmin Authの作成時刻とprofileのサーバー作成時刻が新規であることを要求。既存SchoolParkアカウントを「Camelliaだけ新規」として特典対象にする別方針は未決定であり、この実装では勝手に含めない。

有効なStripe契約とlegacy権利の両方を同じtransactionで確認し、未決定の体験重複を自動で重ねない。未来開始のtrialを先行有効化しない。

## 運用・鍵の回転

HMAC鍵は登録済み照合キーの同一性に影響する。紛失/無計画な交換で以前の照合を再現できなくなる。交換時は新規受付停止→影響する台帳と旧キーの安全な保管/再照合方針を承認→テスト→再開。生メールをGitへ書き出して移行しない。過去の紹介台帳が存在する環境では、新しいメール照合方式の導入前に旧subjectキーとの整合を運営が確認する。

公開前に実LINE/Google/メールの新規取得→特典1回→7日終了→My Tree装飾の選択・装着・解除・再ログイン保持を検証する。数値、期間、重複規則、装飾デザイン、保存方針は運営の最終決定を要する。現在の隔離fixtureはその決定ではない。
