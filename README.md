# Camellia prototype

女性の身体・心・生活をやさしく捉え、その日の自分に合う行動につなげるスマホファーストの実動プロトタイプです。

## 起動方法

Node.js 22.13以降を用意し、プロジェクト直下で次を実行します。

```bash
npm install
npm run dev
```

表示されたローカルURL（通常は `http://localhost:3000`）をブラウザで開きます。初回はオンボーディングが表示されます。初期状態に戻す場合は、ブラウザのlocalStorageにある `camellia-prototype-v1` を削除してください。

## Gemini会話（Preview検証）

`api/camellia/chat.ts` はVercel Node Functionです。Geminiの鍵はサーバー環境変数 `GEMINI_API_KEY` のみで読み込み、ブラウザへ渡しません。`GEMINI_MODEL` の初期値は `gemini-3.8-flash`、`CAMELLIA_GEMINI_CHAT_ENABLED` が `true` のときだけ会話画面から利用できます。Previewではこのフラグと鍵を設定してください。Productionはさらに `CAMELLIA_GEMINI_CHAT_PRODUCTION_APPROVED=true` が必要で、初期値ではOFFです。

PreviewでFree Tierを使う場合、Google側で送信内容が製品改善に利用される可能性があります。会話画面は入力欄付近に外部送信を短く表示し、メッセージ送信時にAPIへ送信します。「使う／使わない」の追加確認は表示しません。Flag OFFまたは鍵未設定の場合は従来の端末内会話へフォールバックします。

Geminiへ渡す履歴は、Geminiで返答した会話だけの最大8件です。端末内の返答はMemoryやMy Treeを引用する場合があるため除外します。My Treeから開く会話は端末内処理のみです。保存されたMemoryや生理情報は参照しませんが、本人が本文に入力した内容は送信対象になります。未知の個人名・住所などの完全な自動検出はできません。

API Functionの依存にはNode ESMで解決できる相対 `.js` パスを使用します。Viteのalias解決に依存しません。ローカル `npm run dev` はVercelの `api/` を実行しないため、実APIの検証にはVercel Previewが必要です。`npm run test:gemini` と `npm run typecheck` で境界処理を確認できます。Rate LimitはFunctionインスタンスごとに10件/5分で、複数インスタンスを横断する厳密な制限ではありません。Production有効化前に共有ストアによる制限と運用監視を検討してください。

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
