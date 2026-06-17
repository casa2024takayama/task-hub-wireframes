import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store'
import type { Project, Task, WeekStatus } from '../types'
import { taskSizeShortLabel } from '../lib/taskSize'
import { dueBadge, weekRange, waitDays } from '../lib/due'
import { buildWeeklyReport } from '../lib/weeklyReport'

// 旧・朝のカンバン（morning-kanban.html）由来のペーパー調テーマ。
// このページだけアプリ標準の slate ではなく紙の質感に寄せる（ユーザー要望）。
const INK = '#2B2620'
const INK_SOFT = '#6B6256'
const LINE = '#D8CDB8'
const CARD_BG = '#FBF8F1'
const ACCENT = '#BD4B2A'

const COLS: { id: WeekStatus; name: string; bar: string }[] = [
  { id: 'todo', name: '今週やる', bar: '#7A6A52' },
  { id: 'doing', name: '着手中', bar: '#2F6E5B' },
  { id: 'wait', name: '待ち', bar: '#BD4B2A' },
  { id: 'done', name: '完了', bar: '#5A5246' },
]

// 施策チップと同じ系統のパレット。プロジェクト ID から安定的に色を割り当てる
const PALETTE = [
  '#BD4B2A', '#2F6E5B', '#3A6EA5', '#8A6D3B', '#7A4A6E', '#4F7A52',
  '#A85A2A', '#566B7A', '#2E5C66', '#B58A2C', '#8C3A4E', '#6B6E37',
]
function projectColor(projectId: string | null): string {
  if (!projectId) return INK_SOFT
  let h = 0
  for (let i = 0; i < projectId.length; i++) h = (h * 31 + projectId.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

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
        className="w-full text-[11.5px] rounded-md px-2 py-1 focus:outline-none"
        style={{
          color: INK_SOFT,
          background: '#FFF8EE',
          border: '1px dashed #E9C9B5',
        }}
      />
      <span
        className="text-[10px] font-medium"
        style={{ color: days >= 3 ? ACCENT : INK_SOFT }}
      >
        {days >= 3 && '⚠ '}
        {days}日待ち
      </span>
    </div>
  )
}

function BoardCard({ task }: { task: BoardTask }) {
  const setTaskWeekStatus = useAppStore((s) => s.setTaskWeekStatus)
  const updateTaskTitle = useAppStore((s) => s.updateTaskTitle)
  const colIdx = COLS.findIndex((c) => c.id === task.effectiveStatus)
  const badge = dueBadge(task.dueDate)
  const isDone = task.effectiveStatus === 'done'
  const color = projectColor(task.projectId)
  const [editing, setEditing] = useState(false)
  const [titleText, setTitleText] = useState(task.title)

  function move(toIdx: number) {
    const col = COLS[toIdx]
    if (!col) return
    setTaskWeekStatus(task.projectId, task.id, col.id)
  }

  return (
    <div
      className="rounded-[10px] p-[10px] pb-2"
      style={{
        background: CARD_BG,
        border: `1px solid ${LINE}`,
        borderLeft: `4px solid ${color}`,
        boxShadow: '0 1px 2px rgba(43,38,32,.08),0 4px 14px rgba(43,38,32,.06)',
      }}
    >
      {editing ? (
        <input
          autoFocus
          value={titleText}
          onChange={(e) => setTitleText(e.target.value)}
          onBlur={() => {
            updateTaskTitle(task.projectId, task.id, titleText)
            setEditing(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            if (e.key === 'Escape') {
              setTitleText(task.title)
              setEditing(false)
            }
          }}
          className="w-full text-[13.5px] leading-normal bg-transparent focus:outline-none"
          style={{ color: INK, borderBottom: `1px solid ${ACCENT}` }}
        />
      ) : (
        <div
          className="text-[13.5px] leading-normal break-words cursor-text"
          style={{ color: isDone ? INK_SOFT : INK, textDecoration: isDone ? 'line-through' : 'none' }}
          title="クリックで名前を編集"
          onClick={() => {
            setTitleText(task.title)
            setEditing(true)
          }}
        >
          {task.title}
        </div>
      )}
      {task.effectiveStatus === 'wait' && <WaitRow task={task} />}
      <div className="flex items-center justify-between mt-2 gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          {task.projectId ? (
            <Link
              to={`/projects/${task.projectId}`}
              className="text-[10.5px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
              style={{ background: color + '22', color }}
            >
              {task.projectName}
            </Link>
          ) : (
            <span className="text-[10.5px] px-2 py-0.5 rounded-full" style={{ background: '#ddd', color: '#555' }}>
              未割当
            </span>
          )}
          <span className="text-[10px] tabular-nums" style={{ color: INK_SOFT }}>
            {taskSizeShortLabel(task.size)}
            {task.roundLabel && ` ・${task.roundLabel}`}
            {task.createdAt && ` ・${fmtMD(task.createdAt.split('T')[0])}`}
          </span>
          {!isDone && badge && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded ${badge.cls}`}>{badge.label}</span>
          )}
          {!isDone && !badge && task.dueDate && (
            <span className="text-[10px]" style={{ color: ACCENT }}>
              〆{fmtMD(task.dueDate)}
            </span>
          )}
        </div>
        <div className="flex gap-[3px] shrink-0 items-center">
          <button
            onClick={() => move(colIdx - 1)}
            disabled={colIdx === 0}
            className="w-[23px] h-[23px] text-xs rounded-md disabled:opacity-25 flex items-center justify-center"
            style={{ border: `1px solid ${LINE}`, background: '#fff', color: INK_SOFT }}
            aria-label="前の列へ"
          >
            ◀
          </button>
          <button
            onClick={() => move(colIdx + 1)}
            disabled={colIdx === COLS.length - 1}
            className="w-[23px] h-[23px] text-xs rounded-md disabled:opacity-25 flex items-center justify-center"
            style={{ border: `1px solid ${LINE}`, background: '#fff', color: INK_SOFT }}
            aria-label="次の列へ"
          >
            ▶
          </button>
          <button
            onClick={() => setTaskWeekStatus(task.projectId, task.id, null)}
            className="h-[23px] px-1.5 text-[10px] rounded-md flex items-center justify-center hover:opacity-70 whitespace-nowrap"
            style={{ border: `1px solid ${LINE}`, background: '#fff', color: INK_SOFT }}
            title="今週やるから外してバックログへ戻す"
            aria-label="バックログへ戻す"
          >
            ↩︎ バックログ
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

  const serif = { fontFamily: "'Zen Old Mincho', serif" }
  const sans = { fontFamily: "'Zen Kaku Gothic New', -apple-system, 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif" }

  return (
    <div style={{ ...sans, color: INK }} className="space-y-5">
      {/* ヘッダー */}
      <div>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[28px] font-bold leading-tight tracking-wide" style={serif}>
              今週のボード<span style={{ color: ACCENT }}>.</span>
            </h1>
            <p className="text-[12.5px] mt-1 tracking-wider" style={{ color: INK_SOFT }}>
              WEEK BOARD ／ 完了は週報の「動いたこと」・待ちは「詰まり」に変換されます
            </p>
          </div>
          <div className="text-right" style={{ ...serif, color: INK_SOFT }}>
            <span className="text-sm block">— 今週 —</span>
            <b className="text-[20px] tracking-wide" style={{ color: INK }}>
              {fmtMD(start)} – {fmtMD(end)}
            </b>
          </div>
        </div>
        <div
          className="h-[2px] rounded mt-3"
          style={{ background: `linear-gradient(90deg, ${ACCENT} 0 56px, ${LINE} 56px 100%)` }}
        />
      </div>

      {/* アクション */}
      <div className="flex gap-2.5 flex-wrap items-center">
        <button
          onClick={() => setShowReport(true)}
          className="text-[13px] font-bold px-4 py-2.5 rounded-[9px]"
          style={{ background: INK, color: '#F2ECDF', border: `1px solid ${INK}` }}
        >
          週報を書き出す
        </button>
        <button
          onClick={handleCloseWeek}
          className="text-[13px] px-4 py-2.5 rounded-[9px] hover:brightness-[.98]"
          style={{ background: CARD_BG, color: INK, border: `1px solid ${LINE}` }}
        >
          完了をクリア（週の締め）
        </button>
        <span className="text-[11px]" style={{ color: INK_SOFT }}>
          締切が今週のタスクは自動で「今週やる」に乗ります
        </span>
      </div>

      {/* ボード */}
      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 min-[760px]:grid-cols-4 gap-3.5">
        {COLS.map((col) => {
          const cards = board.filter((t) => t.effectiveStatus === col.id)
          return (
            <div
              key={col.id}
              className="rounded-[14px] p-3 pb-4 min-h-[160px]"
              style={{ background: 'rgba(255,255,255,.35)', border: `1px solid ${LINE}` }}
            >
              <div className="flex items-center justify-between mx-1 mb-3">
                <span className="font-bold text-[13.5px] tracking-wide flex items-center gap-[7px]">
                  <span className="w-[18px] h-[3px] rounded-sm" style={{ background: col.bar }} />
                  {col.name}
                </span>
                <span className="text-[11px] tabular-nums" style={{ color: INK_SOFT }}>
                  {cards.length}
                </span>
              </div>
              <div className="space-y-[9px]">
                {cards.map((t) => (
                  <BoardCard key={t.id} task={t} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* バックログから引き上げ（主動線） */}
      <details
        className="rounded-[14px] p-4"
        style={{ background: CARD_BG, border: `1px solid ${LINE}` }}
      >
        <summary className="text-sm cursor-pointer select-none font-bold" style={{ color: ACCENT }}>
          ＋ バックログから引き上げる（{backlog.length}件）
        </summary>
        <div className="mt-3 space-y-3">
          {backlog.length === 0 && (
            <p className="text-xs" style={{ color: INK_SOFT }}>
              引き上げられるタスクはありません。
            </p>
          )}
          {projects
            .filter((p) => p.status === 'active')
            .map((p) => {
              const tasks = backlog.filter((t) => t.projectId === p.id)
              if (tasks.length === 0) return null
              const color = projectColor(p.id)
              return (
                <div key={p.id}>
                  <div className="text-[11px] font-bold mb-1 flex items-center gap-1.5" style={{ color: INK_SOFT }}>
                    <span className="w-[9px] h-[9px] rounded-full inline-block" style={{ background: color }} />
                    {p.name}
                  </div>
                  <div className="space-y-1">
                    {tasks.map((t) => (
                      <div key={t.id} className="flex items-center gap-2 text-[13px]">
                        <button
                          onClick={() => setTaskWeekStatus(t.projectId, t.id, 'todo')}
                          className="shrink-0 w-6 h-6 rounded-md text-sm leading-none"
                          style={{ border: `1px solid ${LINE}`, background: '#fff', color: ACCENT }}
                          aria-label="今週やるへ"
                        >
                          ＋
                        </button>
                        <span className="truncate">{t.title}</span>
                        {t.dueDate && (
                          <span className="text-[10.5px] shrink-0 tabular-nums" style={{ color: INK_SOFT }}>
                            {fmtMD(t.dueDate)}
                          </span>
                        )}
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
                <div className="text-[11px] font-bold mb-1" style={{ color: INK_SOFT }}>
                  未割当
                </div>
                <div className="space-y-1">
                  {tasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 text-[13px]">
                      <button
                        onClick={() => setTaskWeekStatus(null, t.id, 'todo')}
                        className="shrink-0 w-6 h-6 rounded-md text-sm leading-none"
                        style={{ border: `1px solid ${LINE}`, background: '#fff', color: ACCENT }}
                        aria-label="今週やるへ"
                      >
                        ＋
                      </button>
                      <span className="truncate">{t.title}</span>
                      {t.dueDate && (
                        <span className="text-[10.5px] shrink-0 tabular-nums" style={{ color: INK_SOFT }}>
                          {fmtMD(t.dueDate)}
                        </span>
                      )}
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
          className="fixed inset-0 flex items-center justify-center p-5 z-[60]"
          style={{ background: 'rgba(43,38,32,.45)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowReport(false)
          }}
        >
          <div
            className="rounded-2xl max-w-[620px] w-full max-h-[86vh] overflow-auto p-[22px]"
            style={{ ...sans, background: '#F2ECDF', border: `1px solid ${LINE}`, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}
          >
            <h2 className="text-[19px] font-bold mb-1" style={serif}>
              今週の週報ドラフト
            </h2>
            <p className="text-xs mb-3.5" style={{ color: INK_SOFT }}>
              完了＝今週動いたこと（受信箱で即応した分も入ります）／待ち＝詰まり・要相談。コピーして整えてください。
            </p>
            <textarea
              readOnly
              value={reportText}
              className="w-full min-h-[300px] rounded-[10px] p-3.5 text-[13px] leading-relaxed font-mono resize-y focus:outline-none"
              style={{ background: CARD_BG, border: `1px solid ${LINE}`, color: INK }}
            />
            <div className="flex justify-end gap-2.5 mt-3.5">
              <button
                onClick={() => setShowReport(false)}
                className="text-[13px] px-3.5 py-2 rounded-[9px]"
                style={{ background: CARD_BG, color: INK, border: `1px solid ${LINE}` }}
              >
                閉じる
              </button>
              <button
                onClick={copyReport}
                className="text-[13px] font-bold px-4 py-2 rounded-[9px]"
                style={{ background: INK, color: '#F2ECDF', border: `1px solid ${INK}` }}
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
