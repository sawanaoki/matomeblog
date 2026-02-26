# まとめサイト自動化システム - 確認手順 (Walkthrough)

## システム概要
本システムは、各種ソース（RSS等）から情報を自動収集し、Astroで構築されたフロントエンドに記事として公開する一連のフローを提供するものです。
モダンなグラスモーフィズムデザイン（Glassmorphism）を採用し、ユーザーの目を惹くリッチなUIに仕上げています。

## 現在実装済みの機能
- **バックエンド (scraper)**
  - 指定したRSS URLから記事をスクレイピングし、タイトル・リンク・本文スニペットを収集します。
  - **NEW:** SQLite (`data.db`) を内蔵データベースとして採用。取得した記事を蓄積し、最新100件をJSON形式でフロントエンドに出力します。
- **フロントエンド (frontend)**
  - **Astro**による超高速な静的サイトジェネレータ構成。
  - 目を惹くグラデーションアニメーションや、グラスモーフィズムを使ったヘッダー・カードUI。
  - `articles.json`から静的ルートを自動生成し、詳細ページを作成します。
  - AI要約モックアップや、まとめサイト風の大黒柱となる「反応まとめ（コメントレス）」のUIモックアップを実装済み。

## 起動・確認方法

1. **データ収集の実行**
   ```powershell
   cd d:\ソフト開発\news\scraper
   node rssFetcher.js
   ```
   上記スクリプトを実行すると、`frontend/src/data/articles.json` に最新のデータが生成されます。

2. **フロントエンドのプレビュー**
   ```powershell
   cd d:\ソフト開発\news\frontend
   npm run dev
   ```
   プレビュー用サーバーが立ち上がるので、ブラウザで `http://localhost:4321` にアクセスしてください。

## 今後の拡張・本番運用に向けて（GitHub連携）
完全に自動化（GitHub Actionsを利用した1時間ごとの自動更新）を動かすためには、作成したこのプロジェクトをGitHubにアップロードする必要があります。

1. **GitHubで空のリポジトリを作成**します（例: `esuteru-clone`）
2. **ローカルからプッシュ**します。ターミナルで以下を実行してください：
   ```powershell
   cd d:\ソフト開発\news
   git remote add origin https://github.com/あなたのユーザー名/リポジトリ名.git
   git branch -M main
   git push -u origin main
   ```
3. GitHubリポジトリの **Settings > Secrets and variables > Actions** に移動し、`New repository secret`をクリックして以下を登録します。
   - Name: `OPENAI_API_KEY`
   - Secret: （ChatGPTのAPIキー）
   ※APIキーがない場合は登録不要ですが、AI要約はダミーテキストになります。

これで、毎時0分にGitHub Actionsが自動でニュースを収集・更新するようになります。
