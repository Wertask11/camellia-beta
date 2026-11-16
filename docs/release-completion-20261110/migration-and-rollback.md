# v3/v4移行・原本保護・復旧（2026-11-11）

## 保存形式と移行

既存v3を読み、本人の初回の変更時にv4へlazy migrationする。Firestore全件を一括で書き換えない。既存thread/message/Memory/Check/Treeを削除せず、旧messageにYURA attributionを捏造しない。v4は私的Place体験と削除tombstoneを保持する。

v4初回書込前の原本backup、個人recordのownerとversion検証、syncRevisionによるCASを維持する。cloud原本のrevisionが進んだら無条件overwriteせず競合として停止し、本人に選択を求める。通信失敗/容量/ファイル不正/別ownerでも元の端末状態を破壊しない。

## ファイルexportと追加復元

Myの本人exportは機微な原文を含む。本人端末に保管し、チャット・Git・分析へ送らない。復元は**同じowner**の対応版ファイルだけを受け入れ、現在の設定・既存の記録・削除tombstoneを優先して不足分だけを追加する。丸ごと巻き戻す操作ではない。analytics履歴を再送しない。

復元直前の端末原文を別キーへ退避する。退避失敗、プレビュー後の別tab変更、アカウント切替があれば適用を止める。元のexport/backupを本人が削除するまで、cloud側のresetでは消去されない。

## 個別削除・個人記録reset

個別削除はtombstoneを持ち、古いexportや他端末mergeから復活させない。cloudrootに個人削除lockを取得してから関連recordを列挙する。lock中はsyncと通常APIを拒否。通知希望があればserver停止、既存共有リンクがあれば取消を先に確認する。失敗時は端末原本とlockを残し、再試行可能にする。

削除中のCAS競合/通信断やrootの消失を別端末が検出した場合、古い端末の原本を自動で再送しない。本人が明示的に新しい記録を開くまで停止する。削除成功時はguest/referral intent/本人の端末pending analyticsも後片付けする。

**個人記録resetはCamellia ID/Firebase Auth/LINE/Googleアカウントの閉鎖やPlus契約解約ではない。** Circle文は既存の個別削除、共有は取消、運営監査/請求/紹介identity/装飾権利はそれぞれの目的と方針で扱う。全面閉鎖時のCircle削除/匿名化、共用SchoolPark identity、保持期間は運営未決定。本人データで決め打ちの破壊テストはしない。

## ロールバックの境界

2026-11-11確認のmain `91e95ba` はremote meta.version4を `REMOTE_VERSION_UNSUPPORTED` として拒否し、v4端末データを通常v3として読めない。CASは旧clientの上書きを防ぐが、旧画面へ戻すだけで正常利用が復旧するとは限らない。

したがって、v4書込後に旧mainへ全revertしない。rollback版は最低限、v4 reader/validator/export/tombstone/CAS/root deletion lock、通知停止と共有取消のprivacy保護を含める。UI/新しい導線だけを戻すpatchを優先する。運用台帳の一括削除やAuth identityの再作成を復旧手順にしない。

## 適用前の演習

1. 専用テストidentityと隔離project/emulatorでv3原本を保管。v3→v4保存/読込/export→追加復元を確認。
2. 独立client2台で同時更新・revision競合・オフライン復帰・再ログインを確認。端末Aの削除後、古い端末Bが復活させないことを確認。
3. rollback候補から同じv4を読み、Reflection/Memory/tombstoneが残ること、削除lock中は書込しないことを確認する。単体のv4parser試験だけでdeploy rollback演習成功とはしない。
4. 本番前は非公開backup/戻すcommit/Rules差分/担当と停止基準を承認。ローカル試験は合格しても、実Preview/実Rules/実端末の演習は未検証。

## 障害時

通信/同期失敗→操作を止め原本backupの存在を確認→owner/version/revision/lockの状態だけを安全に照合→最後に成功したv4対応版へ戻す。別アカウントの記録を上書きしない。lock解除・cloudroot再作成・backup復旧が必要なら具体的対象と結果をレビューし、本人承認後に専用の復旧として行う。黙って新規空データを正として採用しない。

実装試験はcompletion-sync-firestore（合成identity・実SDK/Rules emulator）、completion-data-browser（実File API/端末storage・HTTP/auth fixture）。実アカウントの双方向同期・再ログイン・export/復元・削除/旧PCタブ復活防止は本人確認済み（owner-acceptance.json）。実同時競合とdeploy rollback実績は未確認。
