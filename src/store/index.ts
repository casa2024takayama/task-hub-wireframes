import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project, Task, InboxItem } from '../types'

function uid() {
  return crypto.randomUUID()
}

interface AppState {
  projects: Project[]
  inbox: InboxItem[]
  unassignedTasks: Task[]

  // Inbox
  addToInbox: (rawText: string) => void
  removeFromInbox: (id: string) => void
  promoteInboxItem: (id: string, opts: { title: string; projectId: string | null; size: 'small' | 'large'; dueDate: string | null }) => void

  // Projects
  addProject: (name: string, type: Project['type']) => void
  updateProject: (id: string, patch: Partial<Omit<Project, 'id' | 'tasks' | 'items' | 'createdAt'>>) => void
  deleteProject: (id: string) => void

  // Tasks
  addTask: (projectId: string, title: string, size: Task['size'], dueDate: string | null) => void
  // projectId === null は未割当タスクへの操作を意味する（D-003）
  toggleTask: (projectId: string | null, taskId: string) => void
  deleteTask: (projectId: string | null, taskId: string) => void
  assignTaskToProject: (taskId: string, projectId: string) => void

  // Items
  addItem: (projectId: string, title: string) => void
  toggleItem: (projectId: string, itemId: string) => void
  deleteItem: (projectId: string, itemId: string) => void

  // Data management（設定画面から呼ばれる）
  exportData: () => ExportPayload
  importData: (payload: unknown) => { ok: true } | { ok: false; error: string }
  clearAll: () => void
}

export interface ExportPayload {
  version: string
  exportedAt: string
  projects: Project[]
  inbox: InboxItem[]
  unassignedTasks: Task[]
}

const APP_VERSION =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'

function isExportPayload(v: unknown): v is ExportPayload {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return Array.isArray(o.projects) && Array.isArray(o.inbox) && Array.isArray(o.unassignedTasks)
}

const DEMO_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: '外部イベント登壇',
    type: 'one-time',
    status: 'active',
    color: 'indigo',
    resumeNote: '登壇資料のP12まで完成。次は事例スライドを追加する。',
    tasks: [
      { id: 't1', title: '登壇者プロフィールの確認返信', size: 'small', dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], projectId: 'p1', done: false, createdAt: new Date().toISOString() },
      { id: 't2', title: 'スライド最終確認', size: 'large', dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0], projectId: 'p1', done: false, createdAt: new Date().toISOString() },
    ],
    items: [{ id: 'i1', title: 'HDMIアダプタ', done: false }],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p2',
    name: '社内 Web リニューアル',
    type: 'one-time',
    status: 'active',
    color: 'emerald',
    resumeNote: 'デザインレビュー待ち。返信来たらHTML化フェーズへ。',
    tasks: [
      { id: 't3', title: 'デザインFBをSlackに返信', size: 'small', dueDate: new Date().toISOString().split('T')[0], projectId: 'p2', done: false, createdAt: new Date().toISOString() },
    ],
    items: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p3',
    name: 'X 週次投稿',
    type: 'routine-weekly',
    status: 'active',
    color: 'amber',
    resumeNote: '先週の反響が高かったテーマ：AI ツール活用。今週も継続。',
    tasks: [
      { id: 't4', title: '今週の投稿ネタ3本をメモ', size: 'small', dueDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0], projectId: 'p3', done: false, createdAt: new Date().toISOString() },
    ],
    items: [],
    createdAt: new Date().toISOString(),
  },
]

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      projects: DEMO_PROJECTS,
      inbox: [
        { id: 'ib1', rawText: '高山さんから：来週の勉強会でLT枠空いてるので5分で話してほしい。テーマ自由。返事は水曜日まで。', createdAt: new Date(Date.now() - 3600000).toISOString() },
        { id: 'ib2', rawText: '経費精算の領収書を経理に提出してください（今月末締め）', createdAt: new Date(Date.now() - 7200000).toISOString() },
      ],
      unassignedTasks: [],

      addToInbox: (rawText) =>
        set((s) => ({ inbox: [{ id: uid(), rawText, createdAt: new Date().toISOString() }, ...s.inbox] })),

      removeFromInbox: (id) => set((s) => ({ inbox: s.inbox.filter((x) => x.id !== id) })),

      promoteInboxItem: (id, { title, projectId, size, dueDate }) => {
        const { inbox, projects, unassignedTasks } = get()
        const item = inbox.find((x) => x.id === id)
        if (!item) return
        const newTask: Task = { id: uid(), title, size, dueDate, projectId, done: false, createdAt: new Date().toISOString() }
        if (projectId === null) {
          set({
            inbox: inbox.filter((x) => x.id !== id),
            unassignedTasks: [...unassignedTasks, newTask],
          })
          return
        }
        set({
          inbox: inbox.filter((x) => x.id !== id),
          projects: projects.map((p) =>
            p.id === projectId ? { ...p, tasks: [...p.tasks, newTask] } : p
          ),
        })
      },

      addProject: (name, type) =>
        set((s) => ({
          projects: [
            ...s.projects,
            { id: uid(), name, type, status: 'active', color: 'indigo', resumeNote: '', tasks: [], items: [], createdAt: new Date().toISOString() },
          ],
        })),

      updateProject: (id, patch) =>
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

      deleteProject: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),

      addTask: (projectId, title, size, dueDate) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? { ...p, tasks: [...p.tasks, { id: uid(), title, size, dueDate, projectId, done: false, createdAt: new Date().toISOString() }] }
              : p
          ),
        })),

      toggleTask: (projectId, taskId) => {
        const stamp = (t: Task): Task => {
          const nextDone = !t.done
          return { ...t, done: nextDone, completedAt: nextDone ? new Date().toISOString() : null }
        }
        set((s) =>
          projectId === null
            ? {
                unassignedTasks: s.unassignedTasks.map((t) => (t.id === taskId ? stamp(t) : t)),
              }
            : {
                projects: s.projects.map((p) =>
                  p.id === projectId
                    ? { ...p, tasks: p.tasks.map((t) => (t.id === taskId ? stamp(t) : t)) }
                    : p
                ),
              }
        )
      },

      deleteTask: (projectId, taskId) =>
        set((s) =>
          projectId === null
            ? { unassignedTasks: s.unassignedTasks.filter((t) => t.id !== taskId) }
            : {
                projects: s.projects.map((p) =>
                  p.id === projectId ? { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) } : p
                ),
              }
        ),

      assignTaskToProject: (taskId, projectId) =>
        set((s) => {
          const task = s.unassignedTasks.find((t) => t.id === taskId)
          if (!task) return s
          const moved: Task = { ...task, projectId }
          return {
            unassignedTasks: s.unassignedTasks.filter((t) => t.id !== taskId),
            projects: s.projects.map((p) =>
              p.id === projectId ? { ...p, tasks: [...p.tasks, moved] } : p
            ),
          }
        }),

      addItem: (projectId, title) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId ? { ...p, items: [...p.items, { id: uid(), title, done: false }] } : p
          ),
        })),

      toggleItem: (projectId, itemId) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId ? { ...p, items: p.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)) } : p
          ),
        })),

      deleteItem: (projectId, itemId) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId ? { ...p, items: p.items.filter((i) => i.id !== itemId) } : p
          ),
        })),

      exportData: () => {
        const { projects, inbox, unassignedTasks } = get()
        return {
          version: APP_VERSION,
          exportedAt: new Date().toISOString(),
          projects,
          inbox,
          unassignedTasks,
        }
      },

      importData: (payload) => {
        if (!isExportPayload(payload)) {
          return { ok: false, error: '形式が正しくありません（projects / inbox / unassignedTasks の配列が必要）' }
        }
        set({
          projects: payload.projects,
          inbox: payload.inbox,
          unassignedTasks: payload.unassignedTasks,
        })
        return { ok: true }
      },

      clearAll: () => {
        set({ projects: [], inbox: [], unassignedTasks: [] })
      },
    }),
    { name: 'task-hub-storage' }
  )
)
