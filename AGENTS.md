# AGENTS.md — AI エージェント共通ルール

このファイルは Cursor / Claude Code / Codex など、複数の AI エージェントが本リポジトリで協働するための共通ルールです。**作業開始前に必ず冒頭から最後まで読んでください。** 仕様の根拠は `mvp-spec.md`、作業履歴と未完了タスクは `docs/WORKLOG.md` を参照。

---

## 1. プロジェクト概要

**名称:** タスクハブ（Personal Task Hub）
**目的:** 5〜6 プロジェクトを並行する個人が "メールで来た小さい依頼" を取りこぼさないための PWA。
**スタンス:** 1〜2 週間で雑に作って自分で 2 週間使い、観察して直す。完璧主義は不要。

詳細仕様は `mvp-spec.md` が一次情報。**仕様を変える提案をする場合は、まず `mvp-spec.md` を更新してからコードを書く。**

---

## 2. 技術スタック

| 区分 | 採用 |
|---|---|
| ビルド | Vite 6 |
| 言語 | TypeScript 5（strict） |
| UI | React 19 |
| ルーティング | react-router-dom v7 |
| 状態管理 | Zustand v5 + `persist`（localStorage キー: `task-hub-storage`） |
| スタイル | Tailwind CSS v3 |
| パッケージ | npm（lock ファイルは `package-lock.json`） |
| デプロイ想定 | PWA（PC ブラウザ + iPhone ホーム画面） |

**勝手に依存追加しない。** 新規ライブラリを入れる場合は `docs/WORKLOG.md` に理由を 1 行残す。

---

## 3. ディレクトリ構成

```
.
├── AGENTS.md              # ← このファイル（共通ルール）
├── CLAUDE.md              # Claude Code 用エントリ（中身は AGENTS.md を参照）
├── mvp-spec.md            # MVP 仕様（一次情報・むやみに変更しない）
├── docs/
│   └── WORKLOG.md         # 作業ログ・申し送り（変更があれば追記必須）
├── *-wireframe.html       # 旧 HTML ワイヤーフレーム（参考資料・触らない）
├── lp.html                # ランディングページ HTML（参考資料・触らない）
├── index.html             # Vite エントリ
├── src/
│   ├── main.tsx           # React エントリ
│   ├── App.tsx            # ルートコンポーネント / ナビゲーション
│   ├── index.css          # Tailwind ディレクティブ
│   ├── pages/             # 画面コンポーネント（Dashboard / Inbox / ProjectDetail / Reports）
│   ├── store/             # Zustand ストア
│   └── types/             # 型定義（Project, Task, InboxItem, Item）
└── vite.config.ts
```

---

## 4. コーディング規約

### TypeScript / React
- **型は `src/types/index.ts` に集約。** ページごとに重複定義しない。
- 関数コンポーネントは `export default function 名前()` 形式（既存ファイルに合わせる）。
- ストアアクセスは `useAppStore((s) => s.X)` でセレクタを使い、ストア全体を購読しない。
- 副作用の少ない純粋関数は `src/lib/` に切り出してよい（必要になったら作る）。

### スタイル
- **Tailwind のクラスのみ。** 別途 CSS ファイルは原則作らない。
- カラーパレットは `slate` ベース + アクセントに `indigo` / `emerald` / `amber` / `rose`。仕様外の色を勝手に増やさない。
- モバイル幅（max-w-3xl）を主動線にする。これは「iPhone ホーム画面から起動する」という前提に基づく。

### コミット
- メッセージは命令形 1 行 + 必要なら本文。日本語 OK。
- **複数の変更を 1 コミットにまとめない。** 「画面追加」「ストア修正」は別コミット。
- `--no-verify` 禁止。`--amend` は直前のコミットがプッシュ済みなら禁止。
- ユーザーが明示的に指示しない限り `git push` しない。

### バージョン管理（厳密運用 — 更新の取りこぼし防止）
- **一次情報は `package.json` の `"version"`**。Vite が `__APP_VERSION__` として埋め込み、ヘッダーと設定画面 (`/settings`) に表示される。
- **原則: ユーザーが体感できる変更を含むコミットを作るたびに `package.json` の version を必ずバンプする。**「あとでまとめて」は禁止（更新したか分からなくなる）。
- バンプ規則（MVP 段階の運用）:
  - 機能追加・UI 改修・UX 変更 → **patch (0.x.Y)** をバンプ
  - 機能群がまとまった節目 → minor (0.Y.0) に昇格
  - データモデル変更や破壊的変更 → minor (0.Y.0) + 移行メモを WORKLOG に必須
  - 1.0.0 以降は SemVer 厳密運用に切り替える
- **コミット 1 つにつき version 1 つ。** 1 コミット = 1 patch を原則にする。
- 必須の付随作業（バンプと同時に行う）:
  1. `CHANGELOG.md` の `[Unreleased]` 配下に変更内容を追記
  2. リリース確定時に `[Unreleased]` を新しいバージョン見出し（日付付き）に昇格
  3. `src/pages/Settings.tsx` の `RECENT_CHANGES` 配列にも新バージョンを追加（最新が先頭。表示は直近 3 件のみ）
  4. コミットメッセージの末尾に `(v0.X.Y)` を入れる（例: `fix: IME 誤登録を防止 (v0.3.1)`）
- データモデルを変更したら、ストアの `persist({ name, version })` の version もバンプし、必要なら migrate を書く。WORKLOG に変更点と影響範囲を必ず記録。
- ドキュメントのみの変更（AGENTS.md / WORKLOG.md など）は version バンプ不要。コミットメッセージは `docs:` プレフィックスにする。

---

## 5. データモデル（仕様の核）

3 層構造を絶対に崩さない:

```
Project（単発 / ルーチン週次 / ルーチン月次）
├─ resumeNote  ← マルチタスク復帰のためのメモ。必須フィールド
├─ Task[]      （size: small=30分以内 / large、dueDate あり）
└─ Item[]      （撮影小物・素材など "揃えるもの"。締切なし）

InboxItem      （未振り分けの捕獲タスク。rawText のみ持つ）
```

- **`InboxItem` → `Task` への昇格時のみプロジェクトを紐付ける。** 受信箱に直接プロジェクト ID を持たせない。
- タスクの "サイズ" は `small` / `large` の 2 値のみ。Notion 風の優先度／ステータスを増やさない（MVP 範囲外）。

---

## 6. やってよいこと / ダメなこと

### やってよい
- UI / UX の磨き込み（空状態、トランジション、トースト等）
- a11y 改善（focus ring、aria 属性、コントラスト）
- バグ修正、リファクタ（テストがなくても挙動が変わらなければ OK）
- `mvp-spec.md` に書かれている範囲の機能実装

### 事前に必ず確認
- 新規ライブラリの追加
- データモデル（`src/types/index.ts`）の変更
- ルーティング構成の変更
- `mvp-spec.md` の修正

### やってはいけない（明示指示があるまで）
- チーム機能、共有、リアルタイム同期
- 外部 API / バックエンド連携（メール転送・LINE Bot 等は MVP 後）
- ガントチャート、依存関係、ワークフロー
- 全タスク横断の締切リスト（仕様で明確に "やらない" と決めている）
- `lp.html` や `*-wireframe.html` の編集（旧資産・参照用）

---

## 7. 開発コマンド

```bash
npm install          # 初回 / 依存更新後
npm run dev          # 開発サーバ（http://localhost:5173）
npm run build        # 型チェック + 本番ビルド
npm run preview      # ビルド結果のローカル確認
```

**変更後は最低でも `npm run build` を 1 回通すこと**（型エラーの早期検出）。

---

## 8. エージェント間の引き継ぎプロトコル

1. **作業前:** `docs/WORKLOG.md` の最後のエントリと "未完了タスク" セクションを読む。
2. **作業中:** 大きな決定（仕様解釈、ライブラリ選定、データモデル変更）をしたら、その場で `docs/WORKLOG.md` に追記。
3. **作業後:** 以下を `docs/WORKLOG.md` の末尾に追記してからセッションを終える。
   - 日付（JST）/ エージェント名（Cursor / Claude Code 等）/ 何をしたか / 残ったタスク / 次のエージェントへの申し送り
4. **コミット前:** `git status` と `git diff` を確認し、意図しないファイル変更を含めない。

---

## 9. ユーザーとのコミュニケーション

- ユーザーの主言語は **日本語**。応答も日本語で。
- ファイル名・関数名・コード片は英数字のまま。
- 仕様の不明点は推測せず質問する（特にデータモデル・通知まわり）。

---

最終更新: 2026-05-11 / 編集者: Cursor (Claude Opus 4.7)
