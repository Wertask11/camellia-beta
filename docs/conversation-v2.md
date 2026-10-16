# Phase 2B — Conversation v2

Base main03ff2cc。Circle/Placeの公開状態に依存しない独立PR。モデルは公式 @google/genai、既定gemini-3.8-flash / gemini-3.1-flash-lite、既存env変更方式と安全設定を維持。

- 現threadのみ直近8メッセージ、本人の今日の気分・stage・カタログActionを利用。Memory/Tree/cycle/他threadは追加送信しない。
- Server JSON schemaでreply/actionIdを分離。Action cardはサーバーの6候補から最大1件。未知IDを拒否し、聞いてほしいだけ・医療等の会話ではカードを出さない。モデルの自由文をActionとして実行しない。
- 原則1〜4文/150文字・最大1質問のsystem方針を保持。返答の保護上限を700→300文字に縮小。医学的診断/服薬判断/危機対応は既存の生成に依存しない処理を維持。
- 新規/一覧/検索/日付/thread切替/再試行を維持。一覧は30件ずつ、threadは40メッセージずつ表示。保存済み履歴を削除・自動分割しない。
- ユーザーが選んだ一言をプレビューして明示保存。自動Memory保存はない。保存したMemoryをGeminiへ追加送信する変更もない。

30品質ケースは tests/fixtures/conversation-v2-evaluation.json。日常/仕事/恋愛/孤独/怒り/喜び/聞くだけ/医療/薬/自傷/暴力/緊急/履歴/Actionを網羅し、全件liveResult=UNVERIFIEDとしている。テストの固定応答を実Geminiの品質証明として扱わない。

Local: lint/typecheck/build、26 unit suites（Gemini88含む）PASS。Chromium375/390/412/768/1280で一覧/検索/切替/新規、80履歴の40件分割、composer位置、横overflow・JSerrorなしを確認（ローカル実コンポーネント）。生成client JSでAPIキー/資格情報/system prompt/Action instructionの漏洩を確認する。

未達Gate：現Previewのauth POST/実Gemini30ケース、応答時間/primary-fallback/障害UX、deployed Shared Rate Limit。Productionで見えたrateLimitMode=instanceを共有PASSと扱わない。鍵やユーザーtokenをチャットへ貼らず、本人がブラウザで確認する。Productionのenv/Rules/claimsは変更していない。
