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
