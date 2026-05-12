export type TaskSize = 'small' | 'medium' | 'large' | 'xlarge'
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
  /** 依頼者（自由入力）。「△△さん」「経営会議」「自分」など何でも可。自分発タスク（＝アイデア）は '自分' を入れる。 */
  requestedBy?: string | null
  /** 受信箱から昇格したときのコピペ原文（参照・メモ用） */
  originalPaste?: string | null
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
  /** モデル提案：依頼者（敬称付き「〇〇さん」推奨）。判別不能 or 本人発意なら "自分" */
  requestedBy?: string | null
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
  /** プロジェクト締切（YYYY-MM-DD または null） */
  dueDate: string | null
  /** プロジェクトを完了にした日時（ISO）。復帰で active に戻すと null */
  completedAt?: string | null
  resumeNote: string
  color: string
  tasks: Task[]
  items: Item[]
  createdAt: string
}
