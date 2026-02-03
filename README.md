# YouTube Auto Player

YouTubeの動画一覧を順番に自動再生するChrome拡張機能です。

## 機能

- **自動連続再生**: 動画が終了すると自動的に次の動画に進みます
- **手動操作**: 「次へ」ボタンで任意のタイミングで次の動画に進めます
- **ON/OFF切り替え**: 自動再生の有効/無効を簡単に切り替え可能
- **再生位置表示**: 現在何番目の動画を再生しているか表示
- **複数ページ対応**:
  - 検索結果ページ
  - 再生リストページ
  - チャンネルページ
  - ホーム/おすすめページ

## インストール方法

1. **Chrome拡張機能の開発者モードを有効化**
   - Chromeで `chrome://extensions/` を開く
   - 右上の「デベロッパーモード」をONにする

2. **拡張機能を読み込む**
   - 「パッケージ化されていない拡張機能を読み込む」をクリック
   - `youtube-autoplay-extension` フォルダを選択

3. **完了**
   - 拡張機能が読み込まれ、ツールバーにアイコンが表示されます

## 使い方

### 基本的な使い方

1. **YouTubeで動画一覧ページを開く**
   - 検索結果、再生リスト、チャンネルページなど

2. **コントロールパネルが表示される**
   - ページの右下に自動的に表示されます
   - 最小化ボタン（−）でコンパクト表示に切り替え可能

3. **自動再生を開始**
   - 「自動再生: OFF」ボタンをクリックしてONにする
   - 動画を再生すると、終了時に自動的に次の動画に進みます

4. **手動で次へ進む**
   - 「次へ →」ボタンをクリック
   - 自動再生がOFFの状態でも使用可能

### ポップアップUIから操作

1. **拡張機能アイコンをクリック**
   - ツールバーのアイコンをクリック

2. **状態を確認**
   - 自動再生の状態（ON/OFF）
   - 現在の再生位置（3 / 10 など）

3. **設定を変更**
   - 「自動再生を開始」ボタンで切り替え
   - 「リセット」ボタンで状態をクリア

## 仕様詳細

### 対応ページ

- **検索結果**: `youtube.com/results?search_query=...`
- **再生リスト**: `youtube.com/playlist?list=...` または動画視聴ページのリストパラメータ
- **チャンネル**: `youtube.com/@channel/videos` または `youtube.com/channel/...`
- **ホーム**: `youtube.com/` または `youtube.com/feed/explore`

### 動作の仕組み

1. **動画検出**: ページ上の動画リンクを自動検出
2. **再生監視**: 動画プレイヤーの終了イベントを監視
3. **自動遷移**: 動画終了時に次の動画URLに遷移
4. **状態保存**: Chrome Storage APIで状態を永続化

### 制限事項

- YouTube Premium の機能（バックグラウンド再生など）には影響しません
- 広告のスキップは行いません
- 動画の自動ミュートは行いません

## トラブルシューティング

### コントロールパネルが表示されない

- ページをリロードしてみてください
- 拡張機能が有効になっているか確認してください
- コンソールログでエラーを確認してください（F12 → Console）

### 自動再生が動作しない

- 「自動再生: ON」になっているか確認
- 動画リストが正しく取得されているか確認（0 / 0 でない）
- ブラウザの自動再生ポリシーにより、最初のクリックが必要な場合があります

### 動画が見つからない

- ページの読み込みが完了してから数秒待ってください
- YouTube側のDOM構造が変更されている可能性があります

## 開発情報

### ファイル構成

```
youtube-autoplay-extension/
├── manifest.json              # 拡張機能設定
├── background/
│   └── service-worker.js      # バックグラウンド処理
├── content/
│   ├── content-script.js      # メインコントローラー
│   ├── video-detector.js      # 動画検出
│   ├── player-controller.js   # 再生制御
│   └── ui-injector.js         # UI挿入
├── popup/
│   ├── popup.html             # ポップアップUI
│   ├── popup.js               # ポップアップロジック
│   └── popup.css              # スタイル
├── styles/
│   └── content-styles.css     # コンテンツページスタイル
├── utils/
│   ├── storage.js             # ストレージ管理
│   └── constants.js           # 定数定義
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### 技術スタック

- **Manifest V3**: 最新のChrome拡張機能仕様
- **Vanilla JavaScript**: フレームワーク不使用
- **Chrome Storage API**: 状態の永続化
- **MutationObserver**: DOM変更の監視

### デバッグ方法

1. **コンソールログを確認**
   ```
   F12 → Console タブ
   ```

2. **ストレージの確認**
   ```javascript
   chrome.storage.local.get(null, console.log)
   ```

3. **拡張機能のリロード**
   ```
   chrome://extensions/ → リロードボタン
   ```

## ライセンス

MIT License

## バージョン履歴

- **v1.0.0** (2026-01-27)
  - 初回リリース
  - 基本的な自動再生機能
  - 複数ページタイプ対応
  - ポップアップUI実装

## 今後の機能追加予定

- [ ] シャッフル再生
- [ ] リピート再生
- [ ] 再生履歴の記録
- [ ] キーボードショートカット
- [ ] プレイリストの保存機能
- [ ] フィルタリング機能

## 配布サーバー（開発用）

### サーバーのセットアップ

1. **依存関係のインストール**
   ```bash
   npm install
   ```

2. **サーバーの起動**
   ```bash
   npm run dev
   ```

3. **ブラウザでアクセス**
   - ローカル: `http://localhost:3000`
   - ネットワーク: `http://[あなたのIPアドレス]:3000`

### ポータルサイト機能

- **自動ビルド**: サーバー起動時に拡張機能を自動的にZIP化
- **ダウンロード**: ブラウザからワンクリックでダウンロード
- **リビルド**: ポータル上の「リビルド」ボタンでいつでも再ビルド可能
- **複数拡張対応**: `server/config.json`に追加するだけで簡単に拡張機能を追加可能

### 新しい拡張機能の追加方法

1. **`server/config.json`を編集**
   ```json
   {
     "extensions": [
       {
         "id": "new-extension",
         "name": "新しい拡張機能",
         "version": "1.0.0",
         "description": "拡張機能の説明",
         "icon": "/icons/icon.png",
         "author": "作成者名",
         "sourceDir": "../new-extension",
         "excludePatterns": [
           "server/**",
           "node_modules/**",
           "*.md"
         ]
       }
     ]
   }
   ```

2. **サーバーをリスタートまたはリビルド**
   - サーバー再起動: `Ctrl+C` → `npm run dev`
   - または、ポータル上の「リビルド」ボタンをクリック

### 手動ビルド

```bash
npm run build
```

ビルドされたZIPファイルは `dist/` フォルダに生成されます。

### ccc.jkjk.ukへのデプロイ

#### 自動デプロイ（推奨）

1. **デプロイスクリプトを実行**
   ```bash
   bash deploy.sh
   ```

   このスクリプトは自動的に以下を実行します:
   - サーバーへのファイルアップロード
   - Node.js, PM2, Nginxのインストール
   - アプリケーションの起動
   - Nginxのリバースプロキシ設定

2. **SSL証明書のセットアップ（推奨）**
   ```bash
   # サーバーにSSH接続
   ssh root@ccc.jkjk.uk

   # SSL設定スクリプトを実行
   bash setup-ssl.sh
   ```

3. **完了**
   - HTTP: http://ccc.jkjk.uk
   - HTTPS: https://ccc.jkjk.uk （SSL設定後）

#### 手動デプロイ

詳細な手順は [server-commands.md](server-commands.md) を参照してください。

#### サーバー管理

```bash
# アプリケーションの状態確認
pm2 status

# ログ確認
pm2 logs extension-portal

# アプリケーション再起動
pm2 restart extension-portal

# Nginx再起動
sudo systemctl restart nginx
```

詳細は [server-commands.md](server-commands.md) を参照してください。

## フィードバック

問題や改善要望がある場合は、開発者にお知らせください。
