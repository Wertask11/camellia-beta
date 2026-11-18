# 本番Place起動エラー修正

2026-11-18、PR #62〜#81を統合したmain ac26a0bのデプロイ後、Place status GETがFUNCTION_INVOCATION_FAILED/500となることを確認。他の公開ステータスと認証/Origin拒否は動作。未認証membership GETの200は、Free/非決済を返す既存の正しい仕様であり、テスト期待値を訂正する。

Place recommendationはJST日付を使うためにFortune engineをimportし、その先の画面用 `@/data/tarot` までサーバー起動時に読み込んでいた。Viteのalias対応SSRテストでは隠れていたため、alias変換を使わないNode/CommonJSで依存グラフを再現するとエラーになった。

JST日付を依存のない共通helperへ分離し、Fortuneの既存exportを維持しつつPlaceも同じ実装を参照する。ランキング、本人の希望、同意、日付境界、カード内容、権限、データ、設定、課金等は変更しない。

再発防止試験はサーバー依存グラフをTypeScript→CommonJSへalias無しで変換し、画面用aliasやFortune catalogへの依存を拒否する。require(ESM)を無効化したNodeでloadとJSTの同日判定を検証。修正前に@/data/tarot依存でFAIL、修正後PASS。lint/typecheck/66 unit suites/15 Firestore emulator scripts/Production buildも再実行してPASS。

Previewで確認してから追加PRをmainへ反映する。Rules、claims、環境変数、課金/共有/紹介/通知の公開設定は変更しない。ロールバックでv4非対応の旧mainへ戻さない。
