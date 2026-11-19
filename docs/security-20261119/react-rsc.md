# React RSC依存のセキュリティ修正（2026-11-19）

基点: origin/main fe7f85947a0799f9b4d4097e34c389839c3f7ec1。機能追加branchから分離し、既存本番へ適用できる最小差分として準備する。本番へはまだ反映しない。

GitHub公式advisoryで、react-server-dom-webpack 19.2.6が以下の対象範囲に含まれることを確認。

- GHSA-xqc2-xf4c-x3h3: Unauthenticated Remote Code Execution in React Server Components（critical、2026-11-10公開）。19.2系の修正版は19.2.9。
- GHSA-wx67-qw84-cm4g: Denial of Service in Server Functions（high）。19.2.8以降が修正版。

react/react-dom/react-server-dom-webpackを同じ19.2.9へ揃える。19.3へのminor移行やFirebaseのmajor変更を混ぜない。保存形式/データ/認証/業務feature flag/環境変数は変更しない。

設定上VercelのoutputDirectoryはdist/clientで、api以下は別のNode APIだが、これだけで実デプロイのRSC到達性がないと断定しない。custom Server Functionがないことも非該当の証明としない。Productionへ攻撃payloadを送らず、被害や侵入が起きたとは推定しない。

## 検証

mainからの独立checkoutでlint/typecheck/既存66 unit suites/15 Firestore emulator scripts/Production相当buildを再実行する。別feature branchの72 suitesの結果をこのmain用修正のPASSへ流用しない。完了時の実結果はevidence.jsonを参照。

npm auditのRSC対象指摘が消えることを確認する。他の依存パッケージの指摘を、この更新だけで全解消したとは報告しない。Preview/buildとProduction反映は別の判定。

## 公開前

この単独PRは他の課金/共有/通知/紹介の機能追加を含まない。本番反映には、今回の利用者指示に従い本人の承認が必要。mainへのmerge/デプロイ/フラグ変更は実行しない。

一次資料:
- https://github.com/advisories/GHSA-xqc2-xf4c-x3h3
- https://github.com/advisories/GHSA-wx67-qw84-cm4g
