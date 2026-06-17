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

---

## 2026-05-12 / Cursor（Claude）— Firestore セキュリティルールと同期整合（v0.6.1）

### やったこと
- **`firestore.rules`**: `users/{uid}/data/main` を **Google プロバイダ（`google.com`）** かつ **`request.auth.uid == userId`** のときのみ read/write。他パスは明示的に拒否。
- **`firebase.json`**: CLI から `firebase deploy --only firestore:rules` できるようルールファイルを指定。
- **`useFirestoreSync`**: 匿名ユーザーでは Firestore に接続しない（ルール拒否によるエラー回避）。同期ステータスに **`local_only`** を追加。
- **`App.tsx`**: ヘッダーに「ローカルのみ」表示。
- **`Settings.tsx`**: 匿名時はクラウド同期しない旨を説明に追記。
- `package.json` **0.6.1**、`CHANGELOG.md` / `RECENT_CHANGES` 更新。

### 申し送り
- **本番 Firebase プロジェクト側でルールを必ず公開すること**（リポジトリに置いただけでは反映されない）。CLI: ルートで `npm run deploy:firestore`（`.firebaserc` の default = `task-hub-a65c1`）。
- 匿名ユーザーの **過去に Firestore に上がっていたデータ** は、ルール公開後は匿名クライアントからは読めなくなる（意図どおり）。Google 連携済み UID のドキュメントのみアクセス可。

---

## 2026-05-12 / Cursor（Claude）— `.firebaserc` と deploy スクリプト

### やったこと
- **`.firebaserc`**: default プロジェクトを `task-hub-a65c1` に設定。
- **`package.json`**: `npm run deploy:firestore` → `npx firebase-tools@latest deploy --only firestore:rules`。

---

## 2026-06-11 / Claude Code (Claude Fable 5) — 3階建て統合の設計レビュー（docs のみ）

### 背景
ユーザーは「3階建てタスク管理術」（1階=年間ロードマップ / 2階=案件ボード / 3階=朝のカンバン）で運用中。
1階・3階は別の単体 HTML（localStorage、Downloads 配下）で、タスクハブ（2階）との二重入力が発生している。
実データ（今週の週報・年間ロードマップのエクスポート）を提供してもらい、仮データシミュレーション＋実データ検証で全体設計をレビューした。

### 主な発見（詳細は mvp-spec.md「3階建て統合構想」）
1. カンバンは仕事量を過少報告（完了8件/週 vs 依頼〜25件/週。即応分が記録に残らない）→ 受信箱の「完了済み」を週報サマリーに計上
2. 「待ち」には waitFor + waitSince が必須（広報業務の約半分は他人待ち。日数が出ないと報告で使えない）
3. 常設プロジェクト型が必要（他部門支援・InfoSquare・データ集計は単発でもルーチンでもない）
4. 回（rounds）は手動作成で十分。実データで皇居ラン×3・MOV Meeting×4 が回ごとに手入力されていた（カデンスエンジン不要の証拠）
5. ボード着地は手動引き上げが主役（実データで日付保持は8件中1件）。締切自動着地は補助
6. planned ステータスが必要（11月のイベントを6月のダッシュボードに出さない）
7. 実データに終了日<開始日のエントリあり（デブサミFUKUOKA）→ バリデーション必要

### 決めたこと
- mvp-spec.md に「3階建て統合構想」セクションを追加（データモデル v4 案・実装フェーズ v0.7〜v0.9・移行マッピング）
- 実装フェーズ: v0.7（/week ボード＋週報生成）→ v0.7.5（回テンプレ）→ v0.8（レポート強化）→ v0.9（/roadmap）

### 未確定・申し送り
- 工数概算の単価（小0.5h/中2h/大4h/特大8h）はユーザー確認待ち
- 回テンプレの初期値（Running/Tube/Radio の工程と相対日数）はユーザーヒアリング待ち
- v0.7 実装はまだ着手していない。次のセッションは mvp-spec.md の統合構想を読んでから入ること
- 旧 HTML 2枚（Downloads 配下）は移行完了まで現役。編集しない

---

## 2026-06-12 / Claude Code (Claude Fable 5) — v0.7.0 今週のボード（3階吸収）

### やったこと
- **コミット①（型＋ストア基盤）**
  - `src/types/index.ts`: `WeekStatus` 型、Task に `weekStatus`/`waitFor`/`waitSince`/`roundLabel`、ProjectType に `ongoing`/`routine-quarterly`
  - `src/store/index.ts`: persist v3→v4 migration、`setTaskWeekStatus`（wait 出入りで待ち情報・done 出入りで完了同期）、`updateTaskWait`、`closeWeek`、`toggleTask` の weekStatus 同期
  - `src/lib/ensureDataShape.ts`: 新フィールドの補完追加（Firestore 旧ドキュメント対策）
- **コミット②（画面＋週報＋v0.7.0）**
  - `src/pages/Week.tsx` 新規: 4列ボード・◀▶移動・自動着地・バックログ引き上げ・待ち先入力・N日待ち（3日で⚠）・週報モーダル・週の締め
  - `src/lib/due.ts` 新規: `dueBadge`/`weekRange`/`waitDays` を共通化（Dashboard の重複ヘルパーを移動）
  - `src/lib/weeklyReport.ts` 新規: 旧カンバン buildReport 形式踏襲の週報生成
  - `src/App.tsx`: `/week` ルートとナビ「今週」追加
  - Dashboard: due ヘルパーを lib に移行、TYPE_LABEL/BADGE_MAP に常設・四半期を追加

### 検証（dev サーバーでブラウザ実走）
- 締切今週のタスク3件が「今週やる」に自動着地、来週締切はバックログに分離 ✓
- 列移動・待ち先入力（blur 保存）・waitSince 自動記録・「0日待ち」表示 ✓
- wait→done で done/completedAt 付与・待ち情報クリア ✓
- 週報: 曜日分布・（曜）サフィックス・詰まりの（待ち先・N日待ち）・来週やること ✓
- **バグ修正**: 自動着地タスク（weekStatus=null）が週報の「来週やること」に出なかった → ボードと同じ判定（締切今週で未完了）を todo に含めて解消
- 週の締め: weekStatus のみ null、done/completedAt は保持 ✓ / リロード後も persist v4 で状態維持 ✓

### 申し送り
- **未プッシュ**。プッシュはユーザー指示待ち（先行の v0.6.2・docs コミットも未プッシュ）
- ローカル開発時は `.env.local` 必須（ないと Firebase 初期化で白画面。今回ダミー値で検証）。
  起動時の白画面はこれを疑うこと。将来 graceful degradation を入れても良い
- Dashboard の「直近の小タスク帯」と /week「今週やる」列は役割が重なる。運用観察して v0.8 で統合判断（設計レビュー時の論点④）
- 次: v0.7.5 回テンプレ（ユーザーから工程ヒアリング後）、v0.8 レポート強化、v0.9 /roadmap

### 2026-06-12（同日・v0.7.1 / v0.7.2）
- **v0.7.1**: /week をペーパー調デザインに刷新（ユーザーの明示要望。旧カンバン HTML の見た目を移植）
  - /week のみ PC 幅 1180px（App.tsx で useLocation 分岐）。Zen フォントを index.html で読み込み
  - **スタイル規約の例外**: /week は slate パレットではなく紙色テーマ（AGENTS §4 の例外としてユーザー承認済み）
  - プロジェクト色は projectId のハッシュで PALETTE から安定割当（Project.color は未使用のまま）
  - 週報の完了行に所要日数（曜、N日/当日）を追加（旧カンバン v3 の durOf 移植）
- **v0.7.2**: 旧カンバン週報マークダウンの取り込み機能（設定 → データ管理）
  - `src/lib/importKanbanReport.ts` がセクション→weekStatus、（曜、N日）→completedAt/createdAt、（M/D）→dueDate、（…）→waitFor を復元
  - ストア `importKanbanTasks` がマージ取り込み（プロジェクト名前一致、なければ ongoing で作成）
  - ユーザーの実週報 22 件で検証：完了13/進行中4/待ち1/来週4、新規プロジェクト7本、週報の往復再現を確認
  - **注意**: 同じ週報を2回取り込むと重複する（重複検知なし。一回きりの移行用）

## 2026-06-17 / Claude Code (Claude Fable 5) — v0.7.8 プロジェクト編集＋タスク移動

### 背景
ユーザーの実データで施策分類が重複（旧カンバン由来の常設「展示会・イベント」の中に社外イベント＝デブサミ系タスクが混在）。整理の合意：展示会・イベント→「社内向けイベント」に改名し常設のまま／社外イベントは単発に分離／MOV Radio・他部門依頼・InfoSquare（6・10・2月の当番制）は常設。だが ProjectDetail に名前・種別の編集UIが無く実行できなかった。

### やったこと
- `src/lib/projectMeta.ts` 新規：種別ラベル/バッジ/セレクタ選択肢を共通化（Dashboard の TYPE_LABEL/BADGE_MAP を移設・Dashboard と ProjectDetail で共用）
- ストア `moveTaskToProject(fromProjectId, taskId, toProjectId)`：所属替えのみ（weekStatus/waitFor/dueDate/done 等は保持）。データモデル変更なし＝persist バンプ不要
- ProjectDetail ヘッダー：名前インライン編集（再開メモと同パターン）／種別セレクタ（updateProject({type})）／削除ボタン（confirm→deleteProject→navigate('/')）
- 各 activeTask 行に「→ 移動」セレクタ（他アクティブPJへ moveTaskToProject）

### 検証（dev・ブラウザ実走）
- タスク移動：p1→社内Web に移動、元から消える・移動先に出現 ✓
- 種別変更：単発→常設、ダッシュボードのバッジ即追従 ✓
- 名前編集：→「社外イベント登壇」、ダッシュボードのカード名も追従 ✓
- （テスト注：React の onBlur は focusout 委譲なので eval では focusout(bubbles) で発火させた。実ユーザー操作は通常の blur で問題なし）

### 申し送り
- マージ機能は作っていない。重複統合は「単発箱を作る→タスク移動→空箱を削除」の手順
- スマホは select 方式なのでタッチでも種別変更・移動は可能（DnD ではない）
- **未プッシュ**。ユーザー指示でプッシュ
- 次の大物：v0.8 AIレビュー（工数単価 小0.5h/中2h/大4h/特大8h の確認待ち）

## 2026-06-13 / Claude Code (Claude Fable 5) — v0.7.5 回テンプレ ＆ v0.8 AIレビュー発案

### やったこと（v0.7.5）
- `src/lib/roundTemplates.ts` 新規：MOV Radio / Tube / Running の工程テンプレ（ユーザーヒアリングで確定）
  - Radio（基準=配信日）: 質問リスト準備-7 / 収録-5 / 動画編集-2 / 事前告知-1 / 当日告知＆公開0
  - Tube（基準=公開日）: 企画・構成台本-14 / 撮影-10 / 編集-5 / サムネ・概要欄-2 / 公開0 ＋アイテム雛形（撮影小物・出演者依頼）
  - Running（基準=実施日）: 募集-14 / チケット購入-7 / 当日0 / 参加者集計+1
- ストア `createRound(projectId, templateId, baseDate, roundLabel)`：締切を applyOffset で計算してタスク＋アイテム一括生成。roundLabel をタスク名と Task.roundLabel に反映
- ProjectDetail に「🔁 次回分を作成」セクション（テンプレ選択・基準日・回ラベル・工程プレビュー）
- ブラウザ実走で検証：基準日6/26→各工程6/19〜6/26に正しく展開

### v0.8 の方針が固まった（ユーザー発案・2026-06-13）
- **AIレビュー**: 受信箱と同じ src/lib/ai.ts の getModel パターン（Firebase AI Logic/Gemini）を流用し、今日/今週/今月のタスク状況を AI が講評する
- 受信箱は responseSchema で構造化出力だが、レビューは自然文出力（responseSchema なしの別モデル設定 or 同 getAI を流用）
- プロンプトに設計思想（待ちの滞留・小タスク取りこぼし・ルーチン実施率）の観点を埋めて judge させる
- 工数単価案（小0.5h/中2h/大4h/特大8h）は未確認のまま

### 申し送り
- v0.7.5 は roundLabel 任意。ラベル空だと Task.roundLabel=null（週ボードのバッジは出ない）
- テンプレはコード内蔵（ユーザーが UI から編集する機能は未実装。要望が出たら Project に taskTemplate を持たせる案が mvp-spec にある）
- **未プッシュ。ユーザー指示でプッシュ予定**

### 2026-06-12（同日・v0.7.3 / v0.7.4）
- **v0.7.3**: /week 等のリロード 404 を修正。deploy.yml で `dist/index.html` を `404.html` に複製（GitHub Pages SPA フォールバック。HTTP ステータスは 404 のままだが画面は正常描画）
- **v0.7.4**: アプリ全体をペーパー調・幅 1180px に統一（ユーザー要望「幅の不一致解消＋モダンに」）
  - **手法が重要**: tailwind.config.js で slate / indigo / white のパレット自体を紙・インク・アンバーレッドに再定義。各ページのクラス名は無変更で全体が再スキンされている
  - 以後、`slate` は warm gray、`indigo` はアクセント赤茶として描画される。新規 UI も従来どおり slate/indigo クラスで書けばテーマに乗る
  - AGENTS §4 の「slate ベース」の記述は実態としては紙テーマを指すことになった（クラス名規約は不変なので運用変更なし）

### 2026-06-12（同日・運用作業）
- v0.7.0 を GitHub Pages にデプロイ（プッシュはユーザー指示）
- **Firestore セキュリティルールを本番公開**（v0.6.1 申し送りの未実施分）。CLI は非対話環境で login 不可のため、ユーザーがコンソールから手動公開。ルール画面の現 URL は `…/firestore/databases/-default-/security/rules`
- **PC・iPhone とも Google ログイン完了、リアルタイム同期が稼働開始**（それまで両端末とも匿名＝ローカルのみだった）
- ローカル開発メモ: この作業コピーには `.env.local` がなかったため検証はダミー値で実施。実 Firebase に繋ぐ場合は実値が必要

---

## 2026-05-20 / Claude Code (Claude Sonnet 4.7) — v0.6.2 期限切れタスクの視覚区別

### 背景
ユーザー指摘：「タスクで設定した期限を過ぎた場合の処理がない」。
コードを読むと部分的にはあるが、`dueDate <= today()` で判定していたため **期限切れと今日が同じ見た目** で区別できず、Dashboard では期限切れも「今日」バッジで表示される誤情報状態だった。

### やったこと（B 案：バッジ追加 + 並べ替え）
- **`src/pages/Dashboard.tsx`**
  - `dueBadge()` を 3 段階に拡張：`期限切れ`（`bg-rose-500 text-white`）/ `今日`（琥珀）/ `明日`（グレー）
  - `urgentTasks` に明示的な `dueDate` 昇順ソートを追加（期限切れ → 今日 → 明日 の順）
- **`src/pages/ProjectDetail.tsx`**
  - `dueCls()` を 3 段階の色に：過去 = `text-rose-700 font-bold` / 今日 = `text-rose-600 font-semibold` / 未来 = `text-slate-500`
  - `isOverdue()` ヘルパーを追加し、未完了かつ期限切れのタスク行に `期限切れ` バッジを表示（完了済みには出さない）
- `package.json` を **0.6.2** にバンプ、`CHANGELOG.md` と `Settings.tsx` の `RECENT_CHANGES` も更新

### 設計判断
- 「簡単なもの」とのリクエストなのでデータモデル変更はせず、表示ロジックのみ
- 完了済みタスクには「期限切れ」バッジを出さない（過ぎていても完了していれば意味が無い）
- C 案（サマリーチップ「期限切れ N 件」）は採用せず、必要になれば次パッチで追加
- ピン留め帯のソートは `localeCompare` で `YYYY-MM-DD` 文字列を昇順 → 自然に過去日付が先頭に来る

### 申し送り
- **`npm run build` 通過確認済み**
- まだ **未プッシュ**（コミットのみ）。ユーザーの明示指示でプッシュする
- 関連して、依頼者別の集計レポート（v0.5.0 申し送りの宿題）は依然未着手
- 「期限切れ件数のサマリー表示」やレポートでの「期限超過件数」は次以降の候補
