# 3段階の公開判定

|判定|現在|根拠・残る条件|
|---|---|---|
|A 開発完成|PARTIAL|無料/ID保護、Stripe/共有/紹介/通知/店舗申請/原価枠/支払い計測のコードと自動試験を追加。未決定を除いても、全種類の保持・完全削除、計測実運用、共有Auth全閉鎖の扱い等に残件がある。40表を省略していない|
|B 本番技術準備|NOT READY|main未merge・Production未deploy。Rules/index/env/claims変更なし。固定Previewへの最終候補反映とReady証拠を下欄で記録するが、実ログイン/実端末/実配信/新sourceの運用受入が必要|
|C 正式リリース準備|NOT READY|実店舗0、実Stripe受入0、実通知0、PostHog着信未確認。予算/枠/期間/保持/最終装飾/有料仕様と公開の運営判断待ち|

正式公開目標2026-12-01は維持する。現在のNo-Goは日付の延期を勝手に決める意味ではなく、必要な受入・承認前に公開済み/完成済みと扱わないという判定。

## main・本番・Preview

Production/mainは `fe7f85947a0799f9b4d4097e34c389839c3f7ec1`。最新の公開GET読取は evidence/production-readonly-latest.json。トップ/manifest/公開statusは200、Circle enabled、Place server disabled、checkoutReady false、Gemini statusはdataPolicy unknown/rateLimit firestore。これは新候補の本番合格証拠ではない。実会話は送っていない。

固定Previewは既存URLを維持する：
https://camellia-beta-git-codex-camellia-alpha-relea-161533-school-park.vercel.app/

固定Preview用branchを `ae5003618203733ec1300a91ee836bcd1281f11e` へ通常のfast-forwardで更新した。アプリコードは `145aa5d`、追加差分は検証証拠/報告書。GitHub deployment 7924926841 は environment=Preview / production_environment=false / success。PR #97のquality CIもSUCCESS。証拠は evidence/fixed-preview.json と pr-snapshot.json。直接HTTPは当環境からURLErrorとなり、固定URLの実画面・実ログインは未確認で、本人へ2つの会話の実操作確認を依頼中。 個別PR Previewを新しいLINE callbackとして追加しない。main統合・本番反映・全新規フラグON・課金・通知・紹介は別承認で、今回開始しない。

## 先に確認する残件

1. セキュリティの独立PR #91/#94と統合候補をレビュー。重大/高リスクは0だが中/低の残存評価も行う。過去の脆弱版へロールバックしない。
2. Stripeテスト設定・実店舗資料・通知方式/設定の承認を運営が準備する。秘密値をチャットへ送らない。
3. 推奨値と保持の依存関係を確認し、未接続の全ライフサイクル削除/共有Auth閉鎖の範囲を確定・実装/受入する。設定だけで総合PASSにしない。
4. 同じ固定Previewで本人が実ログイン・端末同期・Circle2アカウント・運営操作・実OS通知・実Stripeを受入する。不要な本人データ削除試験を繰り返さない。
5. PostHogの接続/実着信を回復し、新schemaのfunnel/JST/重複とD1/D7/D30定義を実データで確認する。未測定の利用者数/率を作らない。
6. main統合・本番deploy・Rules/index/設定を別途承認し、本番条件でsmokeとロールバック手順を確認する。

## 次の開発チェックポイント

- プロフィール未作成・個人記録削除後・Camellia側停止中でも、消費者プロフィールの再作成を要求せず支払い管理へ進める専用UIを接続する。APIのPortal/履歴は認証だけで回帰したが、アプリ全体の導線は別の残件。メールを使う場合も、支払い確認の認証を女性対象の新規登録同意と混同しない。
- 種類別の保持/完全削除のライフサイクルを、永久装飾・不正重複抑止・会計保存と矛盾しない形で確定/接続する。現行の許可済み期限削除と「全種類完了」を混同しない。
- Plusの新しい数値的上限/文脈範囲は未決定。承認フラグだけで新しい数値が実ランタイムへ適用済みとはしない。決定後は既存権利を保護して設定/適用/受入する。
- PostHog実着信、残る中/低リスクの到達性、初期bundle/実画像/モバイル通信、実認証/同期/複数アカウントを受入する。

上記が残るため、完了したように見せずPARTIALとする。Stripe契約と実店舗だけが残っている、とは報告しない。
