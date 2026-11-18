# 実装進捗

## 基準と決定

- latest main:91e95ba。未mergeの#62〜#73を保持し、新しいstackはa628874から継承。
- Phase A:#74、branch docs/camellia-free-id-design-20261116、commit86dfb5f。コード監査・データ/認証/費用の設計。
- 本人回答：メールリンク認証は設定済み。登録不要の会話上限は1人1日30回。既存500円/月、紹介7日/月3件/永久装飾、未決定の予算/特典/期間は維持。
- Productionと固定Previewは未変更。新しいPreview URLやLINE callbackは利用者へ追加依頼しない。

## 続き

1. Phase B：unit60/60・emulator14・types/lint/build成功。無登録の主要体験と別account隔離を5幅で確認。戻る/ログアウトのルーター変更後は再確認して独立PR。
2. Phase C：メールリンク取得/明示link/verified email、端末Free記録の確認付き引継ぎ・原本保護。既存userはUIDを維持し、メール一致で勝手に統合しない。
3. Phase D：Free/IDを別軸とした既存Plus保護・Place比較/個別化・案内。未契約決済は停止。
4. Phase E：正式ブランドコピー、Privacy/Terms、ID/引継ぎ/Reflection分析、plan/id_state、モバイル/エラー/アクセシビリティ。
5. Phase F：新head全体検証・固定Preview・本人のメール/登録不要体験受入、PostHog594848の実着信、Production適用前の判定と最終9項目。

自動試験と実アカウント/実機/providerを分ける。未検証をPASSにしない。
