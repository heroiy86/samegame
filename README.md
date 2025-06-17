# さめがめゲーム

シンプルなさめがめ（SameGame）のWebゲームです。

## 遊び方

1. 同じ色のブロックを2つ以上つなげてクリックすると消えます
2. たくさんつなげるほど高得点がもらえます
3. ブロックが消えた後は、上のブロックが下に落ちます
4. 空の列は右側に詰められます
5. これ以上消せるブロックがなくなるとゲームオーバーです

## デプロイ方法

このゲームをGitHub Pagesで公開するには、以下の手順でリポジトリを作成し、`gh-pages`ブランチを有効にしてください。

1. 新しいリポジトリを作成
2. ファイルをアップロード
3. リポジトリの設定から、GitHub Pagesのソースを`gh-pages`ブランチに設定

または、[GitHub Desktop](https://desktop.github.com/) を使用するか、以下のコマンドを実行してください：

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin あなたのリポジトリURL
gh repo create
gh pages -d .
```

## ライセンス

MIT License
