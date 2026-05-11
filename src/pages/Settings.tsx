import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store'
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
  const clearAll = useAppStore((s) => s.clearAll)

  const fileInputRef = useRef<HTMLInputElement>(null)
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
      setMessage({ type: 'success', text: 'Google と連携しました。この端末のデータはクラウドに紐付け済みです。' })
    } catch (e) {
      setMessage({ type: 'error', text: `連携に失敗：${e instanceof Error ? e.message : '不明なエラー'}` })
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleGoogleCloudLogin() {
    setShowGoogleCloudConfirm(false)
    setAuthBusy(true)
    try {
      await signInWithGoogleReplacingSession()
      setMessage({ type: 'success', text: 'Google でログインしました。クラウド上のデータを読み込みます。' })
    } catch (e) {
      setMessage({ type: 'error', text: `ログインに失敗：${e instanceof Error ? e.message : '不明なエラー'}` })
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
          <p className="font-semibold text-amber-800 mb-1">匿名ログインについて</p>
          <p>
            匿名のままでは<strong>ブラウザごとに Firebase のユーザー ID が別</strong>になります。
            そのため「同期済み」と出ていても<strong>他の端末とは別のデータ</strong>を見ています。
            PC とスマホで同じデータにするには、下の <strong>Google 連携</strong> が必要です。
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
              <strong>最初に使う端末</strong>で「Google と連携（この端末のデータを紐付け）」
            </li>
            <li>
              <strong>もう一方の端末</strong>で「Google でログイン（他端末と同じデータ）」
            </li>
          </ol>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            disabled={authBusy || !authSummary.isAnonymous}
            onClick={handleLinkGoogle}
            className="flex-1 bg-indigo-600 disabled:opacity-40 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Google と連携（この端末のデータを紐付け）
          </button>
          <button
            type="button"
            disabled={authBusy || !authSummary.isAnonymous}
            onClick={() => setShowGoogleCloudConfirm(true)}
            className="flex-1 bg-white border border-indigo-600 text-indigo-600 text-sm px-4 py-2 rounded-lg hover:bg-indigo-50 transition disabled:opacity-40"
          >
            Google でログイン（他端末と同じデータ）
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
            <h3 className="text-base font-bold text-slate-800">Google でログインしますか？</h3>
            <p className="text-sm text-slate-600">
              この端末だけの匿名データがまだクラウドに上がっていない場合、
              <strong>ログイン後に表示がクラウド側の内容で上書き</strong>されることがあります。
              必要なら先にエクスポートしてください。
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
                ログインする
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
