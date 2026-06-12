// 日付ユーティリティ（既存規約に合わせ toISOString ベースの YYYY-MM-DD で統一）

export function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export function tomorrowStr() {
  return new Date(Date.now() + 86400000).toISOString().split('T')[0]
}

export interface DueBadgeInfo {
  label: string
  cls: string
}

/** 期限切れ / 今日 / 明日 の3段階バッジ。それ以外は null */
export function dueBadge(dueDate: string | null | undefined): DueBadgeInfo | null {
  if (!dueDate) return null
  const t = todayStr()
  if (dueDate < t) return { label: '期限切れ', cls: 'bg-rose-500 text-white' }
  if (dueDate === t) return { label: '今日', cls: 'bg-amber-200 text-amber-800' }
  if (dueDate <= tomorrowStr()) return { label: '明日', cls: 'bg-slate-200 text-slate-700' }
  return null
}

/** 月曜はじまりの週の範囲（YYYY-MM-DD）。offsetWeeks=1 で来週 */
export function weekRange(offsetWeeks = 0): { start: string; end: string } {
  const today = new Date(todayStr() + 'T00:00:00Z')
  const dow = today.getUTCDay() // 0=日
  const diffToMon = (dow === 0 ? -6 : 1 - dow) + offsetWeeks * 7
  const mon = new Date(today.getTime() + diffToMon * 86400000)
  const sun = new Date(mon.getTime() + 6 * 86400000)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { start: fmt(mon), end: fmt(sun) }
}

/** 待ち開始日からの経過日数 */
export function waitDays(waitSince: string | null | undefined): number {
  if (!waitSince) return 0
  const since = new Date(waitSince + 'T00:00:00Z').getTime()
  const now = new Date(todayStr() + 'T00:00:00Z').getTime()
  return Math.max(0, Math.round((now - since) / 86400000))
}
