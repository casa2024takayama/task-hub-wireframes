import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store'

const APP_VERSION =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'

const RECENT_CHANGES: { version: string; date: string; lines: string[] }[] = [
  {
    version: '0.3.0',
    date: '2026-05-11',
    lines: [
      'Firestore でクロスデバイス同期（リアルタイム）',
      'ヘッダーに同期ステータスドット表示',
      '入力欄の Enter 送信を廃止（IME 誤登録対策）',
      '設定画面のバージョン表示を大型化',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-05-11',
    lines: [
      '環境設定画面（エクスポート / インポート / クリア）',
      'ヘッダーに現在日時表示',
      'レポートに最近完了したタスク一覧',
      'バージョン管理（CHANGELOG.md）運用開始',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-05-11',
    lines: [
      'HTML ワイヤーフレームから React 移植',
      '貼り付け → 受信箱 → タスク化フロー',
      '未割当タスクの保持と割り当て',
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
