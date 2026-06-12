import type { Project, Task } from '../types'
import { weekRange, waitDays } from './due'

// 週報生成。フォーマットは旧・朝のカンバン（morning-kanban.html）の buildReport を踏襲する。
// 「今週動いたこと」は completedAt が今週のタスク全部 = ボードに乗らず即応した依頼も自然に入る。

interface NamedTask extends Task {
  projectName: string
}

const DAY_JP = ['日', '月', '火', '水', '木', '金', '土'] as const

function gatherTasks(projects: Project[], unassignedTasks: Task[]): NamedTask[] {
  return [
    ...projects.flatMap((p) => p.tasks.map((t) => ({ ...t, projectName: p.name }))),
    ...unassignedTasks.map((t) => ({ ...t, projectName: '未割当' })),
  ]
}

function line(t: NamedTask, suffix = '') {
  return `- [${t.projectName}] ${t.title}${suffix}`
}

function fmtMD(iso: string) {
  const [, m, d] = iso.split('-')
  return `${Number(m)}/${Number(d)}`
}

export function buildWeeklyReport(projects: Project[], unassignedTasks: Task[]): string {
  const all = gatherTasks(projects, unassignedTasks)
  const { start, end } = weekRange()
  const next = weekRange(1)

  const done = all
    .filter((t) => {
      if (!t.done || !t.completedAt) return false
      const d = t.completedAt.split('T')[0]
      return d >= start && d <= end
    })
    .sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''))
  const doing = all.filter((t) => !t.done && t.weekStatus === 'doing')
  const wait = all.filter((t) => !t.done && t.weekStatus === 'wait')
  // 「今週やる」列の残り = 明示的に todo ＋ 締切今週で自動着地したもの（ボードと同じ判定）
  const todo = all.filter(
    (t) =>
      !t.done &&
      (t.weekStatus === 'todo' ||
        (t.weekStatus == null && t.dueDate != null && t.dueDate <= end))
  )
  // 来週締切のバックログ（ボード未着地）も「来週やること」へ
  const upcoming = all.filter(
    (t) =>
      !t.done &&
      t.weekStatus == null &&
      t.dueDate != null &&
      t.dueDate >= next.start &&
      t.dueDate <= next.end
  )

  // 曜日分布（旧カンバンと同じ。土日は実績がある時だけ表示）
  const counts = [0, 0, 0, 0, 0, 0, 0]
  for (const t of done) {
    if (t.completedAt) counts[new Date(t.completedAt).getDay()]++
  }
  let dist = `月${counts[1]}／火${counts[2]}／水${counts[3]}／木${counts[4]}／金${counts[5]}`
  if (counts[6] > 0) dist += `／土${counts[6]}`
  if (counts[0] > 0) dist += `／日${counts[0]}`
  const dayOf = (t: NamedTask) =>
    t.completedAt ? `（${DAY_JP[new Date(t.completedAt).getDay()]}）` : ''

  const today = new Date()
  let s = `# 週報　${today.getMonth() + 1}/${today.getDate()}週\n\n`

  s += `## 今週動いたこと（${dist}、合計${done.length}件）\n`
  s += (done.length ? done.map((t) => line(t, dayOf(t))).join('\n') : '- （なし）') + '\n\n'

  s += `## 進行中\n`
  s += (doing.length ? doing.map((t) => line(t)).join('\n') : '- （なし）') + '\n\n'

  s += `## 詰まり・要相談\n`
  s +=
    (wait.length
      ? wait
          .map((t) => {
            const days = waitDays(t.waitSince)
            const who = t.waitFor?.trim() ? t.waitFor.trim() : '待ち先未記入'
            return line(t, `（${who}・${days}日待ち）`)
          })
          .join('\n')
      : '- （なし）') + '\n\n'

  s += `## 来週やること／来月の山\n`
  const nextLines = [
    ...todo.map((t) => line(t, t.dueDate ? `（${fmtMD(t.dueDate)}）` : '')),
    ...upcoming.map((t) => line(t, t.dueDate ? `（${fmtMD(t.dueDate)}）` : '')),
  ]
  s += (nextLines.length ? nextLines.join('\n') : '- ') + '\n'

  return s
}
