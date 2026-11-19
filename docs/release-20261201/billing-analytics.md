# 支払い完了の計測（コード接続・公開OFF）

## 対象と個人情報

`plus_complete` は署名確認済みの500円決済から作る。フロントの戻りURLや本人の自己申告から作らない。申込時に既存のDNT/opt-out/記録引き継ぎ中の配送停止を尊重し、許可されたランダムな分析IDだけを任意で紐付ける。生のFirebase UIDを分析IDの代替にしない。

今回の接続では申込開始から45分間の短い帰属確認期間を設けた。数か月後の自動更新を以前の計測許可で新しいPlus加入として数えない。遅れて届いた初回支払いも期間外なら権利を通常どおり更新し、分析イベントだけを作らない。したがって `plus_complete` は会計売上/全請求の台帳とは一致しない。実売上や更新率はStripeの正規台帳で別に照合する。

Outboxは非公開で、sourceの版・顧客との保護された紐付け・原本profileの世代・帰属時刻・ランダムinsert IDを扱う。送信payloadは `plus_complete`、額500、JPY、ランダム分析ID、同じinsert ID、時刻、固定schema/sourceのみを再構築する。メール、顧客ID、UID、請求ID、カード情報、本文、Check、Treeを送らない。serverイベントはschema3として既存client schema1/2と区別する。

MyのPlus案内内「支払い完了の計測を止める」は本人認証で自分の今後の送信を止める。料金・有料権利・解約は変えない。匿名/未確認メール/他人のUID指定を拒否する。送信直前に停止と原本の存在/世代/削除ロックをトランザクションで確認し、個人記録の削除・再作成後の古いイベントも送らない。送信処理中や送信済みのイベントを回収できるとは案内しない。

## 起動条件と手順

既存 `/api/camellia/billing` 内に統合し、APIエントリー12本を維持する。Stripeの新規受付を止めても、計測停止操作は利用可能。新しい公開env値は設定していない。

- `CAMELLIA_BILLING_ANALYTICS_ENABLED=true`
- `CAMELLIA_POSTHOG_PROJECT_TOKEN`：対象594848の公開プロジェクトtoken。personal API keyを入れない。
- `CAMELLIA_BILLING_ANALYTICS_DISPATCH_SECRET`：サーバー/運営だけの64hex。
- protected `config/billing_analytics`：approved/enabled/privacyReviewed/approvedBy/approvedAt、projectId=594848、host=`https://us.i.posthog.com`。
- `config/retention.collections.billing_analytics_outbox`：承認済みの正の期間。未設定では新規申込/計測送信を開始しない。

運営は保護されたPOST `/api/camellia/billing?analytics=dispatch` へ `{operation:"plan"}` を送り、件数・digestを確認する。別承認後に同じcursorと `{operation:"dispatch",approvedDigest:"..."}` を送る。秘密のBearer値はログ・チャット・Gitへ記載しない。20件ずつページングし、送信前にも停止を確認する。URL/宛先/payloadを利用者から受け取らず、固定US送信先を使う。自動ジョブは設置していない。

同時の運営実行でも永続claimで二重送信しない。処理中・通信結果不明・HTTP拒否は自動再送せず、支払い台帳と分析着信を運営が確認する。同じinsert IDは保持するが、外部サービスを含めたexactly-onceを保証しない。結果は `http_accepted` と記録し、PostHog実着信・Insight表示とは区別する。計測エラーで支払い済みの権利を取り消さない。

保持期間の承認があるOutboxはexpiresAtも設定する。物理削除は既存の許可コレクション・dry-run・digest承認の削除ジョブへ接続し、実行しない限り「削除済み」としない。計測停止の設定は再送抑止のため別の保護領域に保持し、消去依頼は認証ID・契約記録と分けて運営が確認する。

## 検証範囲

自動試験は実Firestore emulatorとローカルHTTPへ送信する注入driverで検証する。実際のStripe/Webhook/Project594848へのイベントは送っていない。375/390/412/768/1280幅のChromiumで支払い同意・同じintent再試行・計測停止・Escape・横overflowを確認した。認証/決済応答はfixture。

PostHog接続は応答せず、中断後の25秒で打ち切った再試行も失敗した。実プロジェクトの着信・新funnel・D1/D7/D30・転換実績は未検証で、架空の人数/率を報告しない。新しいschema/sourceを既存のInsightsと混同しない条件で、運営がテスト決済と実着信を確認してから公開する。
