export function PrivacyScreen({ onBack }: { onBack: () => void }) {
  return (
    <main className="screen privacy">
      <button className="back" onClick={onBack}>
        ← Myへ戻る
      </button>
      <header>
        <div>
          <p className="eyebrow">プライバシー</p>
          <h1>保存される情報について</h1>
        </div>
      </header>
      <section className="panel">
        <h2>Memoryについて</h2><p>会話で「覚えておいて」と伝えた内容は候補として表示し、あなたが保存を選んだ一言だけをMemoryとして参照します。MyからMemoryを外せます。会話履歴そのものは別の記録として保存・同期されます。</p>
      </section>
      <section className="panel">
        <h2>保存・同期される情報</h2>
        <p>
          プロフィール、日々のCheck、選んだ行動と振り返り、あとで見る、見送り理由、Camelliaとの会話、今日の一枚、My
          Treeの名前・タグ・メモ、Insightへの回答、操作イベントを、このブラウザのlocalStorageに保存します。ログイン中は、同じ記録をSchoolParkのFirestore（camellia_users/{'{uid}'}）にも同期します。
        </p>
        <p>
          同期対象には、プロフィール、Check（気分・任意の睡眠/体調/ストレス/生理関連入力）、Action、Reflection、Fortune、My Tree、Insight、Camellia AIの会話が含まれます。同期データはSchoolParkの運営管理機能から確認できる場合があります。
        </p>
        <p>
          Camellia AIは現在、入力内容を端末内のルールベース処理で扱い、外部の生成AI APIには送信しません。サービス改善のための操作イベントはPostHogへ送信されます。イベント送信では許可した計測項目だけを使い、会話本文やCheckの自由入力本文は含めません。ブラウザ内保存に加えてFirestore同期を行うため、ログインしたアカウントでは別端末から記録を引き継げる場合があります。
        </p>
      </section>
      <section className="panel">
        <h2>My Treeについて</h2>
        <p>
          My
          Treeは本人向けの記録機能です。人間関係を評価・順位付けせず、連絡頻度によるスコアや通知も行いません。保存内容は上記のとおりFirestoreへ同期され、運営管理機能から確認できる場合があります。
        </p>
      </section>
      <section className="panel">
        <h2>健康情報と今日の一枚</h2>
        <p>
          入力内容は、今日の提案や振り返りを調整するために使います。生理情報はプロフィールで利用をオフにできます。今日の一枚は未来や健康状態を断定するものではありません。
        </p>
        <p>
          <strong>Camelliaは医療診断を行うサービスではありません。</strong>
          体調について不安がある場合は、医療機関など専門家へ相談してください。
        </p>
      </section>
      <section className="panel">
        <h2>データの削除</h2>
        <p>
          Myの「保存データを削除する」から、このブラウザのCamelliaデータを削除できます。ログイン中のCamelliaアカウントに同期済みの記録がある場合は、その記録も削除します。未ログインで過去の同期履歴が確認された場合は削除を止め、同期したアカウントへのログインを案内します。運営用の管理記録・返信、ログイン方法の連携記録と、PostHogへ送信済みの操作イベントは削除されません。同期データを削除できなかった場合は、削除失敗を表示し、端末内データも消去しません。
        </p>
      </section>
      <p className="meta">
        詳しくは<a href="/privacy.html" target="_blank" rel="noopener">プライバシーポリシー</a>と<a href="/terms.html" target="_blank" rel="noopener">利用規約</a>をご覧ください。
      </p>
    </main>
  );
}
