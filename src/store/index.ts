import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project, Task, InboxItem, InboxSuggestion, WeekStatus } from '../types'
import { ensureAppDataShape } from '../lib/ensureDataShape'
import type { KanbanImportItem } from '../lib/importKanbanReport'
import { getRoundTemplate, applyOffset } from '../lib/roundTemplates'
import { weekRange } from '../lib/due'

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
  setInboxSuggestion: (id: string, suggestion: InboxSuggestion) => void
  promoteInboxItem: (
    id: string,
    opts: {
      title: string
      projectId: string | null
      size: Task['size']
      dueDate: string | null
      requestedBy?: string | null
    }
  ) => void

  // Projects
  addProject: (name: string, type: Project['type'], dueDate?: string | null) => void
  updateProject: (id: string, patch: Partial<Omit<Project, 'id' | 'tasks' | 'items' | 'createdAt'>>) => void
  deleteProject: (id: string) => void
  /** ダッシュボードのカードをドラッグで並び替え。渡された id 順に sortOrder を 0..n で振る */
  reorderProjects: (orderedIds: string[]) => void

  // Tasks
  addTask: (
    projectId: string,
    title: string,
    size: Task['size'],
    dueDate: string | null,
    requestedBy?: string | null,
    originalPaste?: string | null
  ) => void
  // projectId === null は未割当タスクへの操作を意味する（D-003）
  toggleTask: (projectId: string | null, taskId: string) => void
  deleteTask: (projectId: string | null, taskId: string) => void
  assignTaskToProject: (taskId: string, projectId: string) => void
  /** 既存タスクを別プロジェクトへ移動（所属替えのみ。他フィールドは保持） */
  moveTaskToProject: (fromProjectId: string, taskId: string, toProjectId: string) => void

  // 週ボード（3階）
  setTaskWeekStatus: (
    projectId: string | null,
    taskId: string,
    weekStatus: WeekStatus | null,
    waitFor?: string
  ) => void
  updateTaskWait: (projectId: string | null, taskId: string, waitFor: string) => void
  /** タスク名の変更。projectId === null は未割当タスク */
  updateTaskTitle: (projectId: string | null, taskId: string, title: string) => void
  closeWeek: () => void

  // ルーチンの「回」をテンプレから生成
  createRound: (
    projectId: string,
    templateId: string,
    baseDate: string,
    roundLabel: string
  ) => { tasks: number; items: number } | null

  // Items
  addItem: (projectId: string, title: string) => void
  toggleItem: (projectId: string, itemId: string) => void
  deleteItem: (projectId: string, itemId: string) => void

  // Data management（設定画面から呼ばれる）
  exportData: () => ExportPayload
  importData: (payload: unknown) => { ok: true } | { ok: false; error: string }
  /** 旧カンバン週報からの取り込み（既存データにマージ。プロジェクトは名前一致、なければ常設で作成） */
  importKanbanTasks: (items: KanbanImportItem[]) => { createdProjects: number; importedTasks: number }
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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 初期状態は空。デモデータは撤廃（v0.7.14）:
      // 「ローカルが空/新規のときデモが同期でクラウドを上書きする」事故の原因だったため。
      projects: [],
      inbox: [],
      unassignedTasks: [],

      addToInbox: (rawText) =>
        set((s) => ({ inbox: [{ id: uid(), rawText, createdAt: new Date().toISOString() }, ...s.inbox] })),

      removeFromInbox: (id) => set((s) => ({ inbox: s.inbox.filter((x) => x.id !== id) })),

      setInboxSuggestion: (id, suggestion) =>
        set((s) => ({
          inbox: s.inbox.map((x) => (x.id === id ? { ...x, suggestion } : x)),
        })),

      promoteInboxItem: (id, { title, projectId, size, dueDate, requestedBy }) => {
        const { inbox, projects, unassignedTasks } = get()
        const item = inbox.find((x) => x.id === id)
        if (!item) return
        const newTask: Task = {
          id: uid(),
          title,
          size,
          dueDate,
          projectId,
          done: false,
          createdAt: new Date().toISOString(),
          requestedBy: requestedBy || null,
          originalPaste: item.rawText,
        }
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

      addProject: (name, type, dueDate = null) =>
        set((s) => ({
          projects: [
            ...s.projects,
            {
              id: uid(),
              name,
              type,
              status: 'active',
              dueDate: dueDate ?? null,
              completedAt: null,
              color: 'indigo',
              resumeNote: '',
              tasks: [],
              items: [],
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      updateProject: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== id) return p
            const next = { ...p, ...patch } as Project
            if (patch.status === 'completed' && p.status !== 'completed') {
              next.completedAt = new Date().toISOString()
            } else if (patch.status === 'active' && p.status === 'completed') {
              next.completedAt = null
            }
            return next
          }),
        })),

      deleteProject: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),

      reorderProjects: (orderedIds) =>
        set((s) => {
          const rank = new Map(orderedIds.map((id, i) => [id, i]))
          return {
            projects: s.projects.map((p) =>
              rank.has(p.id) ? { ...p, sortOrder: rank.get(p.id)! } : p
            ),
          }
        }),

      addTask: (projectId, title, size, dueDate, requestedBy, originalPaste = null) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  tasks: [
                    ...p.tasks,
                    {
                      id: uid(),
                      title,
                      size,
                      dueDate,
                      projectId,
                      done: false,
                      createdAt: new Date().toISOString(),
                      requestedBy: requestedBy || null,
                      originalPaste: originalPaste ?? null,
                    },
                  ],
                }
              : p
          ),
        })),

      toggleTask: (projectId, taskId) => {
        const weekEnd = weekRange().end
        const stamp = (t: Task): Task => {
          const nextDone = !t.done
          // ボードに出ているタスクは done と weekStatus を同期。
          // 自動着地（weekStatus=null だが締切が今週）のタスクを完了にしたら
          // 完了列に出すため 'done' に昇格する（トップの帯/詳細から完了にしても揃う）
          const inThisWeek = t.dueDate != null && t.dueDate <= weekEnd
          let weekStatus: Task['weekStatus']
          if (t.weekStatus != null) weekStatus = nextDone ? 'done' : 'todo'
          else if (nextDone && inThisWeek) weekStatus = 'done'
          else weekStatus = t.weekStatus
          return {
            ...t,
            done: nextDone,
            completedAt: nextDone ? new Date().toISOString() : null,
            weekStatus,
          }
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

      setTaskWeekStatus: (projectId, taskId, weekStatus, waitFor) => {
        const today = new Date().toISOString().split('T')[0]
        const move = (t: Task): Task => {
          const next: Task = { ...t, weekStatus }
          // wait の出入りで待ち情報を管理（waitSince は入った日を自動記録）
          if (weekStatus === 'wait') {
            next.waitFor = waitFor ?? t.waitFor ?? ''
            next.waitSince = t.weekStatus === 'wait' ? t.waitSince : today
          } else {
            next.waitFor = null
            next.waitSince = null
          }
          // done の出入りで完了状態を同期（旧カンバンと同じ挙動）
          if (weekStatus === 'done' && !t.done) {
            next.done = true
            next.completedAt = new Date().toISOString()
          } else if (weekStatus !== 'done' && weekStatus !== null && t.done) {
            next.done = false
            next.completedAt = null
          }
          return next
        }
        set((s) =>
          projectId === null
            ? { unassignedTasks: s.unassignedTasks.map((t) => (t.id === taskId ? move(t) : t)) }
            : {
                projects: s.projects.map((p) =>
                  p.id === projectId
                    ? { ...p, tasks: p.tasks.map((t) => (t.id === taskId ? move(t) : t)) }
                    : p
                ),
              }
        )
      },

      updateTaskWait: (projectId, taskId, waitFor) => {
        const patch = (t: Task): Task => (t.id === taskId ? { ...t, waitFor } : t)
        set((s) =>
          projectId === null
            ? { unassignedTasks: s.unassignedTasks.map(patch) }
            : { projects: s.projects.map((p) => ({ ...p, tasks: p.tasks.map(patch) })) }
        )
      },

      updateTaskTitle: (projectId, taskId, title) => {
        const trimmed = title.trim()
        if (!trimmed) return
        const patch = (t: Task): Task => (t.id === taskId ? { ...t, title: trimmed } : t)
        set((s) =>
          projectId === null
            ? { unassignedTasks: s.unassignedTasks.map(patch) }
            : { projects: s.projects.map((p) => ({ ...p, tasks: p.tasks.map(patch) })) }
        )
      },

      // 週の締め：完了列をボードから下ろすだけ。完了履歴（done/completedAt）は残す
      closeWeek: () => {
        const clear = (t: Task): Task =>
          t.weekStatus === 'done' ? { ...t, weekStatus: null } : t
        set((s) => ({
          projects: s.projects.map((p) => ({ ...p, tasks: p.tasks.map(clear) })),
          unassignedTasks: s.unassignedTasks.map(clear),
        }))
      },

      createRound: (projectId, templateId, baseDate, roundLabel) => {
        const tpl = getRoundTemplate(templateId)
        if (!tpl) return null
        const label = roundLabel.trim() || null
        const newTasks: Task[] = tpl.steps.map((step) => ({
          id: uid(),
          title: label ? `${step.title}（${label}）` : step.title,
          size: step.size,
          dueDate: applyOffset(baseDate, step.offsetDays),
          projectId,
          done: false,
          createdAt: new Date().toISOString(),
          requestedBy: null,
          originalPaste: null,
          weekStatus: null,
          waitFor: null,
          waitSince: null,
          roundLabel: label,
        }))
        const newItems = tpl.items.map((title) => ({
          id: uid(),
          title: label ? `${title}（${label}）` : title,
          done: false,
        }))
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? { ...p, tasks: [...p.tasks, ...newTasks], items: [...p.items, ...newItems] }
              : p
          ),
        }))
        return { tasks: newTasks.length, items: newItems.length }
      },

      moveTaskToProject: (fromProjectId, taskId, toProjectId) =>
        set((s) => {
          if (fromProjectId === toProjectId) return s
          const from = s.projects.find((p) => p.id === fromProjectId)
          const task = from?.tasks.find((t) => t.id === taskId)
          if (!task) return s
          const moved: Task = { ...task, projectId: toProjectId }
          return {
            projects: s.projects.map((p) => {
              if (p.id === fromProjectId) return { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) }
              if (p.id === toProjectId) return { ...p, tasks: [...p.tasks, moved] }
              return p
            }),
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

      importKanbanTasks: (items) => {
        const today = new Date().toISOString().split('T')[0]
        const { projects } = get()
        let nextProjects = [...projects]
        let createdProjects = 0
        let importedTasks = 0

        for (const item of items) {
          let project = nextProjects.find((p) => p.name.trim() === item.projectName)
          if (!project) {
            project = {
              id: uid(),
              name: item.projectName,
              type: 'ongoing',
              status: 'active',
              dueDate: null,
              completedAt: null,
              color: 'indigo',
              resumeNote: '',
              tasks: [],
              items: [],
              createdAt: new Date().toISOString(),
            }
            nextProjects = [...nextProjects, project]
            createdProjects++
          }
          const task: Task = {
            id: uid(),
            title: item.title,
            size: 'small',
            dueDate: item.dueDate,
            projectId: project.id,
            done: item.done,
            createdAt: item.createdAt,
            completedAt: item.completedAt,
            requestedBy: null,
            originalPaste: null,
            weekStatus: item.weekStatus,
            waitFor: item.weekStatus === 'wait' ? item.waitFor ?? '' : null,
            waitSince: item.weekStatus === 'wait' ? today : null,
            roundLabel: null,
          }
          nextProjects = nextProjects.map((p) =>
            p.id === project!.id ? { ...p, tasks: [...p.tasks, task] } : p
          )
          importedTasks++
        }

        set({ projects: nextProjects })
        return { createdProjects, importedTasks }
      },

      importData: (payload) => {
        if (!isExportPayload(payload)) {
          return { ok: false, error: '形式が正しくありません（projects / inbox / unassignedTasks の配列が必要）' }
        }
        set(ensureAppDataShape(payload))
        return { ok: true }
      },

      clearAll: () => {
        set({ projects: [], inbox: [], unassignedTasks: [] })
      },
    }),
    {
      name: 'task-hub-storage',
      // v2: Task.requestedBy / v3: TaskSize 4 段階・Task.originalPaste・Project.dueDate・Project.completedAt
      // v4: 週ボード（Task.weekStatus / waitFor / waitSince / roundLabel）
      // v5: Project.sortOrder（ダッシュボードの手動並び）
      version: 5,
      migrate: (persisted, fromVersion) => {
        if (!persisted) return persisted as AppState
        let state = persisted as Partial<AppState>

        if (fromVersion < 2) {
          const fillTaskV2 = (t: Task): Task =>
            'requestedBy' in t && t.requestedBy !== undefined ? t : { ...t, requestedBy: null }
          state = {
            ...state,
            projects: (state.projects ?? []).map((p) => ({
              ...p,
              tasks: (p.tasks ?? []).map(fillTaskV2),
            })),
            unassignedTasks: (state.unassignedTasks ?? []).map(fillTaskV2),
          }
        }

        if (fromVersion < 3) {
          const normalizeSize = (s: unknown): Task['size'] => {
            if (s === 'medium' || s === 'large' || s === 'xlarge' || s === 'small') return s
            return 'small'
          }

          const fillTaskV3 = (t: Task): Task => ({
            ...t,
            size: normalizeSize((t as { size?: unknown }).size),
            originalPaste:
              'originalPaste' in t && t.originalPaste !== undefined && t.originalPaste !== null
                ? t.originalPaste
                : null,
          })

          const fillProjectV3 = (p: Project): Project => {
            const legacy = p as Project & { dueDate?: unknown; completedAt?: unknown }
            return {
              ...p,
              dueDate: typeof legacy.dueDate === 'string' ? legacy.dueDate : null,
              completedAt: typeof legacy.completedAt === 'string' ? legacy.completedAt : null,
              tasks: (p.tasks ?? []).map(fillTaskV3),
            }
          }

          state = {
            ...state,
            projects: (state.projects ?? []).map(fillProjectV3),
            unassignedTasks: (state.unassignedTasks ?? []).map(fillTaskV3),
          }
        }

        if (fromVersion < 4) {
          const fillTaskV4 = (t: Task): Task => ({
            ...t,
            weekStatus: t.weekStatus ?? null,
            waitFor: t.waitFor ?? null,
            waitSince: t.waitSince ?? null,
            roundLabel: t.roundLabel ?? null,
          })
          state = {
            ...state,
            projects: (state.projects ?? []).map((p) => ({
              ...p,
              tasks: (p.tasks ?? []).map(fillTaskV4),
            })),
            unassignedTasks: (state.unassignedTasks ?? []).map(fillTaskV4),
          }
        }

        if (fromVersion < 5) {
          state = {
            ...state,
            projects: (state.projects ?? []).map((p) => ({
              ...p,
              sortOrder: (p as Project).sortOrder ?? null,
            })),
          }
        }

        return state as AppState
      },
    }
  )
)
