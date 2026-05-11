export type TaskSize = 'small' | 'large'
export type ProjectType = 'one-time' | 'routine-weekly' | 'routine-monthly'
export type ProjectStatus = 'active' | 'completed' | 'paused'

export interface Task {
  id: string
  title: string
  size: TaskSize
  dueDate: string | null
  projectId: string | null
  done: boolean
  createdAt: string
  completedAt?: string | null
}

export interface InboxItem {
  id: string
  rawText: string
  createdAt: string
  /** AI による自動振り分けの提案（ある場合）。フォームの初期値として使う。 */
  suggestion?: InboxSuggestion
}

export type InboxSuggestionStatus = 'pending' | 'ready' | 'failed' | 'skipped'

export interface InboxSuggestion {
  status: InboxSuggestionStatus
  /** 取得に失敗した場合のメッセージ */
  error?: string
  /** モデル提案：簡潔なタスクタイトル */
  title?: string
  /** モデル提案：紐づくプロジェクト ID（既存プロジェクトの中から）。なければ null */
  projectId?: string | null
  /** モデル提案：サイズ */
  size?: TaskSize
  /** モデル提案：締切日 ISO（YYYY-MM-DD）または null */
  dueDate?: string | null
  /** モデル提案：判断理由（短いメモ、UI でツールチップ表示など） */
  reason?: string
  /** 解析時の AI バージョン / モデル名 */
  modelName?: string
  /** 解析した時刻 */
  analyzedAt?: string
}

export interface Item {
  id: string
  title: string
  done: boolean
}

export interface Project {
  id: string
  name: string
  type: ProjectType
  status: ProjectStatus
  resumeNote: string
  color: string
  tasks: Task[]
  items: Item[]
  createdAt: string
}
