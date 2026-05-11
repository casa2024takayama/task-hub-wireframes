# 作業ログ / 申し送り

複数の AI エージェント（Cursor / Claude Code 等）と人間がこのファイルを共有して、作業履歴と未完了タスクを引き継ぐ。

**運用ルール（詳細は `AGENTS.md` の §8）**
- 新しい作業に入る前に「現在の状態」と「未完了タスク」を読む
- 作業が一区切りしたら「セッションログ」の末尾に追記
- 仕様変更・データモデル変更は理由を必ず残す

---

## 現在の状態（2026-05-11 時点）

### できていること
- ✅ HTML ワイヤーフレーム（`dashboard-wireframe.html` 等）から **React + TS + Vite + Tailwind** へ移植完了
- ✅ Zustand ストア（`src/store/index.ts`）に CRUD アクション一式とデモデータを実装
- ✅ ルーティング: `/`（ダッシュボード）/ `/inbox` / `/projects/:id` / `/reports`
- ✅ ヘッダー上部に常駐ナビゲーション、受信箱バッジ付き
- ✅ `zustand/middleware` の `persist` で localStorage に保存（キー: `task-hub-storage`）
- ✅ 画面間遷移の動作確認済み
- ✅ **貼り付け欄 → 受信箱**（D-001 準拠：ボタン + Enter 送信、貼付後フォーカス維持）
- ✅ **受信箱 → タスク化フォーム**（D-002 / D-003 / D-004 準拠：タイトル必須、プロジェクト任意、サイズ既定 small）
- ✅ **未割当タスクの保持と表示**（`unassignedTasks`）。Dashboard 上から完了 / プロジェクト割り当て / 削除が可能
- ✅ ダッシュボードの「直近の小タスク帯」（今日／明日締切の small タスク）
- ✅ プロジェクト新規作成（単発のみ。type 選択 UI は未実装）
- ✅ ProjectDetail でタスク追加 / 完了切替 / 削除、アイテム追加 / 完了切替 / 削除、再開メモ編集
- ✅ Reports: 実データから KPI とプロジェクト別消化率を集計
- ✅ `src/vite-env.d.ts` 追加 → `npm run build` 通過

### できていないこと（次の候補・優先順）
- ⬜ プロジェクト作成時に **type（単発 / 週次 / 月次）を選べる UI**
- ⬜ プロジェクトの **編集 / 一時停止 / 完了 / 削除** の UI
- ⬜ プロジェクトの **color 選択 UI**（決定 D-005 未確定。当面 indigo 固定でも可）
- ⬜ ピン留め帯：タップ時の挙動（仕様未確定。現状は単にチェックボックスのみ）
- ⬜ ルーチンプロジェクトの「今週分やった」を 1 タップで記録する仕組み（仕様未確定）
- ⬜ 空状態（empty state）の磨き込み（プロジェクト 0 件のとき等）
- ⬜ トースト等のフィードバック UI
- ⬜ PWA 化（manifest.json / Service Worker / ホーム画面追加対応）
- ⬜ iOS ショートカット & PC ブックマークレットからの捕獲経路（MVP §31 の入力経路 2）
- ⬜ デモデータの本番削除フラグ（開発用に残してあるものを切り替える仕組み）

### 既知の注意点
- `package-lock.json` は commit する（npm 想定）
- `index.html` は React マウント用に書き換え済み。旧 `*-wireframe.html` は触らない参考資料
- `src/store/index.ts` のデモデータ（DEMO_PROJECTS / 初期 inbox）は開発用。本番化のタイミングで削除する
- React 19 + react-router v7 を使っているのでバージョン違いの記事に注意
- **`toggleTask` / `deleteTask` の引数 `projectId` は `string | null` 型**（null = 未割当タスクへの操作）。新規呼び出し時に注意
- 未割当タスクは Project に紐付かないので、`Reports.tsx` の集計には現状含まれていない（必要なら別途集計を追加すること）

---

## 決定事項（実装方針）

> 仕様で曖昧だった部分の確定事項。**変更する場合は理由とともに新しい決定事項として追記**（既存を書き換えない）。

### 2026-05-11
- **D-001 貼り付け欄の UX:** テキストエリア + 「受信箱へ」ボタン押下で送信。
  Enter キーでも送信（Shift+Enter で改行）。送信後はクリアして欄にフォーカスを残す。
- **D-002 受信箱→タスク化の必須項目:** タイトルのみ必須。プロジェクト / サイズ / 締切は任意。
- **D-003 プロジェクト未振り分けを許容:** Inbox からタスク化する際、プロジェクト未指定（projectId = null）を許容する。未割当タスクは `unassignedTasks` 配列で保持し、後でプロジェクトに割り当てる導線を提供する。
- **D-004 サイズのデフォルト:** `small`（30 分以内）。
- **D-005 実装の優先順位:** 貼り付け欄 → 受信箱 を最優先。次に受信箱→タスク化フロー、既存ボタンの配線、ピン留め帯の磨き込みの順。
- **D-006 バージョン管理:** `package.json` の `"version"` を一次情報とし、Vite で `__APP_VERSION__` として埋め込む。変更履歴は `CHANGELOG.md`（Keep a Changelog 形式）で管理。設定画面 (`/settings`) にバージョンと直近の変更履歴を表示。詳細運用ルールは `AGENTS.md` の「バージョン管理」セクション参照。
- **D-007 完了タスクの履歴:** `Task` 型に `completedAt?: string | null` を追加。`toggleTask` が完了化のたびに ISO タイムスタンプを記録（未完了に戻すと null）。レポート画面に「最近完了したタスク」セクション（直近 20 件、新しい順）を表示。
- **D-008 環境設定画面:** `/settings` を新設し、JSON エクスポート / インポート / 全データクリア（確認モーダル付き）を提供。デモ前のデータ準備や復元用途。
- **D-009 ヘッダーの日時表示:** 「タスクハブ」の右側に `M/D（曜）HH:MM` 形式で表示。1 分ごとに更新（次の分の境界に合わせる）。

---

## セッションログ

### 2026-05-11 (3) / Cursor (Claude Opus 4.7)
**作業内容（v0.2.0 リリース）**
- `package.json` を `0.2.0` にバンプ
- `CHANGELOG.md` 新設（Keep a Changelog 形式）
- `vite.config.ts` で `package.json` を読み込み `__APP_VERSION__` を `define` で埋め込み（`src/vite-env.d.ts` に型宣言追加）
- ストアに `exportData` / `importData` / `clearAll` のアクションと `ExportPayload` 型を追加
- `src/pages/Settings.tsx` を新規作成（`/settings`）。エクスポート / インポート / クリア（確認モーダル付き）+ アプリ情報 + 直近の更新履歴抜粋
- `App.tsx` を改修
  - 設定リンク（⚙）をヘッダーナビに追加
  - 「タスクハブ」右側に現在日時を表示（`useNow` フックで 1 分ごと更新、次の分の境界に同期）
- `Task` 型に `completedAt?: string | null` を追加
- `toggleTask` を完了時刻スタンプ対応に修正（完了化で ISO、未完了化で null）
- Reports に「最近完了したタスク」セクションを追加（未割当タスクも対象に含めるよう `allTasks` の集計範囲も拡張）
- AGENTS.md に「バージョン管理」セクションを追記
- 決定事項 D-006〜D-009 を追加

**残ったタスク**
- 上記「できていないこと」セクション参照
- 次の優先順は **プロジェクト編集系（type / color / 状態切替）** と **空状態の磨き込み**

**次のエージェントへの申し送り**
- **既存ユーザーの localStorage** にある Task には `completedAt` フィールドが無い。Reports の集計関数は `completedAt ?? createdAt` でフォールバックするので壊れない
- `persist` の `version` はまだバンプしていない。互換性のある追加だけなので問題なし。**破壊的な変更を入れる場合は version をバンプして migrate を書くこと**（AGENTS.md のバージョン管理セクション参照）
- 機能追加・修正のたびに `CHANGELOG.md` の `[Unreleased]` に追記 → 区切りで `package.json` の version をバンプ + `[Unreleased]` を昇格 + `Settings.tsx` の `RECENT_CHANGES` を更新、というフローで運用してください

### 2026-05-11 (2) / Cursor (Claude Opus 4.7)
**作業内容**
- 静的 HTML ワイヤーフレーム 4 枚 + LP からの起点で、Vite + React 19 + TypeScript + Tailwind v3 環境を構築
- 型定義（`src/types/index.ts`）と Zustand ストア（`src/store/index.ts`、`persist` 付き）を新規作成
- ページコンポーネント 4 枚（Dashboard / Inbox / ProjectDetail / Reports）を新規作成
- `App.tsx` でルーティングと共通ヘッダーを実装
- 画面遷移の動作確認をユーザーと一緒に実施 → OK
- AGENTS.md / CLAUDE.md / docs/WORKLOG.md を新設

**追加作業（同日後半）**
- 仕様の曖昧な点をユーザーと確認し、決定事項 D-001〜D-005 を確定（上記「決定事項」セクション参照）
- ストアの **`promoteInboxItem` のバグ修正**：projectId === null のとき、タスクがどこにも入らず消えてしまう問題があった。`unassignedTasks: Task[]` を追加して未割当タスクを保持するよう修正
- `toggleTask` / `deleteTask` のシグネチャを `projectId: string | null` に拡張（null = 未割当タスクへの操作）
- `assignTaskToProject(taskId, projectId)` を新規追加：未割当タスクをプロジェクトへ移動
- Dashboard に「未割当タスク」セクションを追加（チェックボックス・プロジェクト割り当て select・削除）
- `src/vite-env.d.ts` を追加して `import.meta.env` と CSS import の型エラーを解消
- `npm run build` 通過確認

**残ったタスク**
- 上記「できていないこと」セクション参照
- 次の優先順は **type / color の選択 UI** と **プロジェクト編集系**

**次のエージェントへの申し送り**
- まだ **すべての変更が GitHub に push されていない**。コミット＆プッシュはユーザーの明示指示待ち
- Zustand の `persist` 経由でデモデータが localStorage に保存される。データモデル変更時は DevTools の Application タブで `task-hub-storage` を消すか、`persist({ name, version })` の version をバンプすること
- 未割当タスクのデータが localStorage に増えても既存ユーザー（version=undefined）の `unassignedTasks` は復元時に存在しないので、ストア定義のデフォルト値（`unassignedTasks: []`）が使われる。挙動 OK
- 仕様未確定の論点（ルーチン実施の定義、ピン留め帯のタップ挙動、color UI）は **D-001〜D-005 の続きとして D-006 以降に追記**する運用にすること

---

### 2026-05-11 (4) / Cursor (Claude Sonnet 4.5)
**作業内容（Firebase Firestore 同期導入）**
- `firebase` パッケージをインストール
- `src/lib/firebase.ts` 新規作成：Firebase 初期化・匿名認証・Firestore 参照ヘルパー・オフラインキャッシュ (`enableIndexedDbPersistence`)
- `src/lib/useFirestoreSync.ts` 新規作成：Zustand ↔ Firestore のリアルタイム同期フック
  - 匿名認証後、`users/{uid}/data/main` を `onSnapshot` でサブスクライブ
  - Zustand のデータ変更を 1.5 秒デバウンスで Firestore に保存
  - 初回起動時に Firestore が空なら localStorage データをアップロード
- `App.tsx` に `useFirestoreSync` を組み込み
- ヘッダーに同期ステータスドット（接続中 / 同期済み / 保存中 / オフライン / エラー）を追加
- `.env.local` に Firebase 設定値を記載（git 管理外）
- `.env.local.example` を新規作成（テンプレート）
- `deploy.yml` に GitHub Actions Secrets からの env 注入を追加
- `vite.config.ts` に Firebase/React のコード分割設定を追加

**GitHub Actions Secrets の設定手順**（デプロイを動かすために必要）
1. https://github.com/casa2024takayama/task-hub-wireframes/settings/secrets/actions を開く
2. 「New repository secret」で以下の 6 つを追加:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
3. 値は `.env.local` の内容と同じ

**Firebase コンソールで必要な設定**（まだやっていない場合）
- Authentication → Sign-in method → **「匿名」を有効化**（必須）
- Firestore のセキュリティルールは現在テストモード（30日後に期限切れ）
  → 本番化前に以下のルールに変更すること:
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /users/{uid}/data/{docId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
  ```

**次のエージェントへの申し送り**
- `.env.local` は git 管理外なので、clone 後は必ず作成すること（`.env.local.example` を参照）
- GitHub Actions Secrets が設定されるまで、GitHub Pages のビルドは Firebase env なしで動く（ローカル動作は OK）
- `enableIndexedDbPersistence` は Firebase v10 で非推奨だが動作には問題なし。将来的に `initializeFirestore` + `persistentLocalCache()` に移行を検討
- 匿名認証の uid はブラウザ/デバイス固有。ログアウト・クリアすると uid が変わりデータが切り離される（MVP 段階では問題なし）

<!-- 以下、新しいセッションごとに同じフォーマットで追記してください -->
