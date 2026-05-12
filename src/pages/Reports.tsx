import { useAppStore } from '../store'
import { taskSizeBadgeClass, taskSizeShortLabel } from '../lib/taskSize'

function weekStart() {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}
function monthStart() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function Reports() {
  const { projects, inbox, unassignedTasks } = useAppStore()

  const projectTasksWithName = projects.flatMap((p) => p.tasks.map((t) => ({ ...t, projectName: p.name })))
  const unassignedWithLabel = unassignedTasks.map((t) => ({ ...t, projectName: '（未割当）' }))
  const allTasks = [...projectTasksWithName, ...unassignedWithLabel]

  const ws = weekStart()
  const ms = monthStart()

  function completedAtOf(t: { completedAt?: string | null; createdAt: string }) {
    return t.completedAt ?? t.createdAt
  }

  const weekDone = allTasks.filter((t) => t.done && new Date(completedAtOf(t)) >= ws).length
  const monthDone = allTasks.filter((t) => t.done && new Date(completedAtOf(t)) >= ms).length
  const activeProjects = projects.filter((p) => p.status === 'active').length
  const routineProjects = projects.filter((p) => p.type !== 'one-time' && p.status === 'active').length
  const pendingTasks = allTasks.filter((t) => !t.done).length
  const smallPending = allTasks.filter((t) => !t.done && t.size === 'small').length

  const today = new Date().toISOString().split('T')[0]
  const overdue = allTasks.filter((t) => !t.done && t.dueDate && t.dueDate < today).length

  const recentDone = allTasks
    .filter((t) => t.done)
    .map((t) => ({ ...t, _completedAt: completedAtOf(t) }))
    .sort((a, b) => (a._completedAt < b._completedAt ? 1 : -1))
    .slice(0, 20)

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-slate-800">レポート</h1>

      {/* KPI カード */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">アクティブプロジェクト</p>
          <p className="text-3xl font-bold text-indigo-700">{activeProjects}</p>
          <p className="text-xs text-slate-400/70 line-through decoration-slate-300" title="ルーチン機能は未実装（将来復活予定）">
            うちルーチン {routineProjects}本（未実装）
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">未完了タスク</p>
          <p className="text-3xl font-bold text-slate-800">{pendingTasks}</p>
          <p className="text-xs text-amber-600">小タスク {smallPending}件</p>
        </div>
        <div className={`bg-white rounded-xl border p-4 shadow-sm ${overdue > 0 ? 'border-rose-300' : 'border-slate-200'}`}>
          <p className="text-xs text-slate-500 mb-1">期限超過</p>
          <p className={`text-3xl font-bold ${overdue > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{overdue}</p>
          <p className="text-xs text-slate-400">件</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">今週の完了タスク</p>
          <p className="text-3xl font-bold text-emerald-700">{weekDone}</p>
          <p className="text-xs text-slate-400">件</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">今月の完了タスク</p>
          <p className="text-3xl font-bold text-emerald-700">{monthDone}</p>
          <p className="text-xs text-slate-400">件</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">受信箱の滞留</p>
          <p className={`text-3xl font-bold ${inbox.length > 5 ? 'text-amber-600' : 'text-slate-800'}`}>{inbox.length}</p>
          <p className="text-xs text-slate-400">件 未振り分け</p>
        </div>
      </div>

      {/* 最近完了したタスク */}
      <section>
        <h2 className="text-sm font-bold text-slate-700 mb-3">
          最近完了したタスク
          <span className="ml-2 text-xs font-normal text-slate-400">直近 {recentDone.length} 件</span>
        </h2>
        {recentDone.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-xs text-slate-400">
            まだ完了したタスクがありません
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentDone.map((t) => {
              const d = new Date(t._completedAt)
              const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2"
                >
                  <span className="text-emerald-500 shrink-0">✓</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate line-through decoration-slate-300">{t.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {t.projectName} ・ {dateStr}
                    </p>
                  </div>
                  <span className={`text-[10px] px-1.5 rounded shrink-0 ${taskSizeBadgeClass(t.size)}`}>
                    {taskSizeShortLabel(t.size)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* プロジェクト別タスク消化 */}
      <section>
        <h2 className="text-sm font-bold text-slate-700 mb-3 flex flex-wrap items-baseline gap-2">
          プロジェクト別タスク消化
          <span className="text-xs font-normal text-slate-400">各カードにプロジェクト期限を表示</span>
        </h2>
        <div className="space-y-2">
          {projects.filter((p) => p.status === 'active').map((p) => {
            const total = p.tasks.length
            const done = p.tasks.filter((t) => t.done).length
            const pct = total === 0 ? 0 : Math.round((done / total) * 100)
            return (
              <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-slate-800">{p.name}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {p.dueDate ? (
                        <>
                          期限 <span className="font-medium text-slate-700">{p.dueDate}</span>
                        </>
                      ) : (
                        <span className="text-slate-400">期限未設定</span>
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 shrink-0">{done}/{total}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
