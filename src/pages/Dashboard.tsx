import { useState, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store'
import type { Project } from '../types'
import { LinkifiedText } from '../lib/linkifyText'
import { taskSizeBadgeClass, taskSizeShortLabel } from '../lib/taskSize'
import { dueBadge, tomorrowStr } from '../lib/due'
import { PROJECT_TYPE_BADGE, PROJECT_TYPE_LABEL } from '../lib/projectMeta'

const COLOR_MAP: Record<string, string> = {
  indigo: 'border-indigo-400 bg-indigo-50',
  emerald: 'border-emerald-400 bg-emerald-50',
  amber: 'border-amber-400 bg-amber-50',
  rose: 'border-rose-400 bg-rose-50',
  slate: 'border-slate-400 bg-slate-50',
}

const BADGE_MAP = PROJECT_TYPE_BADGE
const TYPE_LABEL = PROJECT_TYPE_LABEL

/** 依頼者バッジ。"自分"=アイデアは黄色、他人の依頼は薄い藍 */
function RequesterBadge({ requestedBy }: { requestedBy?: string | null }) {
  if (!requestedBy) return null
  if (requestedBy === '自分') {
    return (
      <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
        💡 アイデア
      </span>
    )
  }
  return (
    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
      from {requestedBy}
    </span>
  )
}

interface ProjectCardProps {
  project: Project
  dragging: boolean
  dragOver: boolean
  onDragStart: () => void
  onDragEnter: () => void
  onDragEnd: () => void
  onDrop: () => void
}

function ProjectCard({
  project,
  dragging,
  dragOver,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
}: ProjectCardProps) {
  const toggleTask = useAppStore((s) => s.toggleTask)
  const activeTasks = project.tasks.filter((t) => !t.done)
  const colorCls = COLOR_MAP[project.color] ?? COLOR_MAP['slate']

  return (
    <Link
      to={`/projects/${project.id}`}
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragEnd={onDragEnd}
      onDrop={(e) => {
        e.preventDefault()
        onDrop()
      }}
      className={`block bg-white rounded-xl border-l-4 p-4 shadow-sm hover:shadow-md transition ${colorCls} ${
        dragging ? 'opacity-40' : ''
      } ${dragOver ? 'ring-2 ring-indigo-400' : ''}`}
    >
      <div className="flex items-start justify-between mb-1 gap-2">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <span className="text-slate-300 cursor-grab select-none" title="ドラッグで並び替え" aria-hidden>⠿</span>
          {project.name}
        </h3>
        <span className={`text-[10px] px-2 py-0.5 rounded shrink-0 ${BADGE_MAP[project.type]}`}>
          {TYPE_LABEL[project.type]}
        </span>
      </div>
      {project.dueDate && (
        <p className="text-[10px] text-slate-600 mb-1">
          期限 <span className="font-medium">{project.dueDate}</span>
        </p>
      )}
      {project.resumeNote && (
        <p className="text-xs text-slate-500 leading-relaxed mb-2 line-clamp-2">
          <LinkifiedText text={project.resumeNote} />
        </p>
      )}
      <div className="space-y-1">
        {activeTasks.slice(0, 2).map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2"
            onClick={(e) => {
              e.preventDefault()
              toggleTask(project.id, t.id)
            }}
          >
            <input
              type="checkbox"
              checked={t.done}
              readOnly
              className="w-3.5 h-3.5 accent-indigo-600 shrink-0"
            />
            <span className="text-xs text-slate-700 truncate">{t.title}</span>
            <span className={`text-[9px] px-1.5 rounded shrink-0 ${taskSizeBadgeClass(t.size)}`}>
              {taskSizeShortLabel(t.size)}
            </span>
            <RequesterBadge requestedBy={t.requestedBy} />
          </div>
        ))}
        {activeTasks.length > 2 && (
          <p className="text-[10px] text-slate-400">+{activeTasks.length - 2} タスク</p>
        )}
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const {
    projects,
    inbox,
    unassignedTasks,
    addToInbox,
    addProject,
    toggleTask,
    deleteTask,
    assignTaskToProject,
    reorderProjects,
  } = useAppStore()
  const [pasteText, setPasteText] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDue, setNewProjectDue] = useState('')
  const [showNewProject, setShowNewProject] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const allTasks = projects.flatMap((p) => p.tasks.map((t) => ({ ...t, projectName: p.name })))
  // 「直近の小タスク」帯は依頼の取りこぼし防止が目的なので、自分発（アイデア）は除外（通知ルールと同じ）
  // 期限切れ → 今日 → 明日 の順に並べ、同日内は元の順を維持
  const urgentTasks = allTasks
    .filter(
      (t) =>
        !t.done &&
        t.size === 'small' &&
        t.dueDate &&
        t.dueDate <= tomorrowStr() &&
        t.requestedBy !== '自分'
    )
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
  const activeUnassigned = unassignedTasks.filter((t) => !t.done)

  function handleCapture() {
    const text = pasteText.trim()
    if (!text) return
    addToInbox(text)
    setPasteText('')
    textareaRef.current?.focus()
  }

  function handleNewProject(e: React.FormEvent) {
    e.preventDefault()
    const name = newProjectName.trim()
    if (!name) return
    addProject(name, 'one-time', newProjectDue.trim() || null)
    setNewProjectName('')
    setNewProjectDue('')
    setShowNewProject(false)
  }

  const sortedActiveProjects = useMemo(() => {
    const active = projects.filter((p) => p.status === 'active')
    return [...active].sort((a, b) => {
      // 手動並び順（sortOrder）があればそれを優先。なければ締切順にフォールバック
      const ao = a.sortOrder
      const bo = b.sortOrder
      if (ao != null && bo != null) return ao - bo
      if (ao != null) return -1
      if (bo != null) return 1
      const ad = a.dueDate
      const bd = b.dueDate
      if (!ad && !bd) return 0
      if (!ad) return 1
      if (!bd) return -1
      return ad.localeCompare(bd)
    })
  }, [projects])

  return (
    <div className="space-y-6">
      {/* 貼り付け欄 */}
      <section className="bg-white rounded-xl shadow-md border-2 border-indigo-200 p-4 sticky top-14 z-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-indigo-600 text-lg">📥</span>
          <span className="text-sm font-semibold text-slate-700">ここに貼り付け（メール本文・依頼内容など）</span>
        </div>
        <textarea
          ref={textareaRef}
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-indigo-400 resize-none"
          rows={2}
          placeholder="ここに入力 → 「受信箱へ」ボタンで保存"
        />
        <div className="flex items-center justify-between gap-2 mt-2">
          {/* 補足文は狭い画面だとボタンと重なるので sm 以上でのみ表示 */}
          <span className="hidden sm:inline text-xs text-slate-400">後で振り分けOK。とにかく忘れない場所へ。</span>
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {inbox.length > 0 && (
              <Link to="/inbox" className="text-xs text-rose-600 hover:underline">
                受信箱 {inbox.length}件
              </Link>
            )}
            <button
              onClick={handleCapture}
              disabled={!pasteText.trim()}
              className="bg-indigo-600 disabled:opacity-40 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition"
            >
              受信箱へ
            </button>
          </div>
        </div>
      </section>

      {/* 未割当タスク */}
      {activeUnassigned.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-2">
            🗂️ 未割当のタスク（後でプロジェクトに振る）
          </h2>
          <div className="space-y-2">
            {activeUnassigned.map((t) => {
              const badge = dueBadge(t.dueDate)
              return (
                <div key={t.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={() => toggleTask(null, t.id)}
                    className="w-5 h-5 accent-indigo-600 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{t.title}</div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className={`text-[10px] px-1.5 rounded ${taskSizeBadgeClass(t.size)}`}>
                        {taskSizeShortLabel(t.size)}
                      </span>
                      {t.dueDate && <span className="text-xs text-slate-500">{t.dueDate}</span>}
                      {badge && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${badge.cls}`}>{badge.label}</span>
                      )}
                      <RequesterBadge requestedBy={t.requestedBy} />
                    </div>
                  </div>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) assignTaskToProject(t.id, e.target.value)
                    }}
                    className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:border-indigo-400"
                  >
                    <option value="">プロジェクトへ…</option>
                    {projects
                      .filter((p) => p.status === 'active')
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={() => deleteTask(null, t.id)}
                    className="text-slate-300 hover:text-rose-400 text-xs shrink-0"
                    aria-label="削除"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 小タスク帯 */}
      {urgentTasks.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-2">
            ⚠️ 直近の小タスク（忘れやすいやつ）
          </h2>
          <div className="space-y-2">
            {urgentTasks.map((t) => {
              const badge = dueBadge(t.dueDate)
              return (
                <div key={t.id} className="bg-amber-50 border-l-4 border-amber-500 rounded-r-lg p-3 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={() => {
                      const proj = projects.find((p) => p.id === t.projectId)
                      if (proj) useAppStore.getState().toggleTask(proj.id, t.id)
                    }}
                    className="w-5 h-5 accent-amber-600 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800">{t.title}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                      <span>{t.projectName}</span>
                      <RequesterBadge requestedBy={t.requestedBy} />
                    </div>
                  </div>
                  {badge && (
                    <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${badge.cls}`}>{badge.label}</span>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* プロジェクト一覧 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-700">プロジェクト</h2>
          <button
            onClick={() => setShowNewProject(true)}
            className="text-xs text-indigo-600 hover:underline"
          >
            + 新規プロジェクト
          </button>
        </div>

        {showNewProject && (
          <form
            onSubmit={handleNewProject}
            className="bg-white rounded-xl border border-indigo-200 p-3 mb-3 flex flex-wrap gap-2 items-end"
          >
            <input
              autoFocus
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="プロジェクト名"
              className="flex-1 min-w-[140px] border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-400"
            />
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-slate-500">締切（任意）</label>
              <input
                type="date"
                value={newProjectDue}
                onChange={(e) => setNewProjectDue(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>
            <button type="submit" className="bg-indigo-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-indigo-700">
              追加
            </button>
            <button type="button" onClick={() => setShowNewProject(false)} className="text-sm text-slate-400 px-2">
              ×
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedActiveProjects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              dragging={dragId === p.id}
              dragOver={overId === p.id && dragId !== p.id}
              onDragStart={() => setDragId(p.id)}
              onDragEnter={() => setOverId(p.id)}
              onDragEnd={() => {
                setDragId(null)
                setOverId(null)
              }}
              onDrop={() => {
                if (dragId && dragId !== p.id) {
                  const ids = sortedActiveProjects.map((x) => x.id)
                  const from = ids.indexOf(dragId)
                  const to = ids.indexOf(p.id)
                  ids.splice(to, 0, ids.splice(from, 1)[0])
                  reorderProjects(ids)
                }
                setDragId(null)
                setOverId(null)
              }}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
