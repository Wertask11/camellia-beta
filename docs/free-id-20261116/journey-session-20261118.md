# 登録前後の導線照合を補完

既存Check導線の実受領を確認した後、匿名→IDの照合仕様を実コードへ再照合した。アプリの各イベントには発生時の `sessionId` があるが、Check等で明示的なproperties.entry_sessionを付けなかった場合、HTTPの許可属性へ出ていなかった。既存IDだけのイベント件数は取得できても、登録前後の段階をこの属性で照合するには不足していた。

新しいfree_id_v1イベントで、当該イベントの許可属性にentry_sessionが含まれ、明示値がない場合だけ、発生時に保存されたsessionIdをUUID検証して補完する。再送時の現在のアカウント/時計/セッションは参照しない。本人が明示引き継ぎした場合のentry_sessionは優先する。旧schema1への後付け、人物のalias、UID・メール・本文の送信は行わない。

unitでは、発生時の値、明示的な引き継ぎの優先、無効ID拒否、旧イベント不変更を確認。実SDK＋ローカルHTTPで、Check→ID取得成功→移行成功のentry_sessionが一致し、人物IDは別のままであることを確認する。実PostHog受領は別の証拠・判定とする。

今回の6イベントの実受領はsource8359d90の既存外部ID操作であり、この追加修正や匿名・メールID完了の実受領へ流用しない。本番、Rules、環境変数、共有/課金/通知/紹介の停止状態は変更しない。

新しい作業ツリーでlint/typecheck/65 unit suites/15 Firestore emulator scripts/buildをすべて再実行しPASS。実SDK・Free・メールIDの3群で5幅を再実行しPASS。実SDKのCheck→ID完了→引き継ぎ完了ではentry_session一致をassertした。証拠は `evidence/journey-session-20261118.json` と専用browser JSON3件。
