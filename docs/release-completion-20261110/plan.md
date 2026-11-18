# 最終完成の実装順（2026-11-10）

main91e95ba、#62 e1d2c55 → #63 8f633e8 → #64 c44c613 → #65 d59c2b4 → #66 aa66fb3 → #67 fcc586cを再取得し、base/head・CIを照合。すべてopen、先頭以外は前段branchをbaseにするstack。既存40項目と過去の成果物は原本として保持し、新検証と混ぜない。

1. Data / operator：v4の復元・同期・削除の競合保護、実SDK複数client統合試験、店舗scope付与／解除、掲載受入、期限データの承認付き削除。
2. AI runtime：実SDKのusage observation、thinking・試行・失敗・中断、原価見積と請求の分離、専用枠と冪等性。Freeの既存経路は維持。
3. Commercial / referral / notification：設定なしで起動しない決済Webhook、登録完了hook、装飾のUI接続、通知の重複／停止／失敗、保持削除。
4. 新しいHEADで全テスト・5幅・実機受入・固定Preview。3判定と6文書、40項目を更新。

新機能・料金・共有送信・紹介・通知の運営開始はしない。mainへの反映もProduction deployを伴うため、最終の具体的な差分と手順を提示して本人判断とする。既存6PRは統合チェックを独立に保持し、無断でbaseへまとめない。今回追加分も小さな後続PRで管理。

本人はAndroid Chromeと削除可能な専用テストアカウントを用意できると回答。iPhone/Samsung/VoiceOver等を代替試験でPASS扱いしない。利用資格、秘密値、Rules、既存公開flagは変更しない。
