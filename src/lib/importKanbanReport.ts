import type { WeekStatus } from '../types'
import { todayStr, weekRange } from './due'

// 旧・朝のカンバンの「週報を書き出す」が出力するマークダウンを解析して
// タスクハブへの取り込みデータに変換する（移行用・一回きりの想定）。
//
// 対応フォーマット:
//   ## 今週動いたこと（…）   → done   行末（月、4日）/（木、当日）から完了日・作成日を復元
//   ## 進行中                → doing
//   ## 詰まり・要相談        → wait   行末（…）を待ち先として取り込む
//   ## 来週やること／来月の山 → todo   行末（6/16）を締切として取り込む

export interface KanbanImportItem {
  projectName: string
  title: string
  weekStatus: WeekStatus
  done: boolean
  completedAt: string | null
  createdAt: string
  dueDate: string | null
  waitFor: string | null
}

const WEEKDAY_OFFSET: Record<string, number> = {
  月: 0, 火: 1, 水: 2, 木: 3, 金: 4, 土: 5, 日: 6,
}

function isoAt(dateIso: string) {
  // JST で同日になる時刻を選ぶ（曜日集計が new Date().getDay() ローカル基準のため）
  return `${dateIso}T03:00:00.000Z`
}

function addDays(iso: string, days: number) {
  const d = new Date(iso + 'T00:00:00Z')
  return new Date(d.getTime() + days * 86400000).toISOString().split('T')[0]
}

export function parseKanbanReport(md: string): KanbanImportItem[] {
  const items: KanbanImportItem[] = []
  const { start } = weekRange() // 今週月曜
  const today = todayStr()
  const year = new Date().getFullYear()

  let section: WeekStatus | null = null
  for (const raw of md.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('##')) {
      if (line.includes('動いたこと')) section = 'done'
      else if (line.includes('進行中')) section = 'doing'
      else if (line.includes('詰まり')) section = 'wait'
      else if (line.includes('来週')) section = 'todo'
      else section = null
      continue
    }
    if (!section) continue
    const m = line.match(/^-\s*\[([^\]]+)\]\s*(.+)$/)
    if (!m) continue
    const projectName = m[1].trim()
    let title = m[2].trim()

    let completedAt: string | null = null
    let createdAt = isoAt(today)
    let dueDate: string | null = null
    let waitFor: string | null = null

    if (section === 'done') {
      // （月、4日）（木、当日）（金）のバリエーションに対応
      const meta = title.match(/（([月火水木金土日])(?:、(?:当日|(\d+)日))?）\s*$/)
      if (meta) {
        title = title.slice(0, meta.index).trim()
        const dateIso = addDays(start, WEEKDAY_OFFSET[meta[1]] ?? 0)
        completedAt = isoAt(dateIso)
        const dur = meta[2] ? parseInt(meta[2], 10) : 0
        createdAt = isoAt(addDays(dateIso, -dur))
      } else {
        completedAt = isoAt(today)
      }
    } else if (section === 'todo') {
      const meta = title.match(/（(\d{1,2})\/(\d{1,2})）\s*$/)
      if (meta) {
        title = title.slice(0, meta.index).trim()
        dueDate = `${year}-${String(meta[1]).padStart(2, '0')}-${String(meta[2]).padStart(2, '0')}`
      }
    } else if (section === 'wait') {
      const meta = title.match(/（([^（）]+)）\s*$/)
      if (meta) {
        title = title.slice(0, meta.index).trim()
        waitFor = meta[1].trim()
      } else {
        waitFor = ''
      }
    }

    if (!title) continue
    items.push({
      projectName,
      title,
      weekStatus: section,
      done: section === 'done',
      completedAt,
      createdAt,
      dueDate,
      waitFor,
    })
  }
  return items
}
