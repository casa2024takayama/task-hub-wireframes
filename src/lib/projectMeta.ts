import type { ProjectType } from '../types'

// プロジェクト種別のラベル・バッジ色を一元管理（Dashboard / ProjectDetail で共用）

export const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  'one-time': '単発',
  'routine-weekly': '週次ルーチン',
  'routine-monthly': '月次ルーチン',
  'routine-quarterly': '四半期ルーチン',
  ongoing: '常設',
}

export const PROJECT_TYPE_BADGE: Record<ProjectType, string> = {
  'one-time': 'bg-slate-100 text-slate-600',
  'routine-weekly': 'bg-indigo-100 text-indigo-700',
  'routine-monthly': 'bg-purple-100 text-purple-700',
  'routine-quarterly': 'bg-purple-100 text-purple-700',
  ongoing: 'bg-emerald-100 text-emerald-700',
}

// セレクタ用の並び（単発 → ルーチン各種 → 常設）
export const PROJECT_TYPE_OPTIONS: { value: ProjectType; label: string }[] = [
  'one-time',
  'routine-weekly',
  'routine-monthly',
  'routine-quarterly',
  'ongoing',
].map((value) => ({ value: value as ProjectType, label: PROJECT_TYPE_LABEL[value as ProjectType] }))
