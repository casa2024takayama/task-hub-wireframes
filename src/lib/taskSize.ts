import type { TaskSize } from '../types'

/** 目安時間ラベル（通知は small のみ） */
export const TASK_SIZE_OPTIONS: { value: TaskSize; label: string }[] = [
  { value: 'small', label: '小（〜30分）' },
  { value: 'medium', label: '中（〜2時間）' },
  { value: 'large', label: '大（半日〜1日）' },
  { value: 'xlarge', label: '特大（複数日）' },
]

export function taskSizeShortLabel(size: TaskSize): string {
  const m: Record<TaskSize, string> = {
    small: '小',
    medium: '中',
    large: '大',
    xlarge: '特大',
  }
  return m[size]
}

export function taskSizeBadgeClass(size: TaskSize): string {
  if (size === 'small') return 'bg-amber-100 text-amber-700'
  if (size === 'medium') return 'bg-indigo-100 text-indigo-800'
  if (size === 'large') return 'bg-slate-100 text-slate-600'
  return 'bg-rose-100 text-rose-800'
}
