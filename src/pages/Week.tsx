import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store'
import type { Project, Task, WeekStatus } from '../types'
import { taskSizeBadgeClass, taskSizeShortLabel } from '../lib/taskSize'
import { dueBadge, weekRange, waitDays } from '../lib/due'
import { buildWeeklyReport } from '../lib/weeklyReport'

const COLS: { id: WeekStatus; name: string; bar: string }[] = [
  { id: 'todo', name: '今週やる', bar: 'bg-slate-500' },
  { id: 'doing', name: '着手中', bar: 'bg-emerald-600' },
  { id: 'wait', name: '待ち', bar: 'bg-rose-500' },
  { id: 'done', name: '完了', bar: 'bg-slate-400' },
]

interface BoardTask extends Task {
  projectName: string
  /** ボード上の実効列。weekStatus が null でも締切が今週なら 'todo' に自動着地 */
  effectiveStatus: WeekStatus
  autoLanded: boolean
}

function fmtMD(iso: string) {
  const [, m, d] = iso.split('-')
  return `${Number(m)}/${Number(d)}`
}

function WaitRow({ task }: { task: BoardTask }) {
  const updateTaskWait = useAppStore((s) => s.updateTaskWait)
  const [value, setValue] = useState(task.waitFor ?? '')
  const days = waitDays(task.waitSince)
  return (
    <div className="mt-1.5">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => updateTaskWait(task.projectId, task.id, value.trim())}
        placeholder="待ち先（例：○○さん返信待ち）"
        className="w-full text-[11px] text-slate-600 bg-amber-50 border border-dashed border-amber-300 rounded px-1.5 py-1 focus:outline-none focus:border-amber-500"
      />
      <span className={`text-[10px] ${days >= 3 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
        {days >= 3 && '⚠ '}
        {days}日待ち
      </span>
    </div>
  )
}

function BoardCard({ task }: { task: BoardTask }) {
  const setTaskWeekStatus = useAppStore((s) => s.setTaskWeekStatus)
  const colIdx = COLS.findIndex((c) => c.id === task.effectiveStatus)
  const badge = dueBadge(task.dueDate)
  const isDone = task.effectiveStatus === 'done'

  function move(toIdx: number) {
    const col = COLS[toIdx]
    if (!col) return
    setTaskWeekStatus(task.projectId, task.id, col.id)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-2 shadow-sm">
      <div className={`text-xs leading-snug ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
        {task.title}
      </div>
      <div className="flex items-center gap-1 mt-1 flex-wrap">
        {task.projectId ? (
          <Link
            to={`/projects/${task.projectId}`}
            className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded hover:bg-slate-200 truncate max-w-full"
          >
            {task.projectName}
          </Link>
        ) : (
          <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">未割当</span>
        )}
        <span className={`text-[9px] px-1 rounded ${taskSizeBadgeClass(task.size)}`}>
          {taskSizeShortLabel(task.size)}
        </span>
        {task.roundLabel && (
          <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1 rounded">{task.roundLabel}</span>
        )}
        {!isDone && badge && (
          <span className={`text-[9px] px-1 py-0.5 rounded ${badge.cls}`}>{badge.label}</span>
        )}
        {!isDone && !badge && task.dueDate && (
          <span className="text-[9px] text-slate-400">{fmtMD(task.dueDate)}</span>
        )}
      </div>
      {task.effectiveStatus === 'wait' && <WaitRow task={task} />}
      <div className="flex items-center justify-between mt-1.5">
        <button
          onClick={() => setTaskWeekStatus(task.projectId, task.id, null)}
          className="text-[10px] text-slate-300 hover:text-slate-500"
          title="ボードから外す"
        >
          外す
        </button>
        <div className="flex gap-1">
          <button
            onClick={() => move(colIdx - 1)}
            disabled={colIdx === 0}
            className="w-6 h-6 text-[10px] border border-slate-200 rounded bg-white text-slate-500 hover:text-slate-800 disabled:opacity-25"
            aria-label="前の列へ"
          >
            ◀
          </button>
          <button
            onClick={() => move(colIdx + 1)}
            disabled={colIdx === COLS.length - 1}
            className="w-6 h-6 text-[10px] border border-slate-200 rounded bg-white text-slate-500 hover:text-slate-800 disabled:opacity-25"
            aria-label="次の列へ"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Week() {
  const projects = useAppStore((s) => s.projects)
  const unassignedTasks = useAppStore((s) => s.unassignedTasks)
  const setTaskWeekStatus = useAppStore((s) => s.setTaskWeekStatus)
  const closeWeek = useAppStore((s) => s.closeWeek)
  const [showReport, setShowReport] = useState(false)
  const [copied, setCopied] = useState(false)

  const { start, end } = weekRange()

  const { board, backlog } = useMemo(() => {
    const named: (Task & { projectName: string; projectStatus: Project['status'] })[] = [
      ...projects.flatMap((p) =>
        p.tasks.map((t) => ({ ...t, projectName: p.name, projectStatus: p.status }))
      ),
      ...unassignedTasks.map((t) => ({ ...t, projectName: '未割当', projectStatus: 'active' as const })),
    ]
    const board: BoardTask[] = []
    const backlog: (Task & { projectName: string })[] = []
    for (const t of named) {
      if (t.weekStatus != null) {
        board.push({ ...t, effectiveStatus: t.weekStatus, autoLanded: false })
      } else if (!t.done && t.dueDate && t.dueDate <= end) {
        // 締切が今週中（期限切れ含む）→「今週やる」に自動着地
        board.push({ ...t, effectiveStatus: 'todo', autoLanded: true })
      } else if (!t.done && t.projectStatus === 'active') {
        backlog.push(t)
      }
    }
    return { board, backlog }
  }, [projects, unassignedTasks, end])

  const reportText = useMemo(
    () => (showReport ? buildWeeklyReport(projects, unassignedTasks) : ''),
    [showReport, projects, unassignedTasks]
  )

  function handleCloseWeek() {
    const doneCount = board.filter((t) => t.effectiveStatus === 'done').length
    if (doneCount === 0) {
      alert('完了列にタスクがありません。')
      return
    }
    if (confirm(`完了 ${doneCount} 件をボードから下ろします（完了履歴は残ります）。先に「週報を書き出す」は済んでいますか？`)) {
      closeWeek()
    }
  }

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(reportText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* 失敗時は手動コピーしてもらう */
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-bold text-slate-800">今週のボード</h1>
          <p className="text-xs text-slate-500">
            {fmtMD(start)} – {fmtMD(end)} ／ 締切が今週のタスクは自動で「今週やる」に乗ります
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowReport(true)}
            className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-700"
          >
            週報を書き出す
          </button>
          <button
            onClick={handleCloseWeek}
            className="border border-slate-300 text-slate-600 text-xs px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50"
          >
            週の締め
          </button>
        </div>
      </div>

      {/* ボード */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {COLS.map((col) => {
          const cards = board.filter((t) => t.effectiveStatus === col.id)
          return (
            <div key={col.id} className="bg-white/50 border border-slate-200 rounded-xl p-2 min-h-[120px]">
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span className={`w-4 h-1 rounded ${col.bar}`} />
                  {col.name}
                </span>
                <span className="text-[10px] text-slate-400 tabular-nums">{cards.length}</span>
              </div>
              <div className="space-y-1.5">
                {cards.map((t) => (
                  <BoardCard key={t.id} task={t} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* バックログから引き上げ（主動線） */}
      <details className="bg-white rounded-xl border border-slate-200 p-3">
        <summary className="text-sm text-indigo-600 cursor-pointer select-none font-medium">
          ＋ バックログから引き上げる（{backlog.length}件）
        </summary>
        <div className="mt-3 space-y-3">
          {backlog.length === 0 && (
            <p className="text-xs text-slate-400">引き上げられるタスクはありません。</p>
          )}
          {projects
            .filter((p) => p.status === 'active')
            .map((p) => {
              const tasks = backlog.filter((t) => t.projectId === p.id)
              if (tasks.length === 0) return null
              return (
                <div key={p.id}>
                  <div className="text-[11px] font-bold text-slate-500 mb-1">{p.name}</div>
                  <div className="space-y-1">
                    {tasks.map((t) => (
                      <div key={t.id} className="flex items-center gap-2 text-xs text-slate-700">
                        <button
                          onClick={() => setTaskWeekStatus(t.projectId, t.id, 'todo')}
                          className="shrink-0 w-6 h-6 border border-indigo-200 text-indigo-600 rounded hover:bg-indigo-50"
                          aria-label="今週やるへ"
                        >
                          ＋
                        </button>
                        <span className="truncate">{t.title}</span>
                        {t.dueDate && <span className="text-[10px] text-slate-400 shrink-0">{fmtMD(t.dueDate)}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          {(() => {
            const tasks = backlog.filter((t) => t.projectId === null)
            if (tasks.length === 0) return null
            return (
              <div>
                <div className="text-[11px] font-bold text-slate-500 mb-1">未割当</div>
                <div className="space-y-1">
                  {tasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 text-xs text-slate-700">
                      <button
                        onClick={() => setTaskWeekStatus(null, t.id, 'todo')}
                        className="shrink-0 w-6 h-6 border border-indigo-200 text-indigo-600 rounded hover:bg-indigo-50"
                        aria-label="今週やるへ"
                      >
                        ＋
                      </button>
                      <span className="truncate">{t.title}</span>
                      {t.dueDate && <span className="text-[10px] text-slate-400 shrink-0">{fmtMD(t.dueDate)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      </details>

      {/* 週報モーダル */}
      {showReport && (
        <div
          className="fixed inset-0 bg-slate-900/45 flex items-center justify-center p-4 z-[60]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowReport(false)
          }}
        >
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] overflow-auto p-5 shadow-2xl">
            <h2 className="text-base font-bold text-slate-800 mb-1">今週の週報ドラフト</h2>
            <p className="text-xs text-slate-500 mb-3">
              完了＝今週動いたこと（受信箱で即応した分も入ります）／待ち＝詰まり。コピーして整えてください。
            </p>
            <textarea
              readOnly
              value={reportText}
              className="w-full min-h-[300px] bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs leading-relaxed font-mono text-slate-700 resize-vertical focus:outline-none"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setShowReport(false)}
                className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
              >
                閉じる
              </button>
              <button
                onClick={copyReport}
                className="text-xs px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {copied ? 'コピーしました' : 'コピー'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
