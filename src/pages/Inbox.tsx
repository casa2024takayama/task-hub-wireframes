import { useState } from 'react'
import { useAppStore } from '../store'

export default function Inbox() {
  const { inbox, projects, removeFromInbox, promoteInboxItem } = useAppStore()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, { title: string; projectId: string; size: 'small' | 'large'; dueDate: string }>>({})

  function getForm(id: string) {
    return form[id] ?? { title: '', projectId: '', size: 'small', dueDate: '' }
  }

  function setField<K extends 'title' | 'projectId' | 'size' | 'dueDate'>(id: string, key: K, value: string) {
    setForm((prev) => ({ ...prev, [id]: { ...getForm(id), [key]: value } }))
  }

  function handlePromote(id: string) {
    const f = getForm(id)
    if (!f.title.trim()) return
    promoteInboxItem(id, {
      title: f.title.trim(),
      projectId: f.projectId || null,
      size: f.size,
      dueDate: f.dueDate || null,
    })
    setExpandedId(null)
  }

  return (
    <div>
      <h1 className="text-lg font-bold text-slate-800 mb-4">
        受信箱
        {inbox.length > 0 && (
          <span className="ml-2 text-sm text-slate-500">{inbox.length}件</span>
        )}
      </h1>

      {inbox.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <p className="text-slate-400 text-sm">受信箱は空です 🎉</p>
        </div>
      ) : (
        <div className="space-y-2">
          {inbox.map((item) => {
            const isOpen = expandedId === item.id
            const f = getForm(item.id)
            const createdAt = new Date(item.createdAt)
            const timeStr = `${createdAt.getMonth() + 1}/${createdAt.getDate()} ${String(createdAt.getHours()).padStart(2, '0')}:${String(createdAt.getMinutes()).padStart(2, '0')}`

            return (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                {/* ヘッダー行 */}
                <button
                  className="w-full text-left p-4 flex items-start gap-3"
                  onClick={() => setExpandedId(isOpen ? null : item.id)}
                >
                  <span className="text-indigo-500 shrink-0 mt-0.5">📨</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 line-clamp-2">{item.rawText}</p>
                    <p className="text-xs text-slate-400 mt-1">{timeStr}</p>
                  </div>
                  <span className="text-slate-400 text-sm shrink-0">{isOpen ? '▲' : '▼'}</span>
                </button>

                {/* 振り分けフォーム */}
                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3">
                    <p className="text-xs font-semibold text-slate-600 mb-1">3つだけ決めて振り分け</p>

                    <div>
                      <label className="text-xs text-slate-500 block mb-1">タスクタイトル</label>
                      <input
                        autoFocus
                        value={f.title}
                        onChange={(e) => setField(item.id, 'title', e.target.value)}
                        placeholder="何をすればよいか一言で"
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-400"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">プロジェクト</label>
                        <select
                          value={f.projectId}
                          onChange={(e) => setField(item.id, 'projectId', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-400 bg-white"
                        >
                          <option value="">未割当</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-slate-500 block mb-1">サイズ</label>
                        <select
                          value={f.size}
                          onChange={(e) => setField(item.id, 'size', e.target.value as 'small' | 'large')}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-400 bg-white"
                        >
                          <option value="small">小（30分以内）</option>
                          <option value="large">大</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-slate-500 block mb-1">締切</label>
                        <input
                          type="date"
                          value={f.dueDate}
                          onChange={(e) => setField(item.id, 'dueDate', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => removeFromInbox(item.id)}
                        className="text-xs text-slate-400 hover:text-rose-500"
                      >
                        削除
                      </button>
                      <button
                        onClick={() => handlePromote(item.id)}
                        disabled={!f.title.trim()}
                        className="bg-indigo-600 disabled:opacity-40 text-white text-sm px-5 py-1.5 rounded-lg hover:bg-indigo-700 transition"
                      >
                        振り分け完了
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
