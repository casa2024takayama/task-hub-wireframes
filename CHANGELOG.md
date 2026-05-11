# 変更履歴 / CHANGELOG

このプロジェクトのバージョン管理は [Semantic Versioning](https://semver.org/lang/ja/) に概ね準拠する（MVP 段階なので Minor の運用は緩め）。
フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/) に準拠。

**バージョン番号は `package.json` の `"version"` が一次情報。** ビルド時に `__APP_VERSION__` として埋め込まれ、設定画面で表示される。

---

## [Unreleased]

## [0.4.0] — 2026-05-11

### 追加
- **AI 自動振り分け（Firebase AI Logic / Gemini）**: 受信箱に貼り付けたテキストが 50 文字以上のとき、Gemini が自動で
  タスクタイトル / プロジェクト（既存のもの） / サイズ / 締切日 を推測し、振り分けフォームの初期値として反映
  - 結果は `InboxItem.suggestion` に保存し、Firestore 同期されるので他端末でも再利用される
  - 解析中・失敗・成功・スキップの状態をバッジ表示
  - 50 文字未満は AI を呼ばず手入力にフォールバック
- 設定画面に Firebase AI Logic の有効化手順を追記
- 型: `InboxSuggestion` / `InboxSuggestionStatus` を追加
- ストア: `setInboxSuggestion(id, suggestion)` を追加

### 注意
- Firebase コンソールで「AI Logic → Gemini Developer API」を有効化する必要あり
- 失敗時は手動入力にフォールバックする設計

## [0.3.2] — 2026-05-11

### 追加
- 設定画面に **Google 連携 / Google ログイン**（端末間で同一 Firestore データを参照する手順）
- Firebase Auth: `linkWithPopup`（初回端末）と `signOut` + `signInWithPopup`（2 台目以降）の導線

### 変更
- Firestore 同期は **Zustand persist のハイドレーション完了後**に開始し、古い localStorage がクラウドを上書きしにくい順序に変更
- 認証 UID が変わったときにリアルタイム購読を張り直すよう `onAuthStateChanged` で再初期化

### ドキュメント
- 設定画面に「匿名は端末ごとに別 UID」「承認済みドメイン」を短く記載

## [0.3.1] — 2026-05-11

### 変更
- `index.html` に `Cache-Control: no-cache` 系のメタタグを追加し、ブラウザが古い HTML を使い続けないようにした
- 設定画面（アプリ情報）に「最新版を取得」ボタンを追加。CacheStorage をクリアしてクエリ付き URL で再読込

### 修正
- デバイスごとに古いバージョンがキャッシュされて「v0.3.0 に上がらない」「Firestore 同期しない」事象を緩和（古い JS が動いていたのが本質）

## [0.3.0] — 2026-05-11

### 追加
- **Firebase Firestore によるクロスデバイス同期**
  - 匿名認証 + `users/{uid}/data/main` でリアルタイム同期
  - ヘッダーに同期ステータスドット表示（同期済み / 保存中 / オフライン / エラー）
  - Firestore オフラインキャッシュ有効化（オフライン時も動作）
- GitHub Pages への自動デプロイ（`.github/workflows/deploy.yml`）

### 変更
- 入力欄の **Enter 送信を廃止**。日本語 IME の変換確定 Enter による誤登録を完全に防止するため、送信は「受信箱へ」ボタンのみに変更
- 設定画面でバージョン番号と最終更新時刻を大きく表示するよう改修
- `vite.config.ts` で Firebase / React のコード分割を導入

### 修正
- IME 変換中の Enter キーで受信箱に誤登録されるバグを修正

## [0.2.0] — 2026-05-11

### 追加
- 環境設定画面 (`/settings`) を新設
  - データのエクスポート（JSON ダウンロード）
  - データのインポート（JSON 復元）
  - データクリア（確認モーダル付き、localStorage 削除 + 再読込）
  - アプリ情報（バージョン番号 + 直近の変更履歴抜粋）
- ヘッダー右側に**現在日時の表示**（M/D（曜）HH:MM、1 分ごとに更新）
- ヘッダーナビに**設定リンク**を追加
- レポート画面に「**最近完了したタスク**」一覧セクションを追加（直近 20 件、新しい順）
- **`CHANGELOG.md` 運用開始**（以降の変更はここに追記）

### 変更
- ストア（`src/store/index.ts`）に `exportData` / `importData` / `clearAll` のユーティリティ関数を追加

## [0.1.0] — 2026-05-11

### 追加
- 静的 HTML ワイヤーフレームから **Vite + React 19 + TypeScript + Tailwind v3** への移植
- Zustand ストア（`persist` で localStorage 永続化、キー: `task-hub-storage`）
- 画面 4 枚: ダッシュボード / 受信箱 / プロジェクト詳細 / レポート
- 共通ヘッダーとルーティング（`/`, `/inbox`, `/projects/:id`, `/reports`）
- 貼り付け欄 → 受信箱フロー
- 受信箱 → タスク化フロー（タイトル必須、プロジェクト/サイズ/締切は任意）
- **未割当タスク** (`unassignedTasks`) の保持と Dashboard 上での割り当て UI
- プロジェクトの再開メモ編集、タスク / アイテムの追加・完了・削除
- レポート: KPI と プロジェクト別タスク消化率
- AI エージェント共通ルール（`AGENTS.md` / `CLAUDE.md` / `docs/WORKLOG.md`）

---

<!-- 新しい変更は [Unreleased] に追記。リリースのタイミングで日付付きのバージョンに昇格させる。 -->
