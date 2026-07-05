import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store'
import { parseKanbanReport } from '../lib/importKanbanReport'
import { PRE_SHRINK_BACKUP_KEY } from '../lib/useFirestoreSync'
import {
  auth,
  getAuthSummary,
  linkGoogleToCurrentUser,
  signInWithGoogleReplacingSession,
  onAuthStateChanged,
} from '../lib/firebase'

const APP_VERSION =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'

const RECENT_CHANGES: { version: string; date: string; lines: string[] }[] = [
  {
    version: '0.7.17',
    date: '2026-07-05',
    lines: [
      '同期アイコンが「接続中…」（グレー）のまま止まり同期が始まらない問題を修正',
      '（キャッシュと同内容のサーバー確認が通知されず、同期開始の合図を受け取れていなかった）',
    ],
  },
  {
    version: '0.7.16',
    date: '2026-07-04',
    lines: [
      'iOS Safari で「⬇ ダウンロードして同期開始」の Google ログインが途中で止まる問題を修正',
    ],
  },
  {
    version: '0.7.15',
    date: '2026-07-04',
    lines: [
      'クラウド同期のボタン文言をアップロード／ダウンロードの方向で表現',
    ],
  },
  {
    version: '0.7.14',
    date: '2026-07-03',
    lines: [
      'データ保護の緊急安全パッチ（デモデータ撤廃・同期の安全化）',
      'クラウド上書き前に前回値を自動退避（data/backup）・激減時はローカルにも退避',
    ],
  },
  {
    version: '0.7.13',
    date: '2026-06-20',
    lines: [
      '再開メモの編集欄を画面の約2/3で頭打ちにし欄内スクロールに（長文の上部編集が画面外に出る問題を解消）',
    ],
  },
  {
    version: '0.7.12',
    date: '2026-06-19',
    lines: [
      '再開メモを普段は5行に折りたたみ表示（長文は「もっと見る」で展開）',
      '再開メモの編集を内容に合わせたオートリサイズに',
    ],
  },
  {
    version: '0.7.11',
    date: '2026-06-17',
    lines: [
      '週ボードのカードボタンを列ごとに最適化（今週やる=↩︎ / 着手中・待ち=× / 完了=◯）',
      '各列を締切が早い順に並び替え',
      'トップやプロジェクト詳細で完了にしたタスクも週ボードの完了列に表示',
    ],
  },
  {
    version: '0.7.10',
    date: '2026-06-17',
    lines: [
      'ダッシュボードのプロジェクトを 単発／常設／ルーチン の見出しで3分割',
      '週ボードの「バックログへ戻す」を ↩︎ アイコンのみに',
    ],
  },
  {
    version: '0.7.9',
    date: '2026-06-17',
    lines: [
      'タスク名をクリックでその場編集（プロジェクト詳細・週ボード）',
      '週ボードの「外す」を「↩︎ バックログ」表記に変更（今週やるから戻す操作）',
    ],
  },
  {
    version: '0.7.8',
    date: '2026-06-17',
    lines: [
      'プロジェクトの名前・種別の編集と削除（プロジェクト詳細）',
      'タスクを別プロジェクトへ移動（各タスク行の「→ 移動」）',
    ],
  },
  {
    version: '0.7.7',
    date: '2026-06-13',
    lines: [
      'ダッシュボードのプロジェクトカードをドラッグ＆ドロップで並び替え可能に',
      '並び順は保存・同期。設定するまでは締切順で表示',
    ],
  },
  {
    version: '0.7.6',
    date: '2026-06-13',
    lines: [
      'モバイルのヘッダーを整理（狭い画面ではバージョン番号・日時を非表示）',
      '貼り付け欄フッターの折り返し崩れを修正',
    ],
  },
  {
    version: '0.7.5',
    date: '2026-06-13',
    lines: [
      'ルーチンの回をテンプレから一括生成（プロジェクト詳細「次回分を作成」）',
      '基準日を選ぶと各工程の締切を自動計算。Radio / Tube / Running の内蔵テンプレ',
    ],
  },
  {
    version: '0.7.4',
    date: '2026-06-12',
    lines: [
      'アプリ全体をペーパー調テーマ・幅広（1180px）に統一',
      'ダッシュボードのプロジェクト一覧を PC で 3 カラム表示',
    ],
  },
  {
    version: '0.7.3',
    date: '2026-06-12',
    lines: ['/week などでリロードすると 404 になる問題を修正（GitHub Pages の SPA フォールバック）'],
  },
  {
    version: '0.7.2',
    date: '2026-06-12',
    lines: [
      '旧カンバンの週報マークダウンを貼り付けて取り込む機能（設定 → データ管理）',
      '完了日・所要日数・締切・待ち先まで復元してマージ',
    ],
  },
  {
    version: '0.7.1',
    date: '2026-06-12',
    lines: [
      '/week をペーパー調デザインに刷新（PC は幅 1180px の 4 列）',
      '週報の完了行に所要日数（曜、N日/当日）を追加',
    ],
  },
  {
    version: '0.7.0',
    date: '2026-06-12',
    lines: [
      '「今週のボード」（/week）を追加。締切が今週のタスクは自動着地、日付なしはバックログから引き上げ',
      '待ち列に待ち先メモと「N日待ち」表示（3日以上で警告）',
      '週報ドラフトをワンタップ生成（旧カンバン形式踏襲、即応した依頼も計上）',
      'プロジェクト種別に常設・四半期ルーチンを追加',
    ],
  },
  {
    version: '0.6.2',
    date: '2026-05-20',
    lines: [
      '期限切れタスクを「今日」と区別して表示（期限切れ=赤バッジ）',
      'Dashboard の小タスク帯を 期限切れ → 今日 → 明日 の順にソート',
      'ProjectDetail のタスク行にも期限切れバッジを追加',
    ],
  },
  {
    version: '0.6.1',
    date: '2026-05-12',
    lines: [
      'Firestore セキュリティルール用 firestore.rules（Google ログイン + 自分の UID のみ）',
      '匿名のときはクラウド同期を試みずヘッダーは「ローカルのみ」表示',
    ],
  },
  {
    version: '0.6.0',
    date: '2026-05-12',
    lines: [
      'プロジェクト締切・完了記録（再開で完了日のみ取り消し）',
      'タスクサイズ 4 段階（通知対象は小のみ）・受信箱昇格で originalPaste 保存',
      '再開メモの URL 自動リンク、レポートに期限表示・ルーチン行グレーアウト',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-05-11',
    lines: [
      'タスクに「依頼者」フィールドを追加（自由入力 + 過去値サジェスト）',
      '「自分」ボタンでアイデア・メモを 1 タップ登録（💡 バッジで視覚区別）',
      'AI 自動振り分けが依頼者も推測',
      '直近の小タスク帯はアイデアを除外（依頼取りこぼし防止に集中）',
    ],
  },
  {
    version: '0.4.1',
    date: '2026-05-11',
    lines: [
      'AI モデルを gemini-2.5-flash-lite に更新（Firebase AI Logic 正式対応 / 2.0-flash は 2026-06 廃止）',
      'AI エラー時にエラー内容と再解析ボタンを表示',
      'AI バッジ：未開封アイテムは「解析中」と出ないよう修正',
    ],
  },
  {
    version: '0.4.0',
    date: '2026-05-11',
    lines: [
      '受信箱の AI 自動振り分け（Gemini, 50 文字以上のときだけ動作）',
      '提案結果は受信箱アイテムに保存され、端末をまたいで再利用',
      '提案状態（解析中 / 提案あり / 失敗）をバッジで表示',
    ],
  },
  {
    version: '0.3.2',
    date: '2026-05-11',
    lines: [
      'Google ログイン（端末間で同じ Firestore データを共有）',
      '匿名は端末ごとに別 UID の説明と連携手順を設定に追記',
      'localStorage 復元後に Firestore 同期開始（上書き競合の改善）',
    ],
  },
  {
    version: '0.3.1',
    date: '2026-05-11',
    lines: [
      'index.html に no-cache メタタグを追加（古い JS が残るのを防止）',
      '設定画面に「最新版を取得」ボタンを追加（キャッシュクリア + 再読込）',
    ],
  },
]

const LAST_UPDATED = RECENT_CHANGES[0].date

function formatTimestamp() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}${m}${day}-${hh}${mm}`
}

export default function Settings() {
  const exportData = useAppStore((s) => s.exportData)
  const importData = useAppStore((s) => s.importData)
  const importKanbanTasks = useAppStore((s) => s.importKanbanTasks)
  const clearAll = useAppStore((s) => s.clearAll)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [kanbanText, setKanbanText] = useState('')
  // 同期の激減ガードが退避したデータ（あれば復元 UI を出す）
  const [shrinkBackup, setShrinkBackup] = useState<{
    stashedAt?: string
    projects?: unknown[]
    inbox?: unknown[]
    unassignedTasks?: unknown[]
  } | null>(() => {
    try {
      const raw = localStorage.getItem(PRE_SHRINK_BACKUP_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const [message, setMessage] = useState<{ type: 'info' | 'error' | 'success'; text: string } | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [authSummary, setAuthSummary] = useState(() => getAuthSummary(auth.currentUser))
  const [showGoogleCloudConfirm, setShowGoogleCloudConfirm] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)

  useEffect(() => onAuthStateChanged(auth, (u) => setAuthSummary(getAuthSummary(u))), [])

  function handleExport() {
    const payload = exportData()
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `task-hub-backup-${formatTimestamp()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setMessage({ type: 'success', text: 'JSON ファイルをダウンロードしました' })
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const result = importData(json)
      if (result.ok) {
        setMessage({ type: 'success', text: `インポートしました（ファイル: ${file.name}）` })
      } else {
        setMessage({ type: 'error', text: `インポートに失敗：${result.error}` })
      }
    } catch (err) {
      setMessage({ type: 'error', text: `JSON の読み込みに失敗：${err instanceof Error ? err.message : '不明なエラー'}` })
    }
  }

  function handleRestoreShrinkBackup() {
    if (!shrinkBackup) return
    const taskCount =
      (shrinkBackup.projects ?? []).reduce(
        (n: number, p) => n + ((p as { tasks?: unknown[] }).tasks?.length ?? 0),
        0
      ) + (shrinkBackup.unassignedTasks?.length ?? 0)
    if (
      !confirm(
        `退避データ（${shrinkBackup.stashedAt ?? '日時不明'}・タスク${taskCount}件）で現在のデータを置き換えます。よろしいですか？\n復元後は自動でクラウドにも同期されます。`
      )
    )
      return
    const result = importData(shrinkBackup)
    if (result.ok) {
      setMessage({ type: 'success', text: '退避データを復元しました。同期ステータスが「同期済み」になるのを確認してください。' })
    } else {
      setMessage({ type: 'error', text: `復元に失敗：${result.error}` })
    }
  }

  function handleDiscardShrinkBackup() {
    if (!confirm('退避データを破棄します（元に戻せません）。よろしいですか？')) return
    localStorage.removeItem(PRE_SHRINK_BACKUP_KEY)
    setShrinkBackup(null)
    setMessage({ type: 'info', text: '退避データを破棄しました' })
  }

  function handleKanbanImport() {
    const items = parseKanbanReport(kanbanText)
    if (items.length === 0) {
      setMessage({ type: 'error', text: '取り込めるタスクが見つかりません（- [施策名] タイトル 形式の行が必要です）' })
      return
    }
    const sections = {
      done: items.filter((i) => i.weekStatus === 'done').length,
      doing: items.filter((i) => i.weekStatus === 'doing').length,
      wait: items.filter((i) => i.weekStatus === 'wait').length,
      todo: items.filter((i) => i.weekStatus === 'todo').length,
    }
    if (
      !confirm(
        `${items.length} 件のタスクを取り込みます。\n完了 ${sections.done} / 進行中 ${sections.doing} / 待ち ${sections.wait} / 来週 ${sections.todo}\nよろしいですか？`
      )
    )
      return
    const result = importKanbanTasks(items)
    setKanbanText('')
    setMessage({
      type: 'success',
      text: `${result.importedTasks} 件のタスクを取り込みました（新規プロジェクト ${result.createdProjects} 件）。「今週」ボードを確認してください。`,
    })
  }

  function handleClear() {
    clearAll()
    setShowClearConfirm(false)
    setMessage({ type: 'success', text: '全データをクリアしました' })
  }

  async function handleHardReload() {
    try {
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
    } catch (e) {
      console.warn('cache clear failed', e)
    }
    // クエリ文字列を付け替えて HTML から取り直す
    const url = new URL(window.location.href)
    url.searchParams.set('_t', Date.now().toString())
    window.location.replace(url.toString())
  }

  async function handleLinkGoogle() {
    setAuthBusy(true)
    try {
      await linkGoogleToCurrentUser()
      setMessage({ type: 'success', text: 'アップロード同期を開始しました。この端末のデータがクラウドに保存され、以後は自動同期されます。' })
    } catch (e) {
      setMessage({ type: 'error', text: `アップロード同期の開始に失敗：${e instanceof Error ? e.message : '不明なエラー'}` })
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleGoogleCloudLogin() {
    setShowGoogleCloudConfirm(false)
    setAuthBusy(true)
    try {
      await signInWithGoogleReplacingSession()
      setMessage({ type: 'success', text: 'クラウドのデータをこの端末に読み込みました。以後は自動同期されます。' })
    } catch (e) {
      setMessage({ type: 'error', text: `ダウンロードに失敗：${e instanceof Error ? e.message : '不明なエラー'}` })
    } finally {
      setAuthBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-slate-400 hover:text-slate-600 text-sm">←</Link>
        <h1 className="text-lg font-bold text-slate-800">環境設定</h1>
      </div>

      {message && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : message.type === 'error'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-slate-50 text-slate-700 border border-slate-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* アカウント・クラウド同期 */}
      <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <h2 className="text-sm font-bold text-slate-700">アカウント・クラウド同期</h2>

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 leading-relaxed">
          <p className="font-semibold text-amber-800 mb-1">クラウド同期を始める前に</p>
          <p>
            クラウド同期には <strong>Google ログイン</strong>が必要です。まだの端末のデータは
            <strong>その端末の中だけ</strong>に保存され、ヘッダーに「ローカルのみ」と表示されます。
            端末ごとに別 ID（匿名）になっているため、下のボタンでクラウドとつなぎます。
          </p>
        </div>

        <div className="text-xs text-slate-600 space-y-1">
          <p>
            <span className="text-slate-500">現在：</span>
            {authSummary.isAnonymous
              ? '匿名（この端末専用 ID）'
              : `Google：${authSummary.email ?? '（メール取得なし）'}`}
          </p>
          <p className="text-slate-400">
            Firebase コンソールで「Authentication → Sign-in method → Google」を有効にし、
            承認済みドメインに <code className="bg-slate-100 px-1 rounded">casa2024takayama.github.io</code> と{' '}
            <code className="bg-slate-100 px-1 rounded">localhost</code> を追加してください。
          </p>
        </div>

        <div className="border-t border-slate-100 pt-3 space-y-3">
          <p className="text-xs font-semibold text-slate-600">手順（推奨）</p>
          <ol className="text-xs text-slate-600 list-decimal list-inside space-y-1">
            <li>
              <strong>データが入っている端末</strong>で「⬆ アップロード」→ この端末の内容がクラウドの元データになります
            </li>
            <li>
              <strong>他の端末</strong>で「⬇ ダウンロード」→ クラウドと同じ内容になります
            </li>
          </ol>
          <p className="text-xs text-slate-400">
            同期開始後は、どの端末で編集しても自動で双方向に同期されます。
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            disabled={authBusy || !authSummary.isAnonymous}
            onClick={handleLinkGoogle}
            className="flex-1 bg-indigo-600 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-left"
          >
            <span className="block font-bold">⬆ この端末のデータをクラウドへアップロードして同期開始</span>
            <span className="block text-[11px] text-indigo-200 mt-0.5">（Google アカウントと連携）</span>
          </button>
          <button
            type="button"
            disabled={authBusy || !authSummary.isAnonymous}
            onClick={() => setShowGoogleCloudConfirm(true)}
            className="flex-1 bg-white border border-indigo-600 text-indigo-600 text-sm px-4 py-2 rounded-lg hover:bg-indigo-50 transition disabled:opacity-40 text-left"
          >
            <span className="block font-bold">⬇ クラウドのデータをこの端末へダウンロードして同期開始</span>
            <span className="block text-[11px] text-indigo-400 mt-0.5">（Google でログイン）</span>
          </button>
        </div>
      </section>

      {/* AI 自動振り分け（Firebase AI Logic） */}
      <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-700">AI 自動振り分け（受信箱）</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          受信箱に貼り付けたテキストが <strong>50 文字以上</strong> のとき、Gemini が自動で
          タスクタイトル / プロジェクト / サイズ / 締切日 を推測してフォームに反映します。
          短い文はそのまま手入力です（短文は誤推定が多いため）。
        </p>
        <div className="rounded-md bg-slate-50 border border-slate-200 p-3 text-[11px] text-slate-600 space-y-1">
          <p className="font-semibold text-slate-700">Firebase コンソールでの一度きりの設定</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>「構築 → AI Logic」を開く</li>
            <li>「Gemini Developer API」を選択 → 「有効にする」</li>
            <li>使用モデルは <code className="bg-slate-100 px-1 rounded">gemini-2.5-flash</code></li>
          </ol>
          <p className="text-slate-400">無料枠の範囲内で動作します。失敗時は手入力にフォールバック。</p>
        </div>
      </section>

      {/* データ管理 */}
      <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <h2 className="text-sm font-bold text-slate-700">データ管理</h2>

        {shrinkBackup && (
          <div className="rounded-lg bg-amber-50 border-2 border-amber-300 p-3 space-y-2">
            <p className="text-sm font-bold text-amber-800">⚠ 同期で上書きされる前のデータが退避されています</p>
            <p className="text-xs text-amber-900 leading-relaxed">
              クラウドから受信したデータが極端に少なかったため、適用前のこの端末のデータを自動退避しました
              （{shrinkBackup.stashedAt ? new Date(shrinkBackup.stashedAt).toLocaleString('ja-JP') : '日時不明'}）。
              こちらが正しいデータなら「復元」を押してください。
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleRestoreShrinkBackup}
                className="bg-amber-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-amber-700"
              >
                退避データを復元
              </button>
              <button
                onClick={handleDiscardShrinkBackup}
                className="border border-slate-300 text-slate-500 text-xs px-3 py-1.5 rounded-lg hover:bg-slate-50"
              >
                破棄
              </button>
            </div>
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800">エクスポート</p>
            <p className="text-xs text-slate-500 mt-0.5">プロジェクト・受信箱・未割当タスクを JSON ファイルでダウンロード</p>
          </div>
          <button
            onClick={handleExport}
            className="bg-indigo-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition shrink-0"
          >
            ダウンロード
          </button>
        </div>

        <div className="flex items-start justify-between gap-4 border-t border-slate-100 pt-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800">インポート</p>
            <p className="text-xs text-slate-500 mt-0.5">JSON ファイルから復元（現在のデータは上書きされます）</p>
          </div>
          <button
            onClick={handleImportClick}
            className="bg-white border border-indigo-600 text-indigo-600 text-sm px-4 py-1.5 rounded-lg hover:bg-indigo-50 transition shrink-0"
          >
            ファイル選択
          </button>
          <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleImportFile} hidden />
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-sm font-medium text-slate-800">旧カンバンの週報から取り込み</p>
          <p className="text-xs text-slate-500 mt-0.5 mb-2">
            朝のカンバン（HTML 版）の「週報を書き出す」の全文を貼り付けてください。
            施策はプロジェクト（名前一致・なければ常設として新規作成）、各セクションは週ボードの列にマージされます。
            <strong>既存データは消えません</strong>が、同じ週報を2回取り込むと重複します。
          </p>
          <textarea
            value={kanbanText}
            onChange={(e) => setKanbanText(e.target.value)}
            rows={6}
            placeholder={'# 週報 6/12週\n\n## 今週動いたこと（…）\n- [施策名] タイトル（木、当日）\n…'}
            className="w-full border border-slate-200 rounded-lg p-3 text-xs font-mono focus:outline-none focus:border-indigo-400"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleKanbanImport}
              disabled={!kanbanText.trim()}
              className="bg-indigo-600 disabled:opacity-40 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition"
            >
              解析して取り込む
            </button>
          </div>
        </div>

        <div className="flex items-start justify-between gap-4 border-t border-slate-100 pt-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-rose-700">データクリア</p>
            <p className="text-xs text-slate-500 mt-0.5">全てのプロジェクト・タスク・受信箱を削除（取り消し不可）</p>
          </div>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="bg-white border border-rose-500 text-rose-600 text-sm px-4 py-1.5 rounded-lg hover:bg-rose-50 transition shrink-0"
          >
            クリア
          </button>
        </div>
      </section>

      {/* アプリ情報 */}
      <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <h2 className="text-sm font-bold text-slate-700">アプリ情報</h2>

        {/* バージョンを大きく目立たせる */}
        <div className="bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-100 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 mb-1">現在のバージョン</p>
            <p className="text-3xl font-mono font-bold text-indigo-700 tracking-tight">v{APP_VERSION}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 mb-1">最終更新</p>
            <p className="text-sm font-mono text-slate-700">{LAST_UPDATED}</p>
          </div>
        </div>

        {/* 最新版を取得 */}
        <div className="flex items-start justify-between gap-4 pt-1">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800">最新版を取得</p>
            <p className="text-xs text-slate-500 mt-0.5">
              「ヘッダーのバージョンが上がらない」「新機能が反映されない」と感じたらこれを押すとキャッシュをクリアして再読込します
            </p>
          </div>
          <button
            onClick={handleHardReload}
            className="bg-white border border-indigo-600 text-indigo-600 text-sm px-4 py-1.5 rounded-lg hover:bg-indigo-50 transition shrink-0"
          >
            再読込
          </button>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2">更新履歴（直近）</p>
          <div className="space-y-3">
            {RECENT_CHANGES.map((c, idx) => (
              <div key={c.version} className="text-xs">
                <p className="font-mono text-slate-700">
                  v{c.version} <span className="text-slate-400">— {c.date}</span>
                  {idx === 0 && (
                    <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">最新</span>
                  )}
                </p>
                <ul className="list-disc list-inside text-slate-600 mt-1 space-y-0.5">
                  {c.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-3">完全な履歴は <code className="bg-slate-100 px-1 rounded">CHANGELOG.md</code> 参照</p>
        </div>
      </section>

      {/* Google ログイン確認 */}
      {showGoogleCloudConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-800">クラウドのデータをダウンロードしますか？</h3>
            <p className="text-sm text-slate-600">
              この端末だけにあるデータ（まだクラウドにアップロードしていない分）は
              <strong>画面から見えなくなります</strong>。
              心配な場合は先に「データ管理 → エクスポート」で JSON を保存してください。
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowGoogleCloudConfirm(false)}
                className="text-sm text-slate-500 px-3 py-1.5 hover:text-slate-700"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleGoogleCloudLogin}
                className="bg-indigo-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-indigo-700"
              >
                ダウンロードする
              </button>
            </div>
          </div>
        </div>
      )}

      {/* クリア確認モーダル */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <h3 className="text-base font-bold text-rose-700">本当に全データを削除しますか？</h3>
            <p className="text-sm text-slate-600">
              プロジェクト・タスク・受信箱・未割当タスクが全て消えます。<br />
              <span className="text-xs text-slate-400">必要なら先にエクスポートしておいてください。</span>
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="text-sm text-slate-500 px-3 py-1.5 hover:text-slate-700"
              >
                キャンセル
              </button>
              <button
                onClick={handleClear}
                className="bg-rose-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-rose-700"
              >
                クリアを実行
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
