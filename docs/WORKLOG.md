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

### 2026-05-12
- **プロジェクト完了の取り消し:** 誤って完了にしたあとアクティブへ戻すときは **`completedAt`（終了記録）のみ無効化**。**プロジェクトの締切は保持**（締切はクリアしない）。
- **受信箱→タスク化:** 捕獲した本文をタスクへ **`originalPaste` としてコピー**。
- **ルーチン UI（レポート）:** 機能未実装だが **削除せずグレーアウト**（将来復活の可能性）。
- **（既に `mvp-spec.md` へ反映済み）** プロジェクト／タスクの両締切・超過は警告のみ、`originalPaste`、4 段階サイズ・小のみ通知、ダッシュボード締切順、再開メモの URL 自動リンク、レポート見出し付近の期限表示 等。

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

### 2026-05-11 (6) / Cursor
**作業内容（v0.4.0 - AI 自動振り分け）**
- `src/lib/ai.ts` を新規作成し、Firebase AI Logic (Google AI バックエンド / Gemini 2.5 Flash) を呼び出す `analyzeInboxText` を実装
- 受信箱アイテム展開時に **50 文字以上のテキストだけ** AI を呼ぶ。短文は無条件でスキップ
- 構造化出力（responseSchema）で title / projectId / size / dueDate / reason を取得
- 結果は `InboxItem.suggestion` に保存し、Firestore 同期されるので **他端末でも再利用される**
- 失敗・スキップ時は手入力にフォールバック（提案バッジは状態に応じて変化）
- 設定画面に Firebase AI Logic の有効化手順を追記
- 受信箱画面の useEffect で展開時に解析・別の useEffect で `ready` 状態かつフォーム未編集なら初期値反映

**ユーザー作業**
- Firebase コンソール「構築 → AI Logic」を開き **Gemini Developer API を有効化**
- モデルは `gemini-2.5-flash`（コード内で指定）

**注意**
- ローカル復元前に Firestore から旧データが来ると AI suggestion が `pending` で固まる可能性 → `requestedIdsRef` で多重リクエストを防ぐ
- `Schema.enumString` を使い size の値域を制限。`projectId` は文字列 "null" で「該当なし」を表現し、コード側で `null` に正規化

### 2026-05-11 (5) / Cursor
**作業内容（v0.3.2）**
- **原因説明**: Firebase 匿名認証はブラウザごとに別 UID。`users/{uid}/data/main` が端末ごとに分かれるため、「同期済み」でも他端末とは別データだった。
- **対策**: 設定に Google 連携（`linkWithPopup`）と 2 台目用ログイン（`signOut` + `signInWithPopup`）を追加。承認済みドメインの注意書きを設定画面に記載。
- **技術**: `useFirestoreSync` を `persist.onFinishHydration` 後に開始。`onAuthStateChanged` で UID 変更時に購読し直し。Google ログインフロー中の匿名割り込み防止用 `pendingGoogleSignIn` を追加。

**ユーザー作業**
- Firebase コンソール: Authentication → Sign-in method → **Google を有効化**
- Authentication → 設定 → 承認済みドメインに `casa2024takayama.github.io` と `localhost` を追加

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

---

## 2026-05-11（夜）/ Cursor (Claude Sonnet 4.6)

### やったこと
- Firebase AI Logic のデバッグ・有効化支援
  - モデル名を `gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-1.5-flash` → `gemini-2.5-flash-lite` と順次修正
  - エラー内容を UI に表示するよう改善（赤いボックス＋「再解析する」ボタン）
  - `SuggestionBadge` のバグ修正：未開封アイテムに「AI 解析中…」と誤表示されていた問題
  - Firebase AI Logic「Gemini Developer API 有効化」がコンソールで未完了だったことを特定・案内
  - 有効化後に AI 動作を確認（ユーザーが「動きました！！」と確認）
- v0.4.1 としてコミット・デプロイ済み

### 確認済み動作
- 受信箱に 50 文字以上のテキストを貼り付け → アイテムを展開 → Gemini が自動解析 → フォームに提案が反映される
- 解析失敗時は「再解析する」ボタンで再試行可能

### 残ったタスク・申し送り
- AI 解析は現在クライアント側で直接 Gemini API を呼んでいる（App Check 未設定）
  → 本番化・公開前に Firebase App Check を設定して API 不正利用を防ぐこと
- `gemini-2.0-flash` は 2026-06-01 に廃止予定。現在は `gemini-2.5-flash-lite` を使用
- Firestore セキュリティルールのテストモード期限に注意（プロジェクト作成から30日）

---

## 2026-05-11（深夜）/ Cursor (Claude Opus 4.7)

### やったこと
- **v0.5.0 リリース: タスクに「依頼者」フィールドを追加**（仕様議論 → 実装まで一気通貫）
  - 設計議論の決定事項（論点1〜4）:
    - Q1: 依頼者は自由入力 + `<datalist>` で過去値サジェスト（表記揺れは運用で吸収）
    - Q2: アイデアは「`requestedBy === '自分'`」というタスクとして登録（型は同じ）
    - 論点3: 自分発は通知対象外（Dashboard 上部「直近の小タスク」帯から除外）
    - 論点4: アイデアは案件プロジェクトに直接入れる（横断アイデアは「アイデア帳」を別途）
- 変更ファイル:
  - `mvp-spec.md`: データモデルと通知ルール更新
  - `src/types/index.ts`: `Task.requestedBy`, `InboxSuggestion.requestedBy` を追加
  - `src/store/index.ts`: persist version を 2 にバンプ + migration（既存タスクに `requestedBy: null` 補完）
  - `src/lib/ai.ts`: Gemini プロンプト/スキーマに requestedBy 推測を追加
  - `src/pages/Inbox.tsx`: フォームに依頼者欄（datalist + 「自分」ボタン）
  - `src/pages/ProjectDetail.tsx`: タスク追加フォームに依頼者欄、タスク行に表示
  - `src/pages/Dashboard.tsx`: `RequesterBadge` で `💡 アイデア` / `from △△さん` を表示。自分発は通知帯から除外
  - `CHANGELOG.md` / `src/pages/Settings.tsx` (RECENT_CHANGES): v0.5.0 追記

### データモデル変更の影響
- `persist` の version を 1 → 2 にバンプ。既存ユーザーのデータには `requestedBy: null` を自動補完するので互換性あり
- Firestore 側の既存ドキュメントも同じ migration が走る（onSnapshot で読み込み → migrate → 書き戻し）

### 残ったタスク・申し送り
- **次のステップ候補（v0.6 想定）**: Reports に「依頼者別の件数（今月・先月）」グラフを追加
  - これが Q1（依頼者フィールド追加）の本来の目的（誰の依頼を何件こなしているか可視化）
- 表記揺れ（「田中」「田中さん」など）はまず観察してから対応。完璧な正規化はしない方針
- AI プロンプトに「敬称付きで統一」と指示済みなので、AI 経由なら揃いやすい

---

## 2026-05-12 / Cursor（Claude）

### やったこと
- ユーザーより：**完了の復帰は締切を保持し完了日のみ取り消す**／**受信箱昇格時にタスクへ `originalPaste` をコピー** と確定。
- `mvp-spec.md`: 同日までの議論（締切・レポート・サイズ・通知など）と上記確定を反映。ダッシュボード行の重複を修正。
- `WORKLOG.md`: 「決定事項」に 2026-05-12 エントリを追加。

### 申し送り（当時）
- 仕様のみ更新 → **同日続きのセッションで v0.6.0 としてコード実装済み**（下記参照）。

### 2026-05-12（続き）/ Cursor（Claude）— v0.6.0 実装
**作業内容**
- 型: `TaskSize` を 4 値、`Task.originalPaste`、`Project.dueDate` / `Project.completedAt` を追加
- ストア: `persist` v3 マイグレーション、`promoteInboxItem` で `originalPaste` コピー、`addProject(..., dueDate)`、`updateProject` で完了時 `completedAt` 付与・active 復帰で `completedAt` のみクリア、`importData` で `ensureAppDataShape`
- `useFirestoreSync`: リモート適用時も `ensureAppDataShape`（古い Firestore ドキュメントの欠損補正）
- `lib/taskSize.ts` / `lib/linkifyText.tsx` / `lib/ensureDataShape.ts` 新規
- Dashboard: 新規プロジェクトに締切入力、アクティブ一覧を締切昇順、カードに期限・リンク化メモ・サイズバッジ
- ProjectDetail: 締切・完了／再開、再開メモリンク化、4 サイズ、タスクのコピペ元折りたたみ、プロジェクト締切超過の警告
- Inbox / AI: 4 サイズ対応
- Reports: 消化セクションに期限、ルーチン行グレーアウト
- `package.json` 0.6.0、`CHANGELOG.md` / `Settings` RECENT_CHANGES 更新

**残タスク例**
- プロジェクト手動並び（`sortOrder`）は未実装
- ルーチン機能本体は未実装（表示のみグレーアウト）
