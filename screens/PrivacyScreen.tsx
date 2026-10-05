export function PrivacyScreen({ onBack }: { onBack: () => void }) {
  return <main className="screen privacy">
    <button className="back" onClick={onBack}>← Myへ戻る</button>
    <header><div><p className="eyebrow">プライバシーと保存</p><h1>保存される情報について</h1></div></header>
    <section className="panel"><h2>Camelliaアカウントに保存する情報</h2>
      <p>プロフィール、日々のCheck、選んだ行動と振り返り、あとで見る、Camelliaとの会話、今日の一枚、My Tree、Insightへの回答、操作イベントを、Camelliaアカウントに紐付けて保存します。</p>
      <p>端末内のlocalStorageにも、オフライン利用と既存βデータの移行のために控えを保存します。ブラウザのデータだけを削除しても、アカウント側の保存済みデータは削除されません。</p>
    </section>
    <section className="panel"><h2>運営による確認</h2>
      <p>サービス運営、問い合わせ対応、安全性の確認のため、権限を持つ運営者が保存内容を確認することがあります。ユーザー一覧に会話やMy Treeの本文を常時表示せず、詳細を開いた場合に限って確認する設計です。</p>
    </section>
    <section className="panel"><h2>分析サービスへ送る情報</h2>
      <p>サービス改善のため、個人を直接特定しない操作イベントをPostHogへ送ります。名前、生年月日、Passport ID、LINE ID、会話本文、My Treeの本文、月経やCheckの入力値はPostHogへ送りません。</p>
    </section>
    <section className="panel"><h2>健康情報と今日の一枚</h2>
      <p>入力内容は、今日の提案や振り返りを調整するために使います。月経に関する入力はプロフィールで利用をオフにできます。今日の一枚は未来や健康状態を断定するものではありません。</p>
      <p><strong>Camelliaは医療診断を行うサービスではありません。</strong>体調について不安がある場合は、医療機関など専門家へ相談してください。</p>
    </section>
  </main>;
}
