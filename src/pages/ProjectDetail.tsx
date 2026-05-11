import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAppStore } from '../store'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const { projects, updateProject, addTask, toggleTask, deleteTask, addItem, toggleItem, deleteItem } = useAppStore()
  const project = projects.find((p) => p.id === id)

  const [editNote, setEditNote] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [newTask, setNewTask] = useState('')
  const [newTaskSize, setNewTaskSize] = useState<'small' | 'large'>('small')
  const [newTaskDue, setNewTaskDue] = useState('')
  const [newTaskRequestedBy, setNewTaskRequestedBy] = useState('')
  const [newItem, setNewItem] = useState('')

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">プロジェクトが見つかりません</p>
        <Link to="/" className="text-indigo-600 text-sm hover:underline mt-2 block">ダッシュボードへ</Link>
      </div>
    )
  }

  const activeTasks = project.tasks.filter((t) => !t.done)
  const doneTasks = project.tasks.filter((t) => t.done)

  function today() {
    return new Date().toISOString().split('T')[0]
  }
  function dueCls(dueDate: string | null) {
    if (!dueDate) return 'text-slate-500'
    if (dueDate <= today()) return 'text-rose-600 font-semibold'
    return 'text-slate-500'
  }

  // 過去タスクから依頼者候補を集める（datalist サジェスト用）
  const requestedBySuggestions = (() => {
    const set = new Set<string>(['自分'])
    for (const p of projects) {
      for (const t of p.tasks) if (t.requestedBy) set.add(t.requestedBy)
    }
    return Array.from(set)
  })()

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTask.trim()) return
    addTask(
      project!.id,
      newTask.trim(),
      newTaskSize,
      newTaskDue || null,
      newTaskRequestedBy.trim() || null
    )
    setNewTask('')
    setNewTaskDue('')
    setNewTaskRequestedBy('')
  }

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newItem.trim()) return
    addItem(project!.id, newItem.trim())
    setNewItem('')
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <Link to="/" className="text-slate-400 hover:text-slate-600 text-sm">←</Link>
        <h1 className="text-xl font-bold text-slate-800">{project.name}</h1>
        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
          {project.status === 'active' ? '進行中' : '完了'}
        </span>
      </div>

      {/* 再開メモ */}
      <section className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-yellow-700 uppercase tracking-wider">📍 再開メモ</h2>
          <button
            onClick={() => {
              if (editNote) {
                updateProject(project.id, { resumeNote: noteText })
              } else {
                setNoteText(project.resumeNote)
              }
              setEditNote(!editNote)
            }}
            className="text-xs text-yellow-600 hover:underline"
          >
            {editNote ? '保存' : '編集'}
          </button>
        </div>
        {editNote ? (
          <textarea
            autoFocus
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            className="w-full border border-yellow-200 rounded-lg p-2 text-sm focus:outline-none focus:border-yellow-400 bg-white resize-none"
          />
        ) : (
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {project.resumeNote || <span className="text-slate-400 italic">メモなし — 「編集」で追加</span>}
          </p>
        )}
      </section>

      {/* タスク */}
      <section>
        <h2 className="text-sm font-bold text-slate-700 mb-3">タスク</h2>

        <form onSubmit={handleAddTask} className="space-y-2 mb-3">
          <div className="flex gap-2 flex-wrap">
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="タスクを追加..."
              className="flex-1 min-w-32 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-400"
            />
            <select
              value={newTaskSize}
              onChange={(e) => setNewTaskSize(e.target.value as 'small' | 'large')}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none"
            >
              <option value="small">小（30分）</option>
              <option value="large">大</option>
            </select>
            <input
              type="date"
              value={newTaskDue}
              onChange={(e) => setNewTaskDue(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
            />
            <button type="submit" className="bg-indigo-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-indigo-700">追加</button>
          </div>
          <div className="flex gap-2">
            <input
              list="proj-req-list"
              value={newTaskRequestedBy}
              onChange={(e) => setNewTaskRequestedBy(e.target.value)}
              placeholder="依頼者（任意）: 田中さん / 自分 など"
              className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-400"
            />
            <datalist id="proj-req-list">
              {requestedBySuggestions.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
            <button
              type="button"
              onClick={() => setNewTaskRequestedBy('自分')}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 rounded-lg"
            >
              自分
            </button>
          </div>
        </form>

        <div className="space-y-2">
          {activeTasks.map((t) => (
            <div key={t.id} className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 px-3 py-2.5">
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggleTask(project.id, t.id)}
                className="w-4 h-4 accent-indigo-600 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-800">{t.title}</div>
                {t.requestedBy && (
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {t.requestedBy === '自分' ? '💡 アイデア' : `from ${t.requestedBy}`}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${t.size === 'small' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                  {t.size === 'small' ? '小' : '大'}
                </span>
                {t.dueDate && (
                  <span className={`text-xs ${dueCls(t.dueDate)}`}>{t.dueDate}</span>
                )}
                <button onClick={() => deleteTask(project.id, t.id)} className="text-slate-300 hover:text-rose-400 text-xs ml-1">✕</button>
              </div>
            </div>
          ))}

          {activeTasks.length === 0 && (
            <p className="text-xs text-slate-400 py-2">タスクなし</p>
          )}

          {doneTasks.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-slate-400 cursor-pointer select-none">完了済み {doneTasks.length}件</summary>
              <div className="space-y-1 mt-1">
                {doneTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 bg-slate-50 rounded-lg border border-slate-100 px-3 py-2 opacity-60">
                    <input type="checkbox" checked readOnly onChange={() => toggleTask(project.id, t.id)} className="w-4 h-4 accent-indigo-400 shrink-0" />
                    <span className="flex-1 text-sm text-slate-500 line-through">{t.title}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </section>

      {/* アイテムリスト */}
      <section>
        <h2 className="text-sm font-bold text-slate-700 mb-3">アイテムリスト（揃えるもの）</h2>

        <form onSubmit={handleAddItem} className="flex gap-2 mb-3">
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="アイテムを追加..."
            className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-400"
          />
          <button type="submit" className="bg-emerald-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-emerald-700">追加</button>
        </form>

        {project.items.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">アイテムなし</p>
        ) : (
          <div className="space-y-1.5">
            {project.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleItem(project.id, item.id)}
                  className="w-4 h-4 accent-emerald-600 shrink-0"
                />
                <span className={`flex-1 text-sm ${item.done ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                  {item.title}
                </span>
                <button onClick={() => deleteItem(project.id, item.id)} className="text-slate-300 hover:text-rose-400 text-xs">✕</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
