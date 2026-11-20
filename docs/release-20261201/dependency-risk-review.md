# 残る依存指摘の確認（2026-11-20）

対象は最終候補 f93ac2a。npm auditを再取得した結果、実行依存 critical0/high0/moderate18/low5、全体 critical0/high0/moderate28/low8。exit1を指摘なしと扱わない。原本は evidence/final-execution-audit-{production,all}.json。上位packageへの伝播を含む数なので、独立した脆弱性の件数ではない。

|指摘元|現在の経路/確認|扱い|
|---|---|---|
|satori SVG escaping|vinext→@vercel/ogの間接依存。app/lib/api/screensにImageResponse/Satoriを使って本人入力をSVGへ渡す実装はない。アプリは静的prerender+固定API|現時点でその公開入力経路は確認されない。framework内部の完全な非到達性を保証せず、API互換を検証した上流更新を追跡。未検証のmajor overrideは追加しない|
|minimatch globparts amplification|shadcn→ts-morph/common等。公開API/アプリにglobを受け取る実装やshadcn実行はない|信頼したrepo/build CLIの範囲。ユーザー入力をglobとして評価する機能を追加しない。上流互換更新を追跡|
|uuid buffer bounds v3/v5/v6|Google SDK群の間接依存。アプリ側に該当APIと任意bufferを渡す実装はない|SDK内部も含め全経路の証明ではない。破壊的なuuidメジャー置換を避け、SDK更新を追跡|
|esbuild Windows dev server file read|Vite/Wrangler経路。現在の検証はLinux、dev fixtureは127.0.0.1限定。Productionは開発serverを起動しない|低リスク指摘を記録。開発serverを公開しない|
|OpenTelemetry baggage allocation / glob AbortSignal|firebase-tools等の開発/emulator依存。公開のCamellia APIにbaggage/任意globをforwardする処理はない|CI/運営CLIの信頼入力のみ。firebase-toolsの互換更新を追跡|

既知の重大/高リスク修正 #91/#94 は最終候補へ実merge済み。main/Productionへは運営承認前に反映していないため、この候補の依存判定を現在のProductionへ流用しない。残存指摘を0や完全非到達と呼ばない。
