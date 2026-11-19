# 紹介ID接続の検証 — 2026-11-19

- lint/typecheck PASS（公開コピー補正後も再実行）
- unit 70/70 PASS（最終コピー補正後も再実行）
- Firestore emulator 18 scripts PASS
- Production相当build PASS
- Chromium 375/390/412/768/1280: 明示リンク発行・発行だけでは送信されない・明示NativeShare・横溢れなし。実際のdraft SVG3件の読込も5幅で確認。

追加した境界: verified email HMAC、未確認メール拒否、既存providerとのメール重複、匿名利用時にserverが確認したproofでID登録を判定、旧ID/custom identity偽装/未来trial拒否、Stripe権利との重複拒否、未設定・期限切れ価格/保持方針で受付停止。

一度目のemulatorでは「期限切れ価格」試験が失敗。モデル名のピリオドをFirestore updateの階層として解釈していた試験側をFieldPathへ修正し、期限切れの実際のモデル設定を更新する形で18 scriptsを再実行してPASS。条件やassertionは削除していない。

Auth/キャンペーン/単価/予算/NativeShareは隔離fixture。実メール・LINE/Googleの新規登録、実特典付与、実AI専用枠、実端末、Productionは未検証・未実行。装飾catalogはapproved=falseのデザイン案。
