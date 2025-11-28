# Project Galaxy

Project Galaxy は、リモートチームのための次世代コラボレーションプラットフォームです。

## 必要要件

*   Node.js (v18以上推奨)
*   npm

## セットアップと起動方法

このプロジェクトはモノレポ構成（`client` と `server`）になっています。
以下のコマンドで、依存関係のインストールと開発サーバーの起動を一括で行えます。

### 1. 依存関係のインストール

```bash
npm run install:all
```

### 2. 開発サーバーの起動

```bash
npm run dev
```

このコマンドを実行すると、以下が同時に起動します：
*   **Frontend**: [http://localhost:5173](http://localhost:5173)
*   **Backend**: [http://localhost:3001](http://localhost:3001)

## プロジェクト構成

*   `/client`: React + Vite + TypeScript (フロントエンド)
*   `/server`: Node.js + Express + Socket.io (バックエンド)
