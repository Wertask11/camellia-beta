# 再開地点

main/Productionはfe7f859のまま。コード統合・Production公開・料金徴収・紹介・共有送信・通知送信・Rules/index/claims/env変更は開始していない。

実装: PR84〜96の独立変更と、統合branch `feat/camellia-release-integration-20261119`。統合コード145aa5dでsecurity修正、紹介trialの通常30回と専用枠分離、明示継続UIまで実装。通常の無料・既存正規Plusを維持する。全76 unit/23 emulator/build、5幅の無料/ID復旧/モデル切替と新UIを再実行した。過去の本人受入は新sourceへ流用していない。

報告: release-completion-report.md（全40行）、release-readiness.md（A/B/C）、operator-runbook.md、migration-and-rollback.md、external-dependencies.md、test-evidence.md、data-inventory.md、proposed-settings.md。証拠はevidence。3443f7c時点の途中統合証拠はprior-integration-3443f7cへ分離。

次はrelease-readiness.md末尾の開発チェックポイントから再開する。特に請求管理をプロフィール再作成から独立させるUI、全種類の保持/完全削除、承認後のPlus数値適用、実Stripe/店舗/OS/計測受入を完了し、最後にmain/本番を別承認する。最新のremote mainと全open PRのhead/CIを取得し、未コミットの本人変更を上書きしない。固定Preview URLを維持し、LINE callbackを増やさない。

未決定: 紹介月予算・専用AI枠・終了日、Plusの会話数/文脈、種類別保持、最終装飾等。推奨値は未適用。Stripeのテスト環境準備の質問は回答待ちで、秘密値をチャットへ要求しない。PostHog接続は再試行も応答せず、実着信を確認していない。
