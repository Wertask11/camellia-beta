# 3段階の公開判定

|判定|現在|根拠・残る条件|
|---|---|---|
|A 開発完成|PARTIAL|無料/ID保護、Stripe/共有/紹介/通知/店舗申請/原価枠/支払い計測のコードと自動試験を追加。未決定を除いても、全種類の保持・完全削除、計測実運用、共有Auth全閉鎖の扱い等に残件がある。独立支払い管理と新規Plusの承認済み条件→契約→会話の接続は追加した。40表を省略していない|
|B 本番技術準備|NOT READY|main未merge・Production未deploy。Rules/index/env/claims変更なし。固定Previewへの最終候補反映とReady証拠を下欄で記録するが、実ログイン/実端末/実配信/新sourceの運用受入が必要|
|C 正式リリース準備|NOT READY|確認済み実店舗0、実Stripe受入0、実通知0、PostHog着信未確認。予算/枠/期間/保持/最終装飾/有料仕様と公開の運営判断待ち|

正式公開目標2026-12-01は維持する。現在のNo-Goは日付の延期を勝手に決める意味ではなく、必要な受入・承認前に公開済み/完成済みと扱わないという判定。

## main・本番・Preview

Production/mainは `fe7f85947a0799f9b4d4097e34c389839c3f7ec1`。最新の公開GET読取は evidence/public-readonly-20261120.json。トップ/manifest/公開statusは200、Circle enabled、Place server disabled、checkoutReady false、Gemini statusはdataPolicy unknown/rateLimit firestore。これは新候補の本番合格証拠ではない。実会話は送っていない。

固定Previewは既存URLを維持する：
https://camellia-beta-git-codex-camellia-alpha-relea-161533-school-park.vercel.app/

固定Preview用branchを `76c42e2c1ff230a342bd8642980c9ed84e1bd795` へ通常のfast-forwardで更新した。アプリ/Buildとも同じcommit。PR99のquality CI全ステップSUCCESS、更新後のVercel status SUCCESSを確認。GitHubの同じSHAのdeploymentはPreview / production_environment=false。証拠はevidence/fixed-preview-final.json。mainはfe7f859のまま。

2026-11-20の直接HTTPはこの実行環境からURLErrorで、実画面・実ログインは未確認。ローカル5幅をPreview実受入へ読み替えない。個別Previewを新しいLINE callbackとして登録しない。後続の報告書だけのcommitは固定branchへ再pushせず、アプリ/Build/報告headを分ける。main統合・Production・Rules/env/claims/機能公開/課金/配信/受付は今回開始していない。

## 先に確認する残件

1. セキュリティの独立PR #91/#94と統合候補をレビュー。重大/高リスクは0だが中/低の残存評価も行う。過去の脆弱版へロールバックしない。
2. Stripeテスト設定・実店舗資料・通知方式/設定の承認を運営が準備する。秘密値をチャットへ送らない。
3. 推奨値と保持の依存関係を確認し、未接続の全ライフサイクル削除/共有Auth閉鎖の範囲を確定・実装/受入する。設定だけで総合PASSにしない。
4. 同じ固定Previewで本人が実ログイン・端末同期・Circle2アカウント・運営操作・実OS通知・実Stripeを受入する。不要な本人データ削除試験を繰り返さない。
5. PostHogの接続/実着信を回復し、新schemaのfunnel/JST/重複とD1/D7/D30定義を実データで確認する。未測定の利用者数/率を作らない。
6. main統合・本番deploy・Rules/index/設定を別途承認し、本番条件でsmokeとロールバック手順を確認する。

## 次の開発チェックポイント

- 専用支払い管理UI `/?open=billing` を追加。プロフィール未作成・個人記録削除後・Camellia側停止中のAPI/UIをローカルで確認。メール認証を女性対象の新規登録同意と分離した。実メール/LINE/GoogleとStripe Sandbox、固定Previewでの受入は残る。
- 種類別の保持/完全削除のライフサイクルを、永久装飾・不正重複抑止・会計保存と矛盾しない形で確定/接続する。現行の許可済み期限削除と「全種類完了」を混同しない。
- Plusの数値は未決定だが、型/承認/versionを持つ設定→不変の契約台帳→正規Stripe Invoice→実ランタイムの上限/文脈制限まで接続した（PR99、plus-conversation-policy.md）。設定は未適用。既存権利は維持。承認値と実Stripeでの受入は残る。
- PostHog実着信、残る中/低リスクの到達性、初期bundle/実画像/モバイル通信、実認証/同期/複数アカウントを受入する。

上記が残るため、完了したように見せずPARTIALとする。Stripe契約と実店舗だけが残っている、とは報告しない。
