# 依存関係の追加修正（2026-11-19）

React19.2.9の独立修正に続く、依存ライブラリだけの変更。mainへmerge・本番deployしていない。

- Vite8.0.13→8.3.8、shadcn4.18→4.23。Firebase・FirebaseAdmin・Gemini SDKのmajor変更やダウングレードを行わない。
- gRPC1.14.6以上の同一major、ws8.22、undici7.30.1以上の同一majorへ限定。image-size2.0.2→2.0.3は既存のnamed imageSize APIを維持するpatch。vinext自体を新しいReact19.3系列へ置き換えて解決しない。
- ビルド・テスト側のhappy-dom21.0.4、tinypool2.1.2、sharp0.35.5も修正。APIのmajor境界を含む開発用更新は実行用変更と区別し、既存全テストを再実行した。
- 最初の互換範囲更新だけでは開発用重大問題が残ったため、追加修正後に再監査した。`npm audit fix --force`は使用していない。

最終監査ファイルを同ディレクトリへ保存。実行依存は critical0/high0/moderate18/low5（計23）。開発用を含む全体は critical0/high0/moderate28/low8（計36）。**指摘ゼロではない**。npm auditの依存経路件数であり、異なる脆弱性の件数や実際の悪用件数ではない。

残る指摘にはGoogle認証/Cloudクライアントの依存、OG画像レンダリング、開発サーバーやCLIの依存がある。Linuxの静的配信で実際に到達するかを未確定のまま「影響なし」としない。FirebaseAdminやvinextの大規模更新を行う場合は、認証・Rules・全UI・本番相当パッケージの追加検証を別PRで行う。開発サーバーを公開せず、未確認のHTML/SVGや設定をこれらのツールで実行しない運用を維持する。

修正済みの主な一次資料: GHSA-m9gg-hp2v-232j（gRPC）、GHSA-96hv-2xvq-fx4p（ws）、GHSA-5p2g-fcmc-qvqq/GHSA-w3rx-r6r6-pgpr（image-size）、GHSA-5gmw-xhrv-c9v3/GHSA-85c8-ppgw-ccpr（tinypool）、GHSA-834v-8h66-3h79/GHSA-c8p4-j97h-3vg8（happy-dom）。詳細はaudit JSON内のURLを参照。攻撃コードの送信や、本番侵害の有無を調べる操作はしていない。

検証: lint/typecheck、unit66/66、Firestore emulator15 scripts、Production相当build、375/390/412/768/1280の実Chromiumで無料Check/Fortune/会話/Memory/Tree/Place振り返り/再読込・別アカウント原本保護。ブラウザのAuth/同期/providerはfixtureで、実ログイン・実Gemini・実機ではない。後続機能スタックへ取り込んだら、その統合sourceで追加の全試験が必要。
