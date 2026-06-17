import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'
import { LinkifiedText } from '../lib/linkifyText'
import { TASK_SIZE_OPTIONS, taskSizeBadgeClass, taskSizeShortLabel } from '../lib/taskSize'
import { ROUND_TEMPLATES } from '../lib/roundTemplates'
import { PROJECT_TYPE_OPTIONS } from '../lib/projectMeta'
import type { ProjectType, TaskSize } from '../types'

function taskAfterProjectDeadline(taskDue: string | null, projectDue: string | null): boolean {
  if (!taskDue || !projectDue) return false
  return taskDue > projectDue
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { projects, updateProject, deleteProject, addTask, toggleTask, deleteTask, moveTaskToProject, updateTaskTitle, addItem, toggleItem, deleteItem, createRound } = useAppStore()
  const project = projects.find((p) => p.id === id)

  const [editNote, setEditNote] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [editName, setEditName] = useState(false)
  const [nameText, setNameText] = useState('')
  const [editTaskId, setEditTaskId] = useState<string | null>(null)
  const [taskTitleText, setTaskTitleText] = useState('')
  const [newTask, setNewTask] = useState('')
  const [newTaskSize, setNewTaskSize] = useState<TaskSize>('small')
  const [newTaskDue, setNewTaskDue] = useState('')
  const [newTaskRequestedBy, setNewTaskRequestedBy] = useState('')
  const [newItem, setNewItem] = useState('')
  const [showRound, setShowRound] = useState(false)
  const [roundTemplateId, setRoundTemplateId] = useState(ROUND_TEMPLATES[0].id)
  const [roundBaseDate, setRoundBaseDate] = useState('')
  const [roundLabel, setRoundLabel] = useState('')
  const [roundMsg, setRoundMsg] = useState('')

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
  const otherActiveProjects = projects.filter((p) => p.id !== project.id && p.status === 'active')

  function today() {
    return new Date().toISOString().split('T')[0]
  }
  function dueCls(dueDate: string | null) {
    if (!dueDate) return 'text-slate-500'
    const t = today()
    if (dueDate < t) return 'text-rose-700 font-bold'
    if (dueDate === t) return 'text-rose-600 font-semibold'
    return 'text-slate-500'
  }
  function isOverdue(dueDate: string | null) {
    return !!dueDate && dueDate < today()
  }

  // 過去タスクから依頼者候補を集める（datalist サジェスト用）
  const requestedBySuggestions = (() => {
    const set = new Set<string>(['自分'])
    for (const p of projects) {
      for (const t of p.tasks) if (t.requestedBy) set.add(t.requestedBy)
    }
    return Array.from(set)
  })()

  function handleCreateRound(e: React.FormEvent) {
    e.preventDefault()
    if (!roundBaseDate) {
      setRoundMsg('基準日を選んでください')
      return
    }
    const result = createRound(project!.id, roundTemplateId, roundBaseDate, roundLabel)
    if (result) {
      setRoundMsg(`タスク ${result.tasks} 件${result.items ? `・アイテム ${result.items} 件` : ''} を作成しました`)
      setRoundBaseDate('')
      setRoundLabel('')
      setShowRound(false)
    }
  }

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <Link to="/" className="text-slate-400 hover:text-slate-600 text-sm shrink-0">
            ←
          </Link>
          {editName ? (
            <input
              autoFocus
              value={nameText}
              onChange={(e) => setNameText(e.target.value)}
              onBlur={() => {
                const v = nameText.trim()
                if (v) updateProject(project.id, { name: v })
                setEditName(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                if (e.key === 'Escape') setEditName(false)
              }}
              className="text-xl font-bold text-slate-800 border-b border-indigo-300 bg-transparent focus:outline-none"
            />
          ) : (
            <h1
              className="text-xl font-bold text-slate-800 cursor-text hover:bg-slate-50 rounded px-1 -mx-1"
              title="クリックで名前を編集"
              onClick={() => {
                setNameText(project.name)
                setEditName(true)
              }}
            >
              {project.name}
            </h1>
          )}
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              project.status === 'active'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {project.status === 'active' ? '進行中' : project.status === 'completed' ? '完了' : '一時停止'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-1.5 text-slate-600">
            <span className="text-xs whitespace-nowrap">種別</span>
            <select
              value={project.type}
              onChange={(e) => updateProject(project.id, { type: e.target.value as ProjectType })}
              className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:border-indigo-400"
            >
              {PROJECT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-slate-600">
            <span className="text-xs whitespace-nowrap">締切</span>
            <input
              type="date"
              value={project.dueDate ?? ''}
              onChange={(e) => updateProject(project.id, { dueDate: e.target.value || null })}
              className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-400"
            />
          </label>
          {project.status === 'active' && (
            <button
              type="button"
              onClick={() => updateProject(project.id, { status: 'completed' })}
              className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700"
            >
              完了にする
            </button>
          )}
          {project.status === 'completed' && (
            <button
              type="button"
              onClick={() => updateProject(project.id, { status: 'active' })}
              className="text-xs border border-indigo-300 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50"
            >
              再開（完了日のみ取り消し）
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  `「${project.name}」を削除します。中のタスク ${project.tasks.length} 件・アイテム ${project.items.length} 件も一緒に削除されます。よろしいですか？`
                )
              ) {
                deleteProject(project.id)
                navigate('/')
              }
            }}
            className="text-xs border border-rose-300 text-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-50"
          >
            削除
          </button>
        </div>
      </div>
      {project.status === 'completed' && project.completedAt && (
        <p className="text-xs text-slate-500">
          完了記録: {new Date(project.completedAt).toLocaleString('ja-JP')}
        </p>
      )}

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
            {project.resumeNote ? (
              <LinkifiedText text={project.resumeNote} />
            ) : (
              <span className="text-slate-400 italic">メモなし — 「編集」で追加</span>
            )}
          </p>
        )}
      </section>

      {/* ルーチンの回を作成（テンプレ） */}
      <section className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700">🔁 次回分を作成（テンプレから一括）</h2>
          <button
            onClick={() => { setShowRound((v) => !v); setRoundMsg('') }}
            className="text-xs text-indigo-600 hover:underline"
          >
            {showRound ? '閉じる' : '開く'}
          </button>
        </div>
        {roundMsg && <p className="text-xs text-emerald-700 mt-2">{roundMsg}</p>}
        {showRound && (
          <form onSubmit={handleCreateRound} className="mt-3 space-y-3">
            <div>
              <label className="text-[11px] text-slate-500 block mb-1">テンプレート</label>
              <select
                value={roundTemplateId}
                onChange={(e) => setRoundTemplateId(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400"
              >
                {ROUND_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[140px]">
                <label className="text-[11px] text-slate-500 block mb-1">
                  基準日（{ROUND_TEMPLATES.find((t) => t.id === roundTemplateId)?.baseDateLabel}）
                </label>
                <input
                  type="date"
                  value={roundBaseDate}
                  onChange={(e) => setRoundBaseDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="text-[11px] text-slate-500 block mb-1">回ラベル（任意・例 #16 / 5月回）</label>
                <input
                  type="text"
                  value={roundLabel}
                  onChange={(e) => setRoundLabel(e.target.value)}
                  placeholder="#16"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>
            {/* プレビュー */}
            <div className="bg-slate-50 rounded-lg p-2 text-[11px] text-slate-600 space-y-0.5">
              {ROUND_TEMPLATES.find((t) => t.id === roundTemplateId)?.steps.map((s) => (
                <div key={s.title} className="flex justify-between">
                  <span>{s.title}</span>
                  <span className="text-slate-400">
                    基準日{s.offsetDays === 0 ? '当日' : s.offsetDays > 0 ? `+${s.offsetDays}日` : `${s.offsetDays}日`}
                  </span>
                </div>
              ))}
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white text-sm py-2 rounded-lg hover:bg-indigo-700">
              このテンプレで回を作成
            </button>
          </form>
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
              onChange={(e) => setNewTaskSize(e.target.value as TaskSize)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none max-w-[11rem]"
            >
              {TASK_SIZE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
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
          {activeTasks.map((t) => {
            const overdueProject = taskAfterProjectDeadline(t.dueDate, project.dueDate)
            return (
              <div key={t.id} className="bg-white rounded-lg border border-slate-200 px-3 py-2.5 space-y-1">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={() => toggleTask(project.id, t.id)}
                    className="w-4 h-4 accent-indigo-600 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    {editTaskId === t.id ? (
                      <input
                        autoFocus
                        value={taskTitleText}
                        onChange={(e) => setTaskTitleText(e.target.value)}
                        onBlur={() => {
                          updateTaskTitle(project.id, t.id, taskTitleText)
                          setEditTaskId(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                          if (e.key === 'Escape') setEditTaskId(null)
                        }}
                        className="w-full text-sm text-slate-800 border-b border-indigo-300 bg-transparent focus:outline-none"
                      />
                    ) : (
                      <div
                        className="text-sm text-slate-800 cursor-text hover:bg-slate-50 rounded px-1 -mx-1"
                        title="クリックで名前を編集"
                        onClick={() => {
                          setTaskTitleText(t.title)
                          setEditTaskId(t.id)
                        }}
                      >
                        {t.title}
                      </div>
                    )}
                    {t.requestedBy && (
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {t.requestedBy === '自分' ? '💡 アイデア' : `from ${t.requestedBy}`}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${taskSizeBadgeClass(t.size)}`}>
                        {taskSizeShortLabel(t.size)}
                      </span>
                      {t.dueDate && (
                        <span className={`text-xs ${dueCls(t.dueDate)}`}>{t.dueDate}</span>
                      )}
                      {isOverdue(t.dueDate) && !t.done && (
                        <span className="text-[10px] bg-rose-500 text-white px-1.5 py-0.5 rounded font-medium">
                          期限切れ
                        </span>
                      )}
                      {otherActiveProjects.length > 0 && (
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) moveTaskToProject(project.id, t.id, e.target.value)
                          }}
                          title="別プロジェクトへ移動"
                          className="text-[10px] border border-slate-200 rounded px-1 py-0.5 bg-white text-slate-500 focus:outline-none focus:border-indigo-400 max-w-[88px]"
                        >
                          <option value="">→ 移動</option>
                          {otherActiveProjects.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      )}
                      <button
                        onClick={() => deleteTask(project.id, t.id)}
                        className="text-slate-300 hover:text-rose-400 text-xs ml-1"
                      >
                        ✕
                      </button>
                    </div>
                    {overdueProject && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        タスク締切がプロジェクト締切より後
                      </span>
                    )}
                  </div>
                </div>
                {t.originalPaste && (
                  <details className="text-[11px] text-slate-500 pl-7">
                    <summary className="cursor-pointer select-none text-indigo-600 hover:underline">
                      コピペ元を表示
                    </summary>
                    <pre className="mt-1 whitespace-pre-wrap break-words bg-slate-50 rounded p-2 text-slate-600 max-h-40 overflow-y-auto">
                      {t.originalPaste}
                    </pre>
                  </details>
                )}
              </div>
            )
          })}

          {activeTasks.length === 0 && (
            <p className="text-xs text-slate-400 py-2">タスクなし</p>
          )}

          {doneTasks.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-slate-400 cursor-pointer select-none">完了済み {doneTasks.length}件</summary>
              <div className="space-y-1 mt-1">
                {doneTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 bg-slate-50 rounded-lg border border-slate-100 px-3 py-2 opacity-60">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={() => toggleTask(project.id, t.id)}
                      className="w-4 h-4 accent-indigo-400 shrink-0"
                    />
                    <span className="flex-1 text-sm text-slate-500 line-through">{t.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${taskSizeBadgeClass(t.size)}`}>
                      {taskSizeShortLabel(t.size)}
                    </span>
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
