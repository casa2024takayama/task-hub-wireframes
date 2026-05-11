# 変更履歴 / CHANGELOG

このプロジェクトのバージョン管理は [Semantic Versioning](https://semver.org/lang/ja/) に概ね準拠する（MVP 段階なので Minor の運用は緩め）。
フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/) に準拠。

**バージョン番号は `package.json` の `"version"` が一次情報。** ビルド時に `__APP_VERSION__` として埋め込まれ、設定画面で表示される。

---

## [Unreleased]

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
