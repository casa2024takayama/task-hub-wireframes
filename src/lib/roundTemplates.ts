import type { TaskSize } from '../types'

// ルーチンの「回」を 1 タップで生成するためのテンプレート（v0.7.5）。
// 基準日（配信日／公開日／実施日）を 1 つ選ぶと、各工程の締切が offsetDays で自動計算される。
// カデンスの自動スケジュールはしない（回は手動作成）— 設計レビュー（mvp-spec 3階建て統合構想）の決定どおり。

export interface RoundStep {
  title: string
  offsetDays: number // 基準日からの相対日数（マイナス=前、プラス=後）
  size: TaskSize
}

export interface RoundTemplate {
  id: string
  label: string // UI 表示名
  baseDateLabel: string // 基準日が何の日か（例「配信日」）
  steps: RoundStep[]
  items: string[] // 回ごとに揃えるアイテムの雛形
}

export const ROUND_TEMPLATES: RoundTemplate[] = [
  {
    id: 'mov-radio',
    label: 'MOV Radio（隔週）',
    baseDateLabel: '配信日',
    steps: [
      { title: '質問リスト準備', offsetDays: -7, size: 'small' },
      { title: '収録', offsetDays: -5, size: 'medium' },
      { title: '動画編集', offsetDays: -2, size: 'large' },
      { title: 'スラック事前告知', offsetDays: -1, size: 'small' },
      { title: 'スラック当日告知＆公開', offsetDays: 0, size: 'small' },
    ],
    items: [],
  },
  {
    id: 'mov-tube',
    label: 'MOV Tube（月1）',
    baseDateLabel: '公開日',
    steps: [
      { title: '企画・構成台本', offsetDays: -14, size: 'medium' },
      { title: '動画撮影', offsetDays: -10, size: 'large' },
      { title: '動画編集', offsetDays: -5, size: 'large' },
      { title: 'サムネ・概要欄', offsetDays: -2, size: 'small' },
      { title: '公開', offsetDays: 0, size: 'small' },
    ],
    items: ['撮影小物', '出演者への依頼・調整'],
  },
  {
    id: 'mov-running',
    label: 'MOV Running（月1）',
    baseDateLabel: '実施日',
    steps: [
      { title: '参加募集開始', offsetDays: -14, size: 'small' },
      { title: 'チケット購入', offsetDays: -7, size: 'small' },
      { title: 'イベント当日', offsetDays: 0, size: 'medium' },
      { title: '参加者集計・共有', offsetDays: 1, size: 'small' },
    ],
    items: [],
  },
]

export function getRoundTemplate(id: string): RoundTemplate | undefined {
  return ROUND_TEMPLATES.find((t) => t.id === id)
}

/** baseDate(YYYY-MM-DD) に offsetDays を足した YYYY-MM-DD を返す */
export function applyOffset(baseDate: string, offsetDays: number): string {
  const d = new Date(baseDate + 'T00:00:00Z')
  return new Date(d.getTime() + offsetDays * 86400000).toISOString().split('T')[0]
}
