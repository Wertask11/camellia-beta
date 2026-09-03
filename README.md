# Camellia prototype

女性の身体・心・生活をやさしく捉え、その日の自分に合う行動につなげるスマホファーストの実動プロトタイプです。

## 起動方法

Node.js 22.13以降を用意し、プロジェクト直下で次を実行します。

```bash
npm install
npm run dev
```

表示されたローカルURL（通常は `http://localhost:3000`）をブラウザで開きます。初回はオンボーディングが表示されます。初期状態に戻す場合は、ブラウザのlocalStorageにある `camellia-prototype-v1` を削除してください。

## 使用技術

- Next.js互換 App Router（Vinext / Vite）
- React 19
- TypeScript
- Tailwind CSS 4
- Lucide React
- localStorage

## フォルダ構成

- `app/page.tsx` — 画面、状態管理、ダミーデータ、全インタラクション
- `app/globals.css` — ブランドトークンとレスポンシブUI
- `app/layout.tsx` — 日本語設定とメタデータ
- `components/ui` — 再利用可能なUIプリミティブ
- `.openai/hosting.json` — Sites公開設定

## 実装済み機能

- Today / Check / AI / Discover / Circle / Place の6タブ
- Check入力・保存、Todayへの反映、7日間チャート
- 状態・キーワードに応じたAI Camelliaのルールベース会話
- Discoverのカテゴリ絞り込み、詳細、やってみる、あとで、興味なし
- Circle参加、詳細、いいね、投稿追加
- Placeカテゴリ絞り込み、詳細、地図風表示、予約デモ
- 初回オンボーディング
- プロフィール編集・保存
- Free / Camellia+ / REAL の料金比較
- localStorageによる端末内保存
- モバイル幅と中央スマホ表示のレスポンシブ対応
- WebMCPのチェックイン記録ツール（対応ブラウザのみ）

## 未実装機能

- 本物の生成AI、地図、位置情報、予約、決済
- 認証、クラウド同期、複数端末同期
- 実ユーザー同士のSNS通信
- 本番用の医療判断や健康データ連携

## 次に実装する候補

- Apple Health / Google Health Connect連携
- セキュアなアカウントと同期
- AI会話の安全設計と専門家監修
- 実店舗・イベントの予約連携
- アクセシビリティと実ユーザーテストの拡充
