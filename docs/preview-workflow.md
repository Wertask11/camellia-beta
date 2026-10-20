# 固定Previewの運用

ログインを伴う本人確認のURLは、今後この1つに固定します。

https://camellia-beta-git-codex-camellia-alpha-relea-161533-school-park.vercel.app/

2026-10-19に本人がLINEログインできた既存のbranch aliasです。固定branchは `codex/camellia-alpha-release-candidate`。Vercelのdeploy固有URLや、機能branch別のPreview URLをLINE callbackへ追加し続ける運用にしません。LINEのredirect_uriは既存実装どおりorigin末尾 `/` であり、上記originを変えなければ更新ごとの再登録は不要です。

## 更新

1. 実装は最新mainから作る独立branchで行い、必要なtestを済ませます。固定Preview branchを古い実装の作業baseには使いません。
2. git statusがcleanなこと、公開するcommitを確認します。
3. `git fetch origin codex/camellia-alpha-release-candidate` 後、`git merge-base --is-ancestor FETCH_HEAD HEAD` を確認します。
4. 成功した場合のみ `git push origin HEAD:refs/heads/codex/camellia-alpha-release-candidate` でfast-forward更新します。force push・reset・本番mainへのpushは使いません。
5. 既存branchにまだ入っていない別の作業がありfast-forwardできない場合は停止し、その履歴を失わない通常の統合・差分確認・検証を先に行います。
6. 対象commitのVercel Preview deploymentがsuccessになったことを確認し、本人へは上記固定URLだけを案内します。新しいdeploy IDが発行されても固定branch aliasは同じです。

機能ごとのbranch/PRは独立して保持します。固定Previewへコードを送ることは、本番merge/deployの承認ではありません。環境変数・LINEの設定・Rules・moderator claimはこの更新で変更しません。

## ログインと安全性

- 同じoriginを使い続けるため、LINEのstate/nonceとFirebaseのログイン状態を別のPreview originへ運ぶ必要はありません。tokenや認可codeをURLで横流しする仕組みは追加しません。
- LINE Developersへ登録済みの本番callbackは残します。別のPreview用callbackの削除はこの作業では行いません。
- 認証の必要な実操作は本人が行います。Vercel ReadyをLINEログイン成功や実Geminiの品質確認と取り違えません。
- このURLは確認用です。一般向け本番URLは https://camellia-beta.vercel.app/ です。
