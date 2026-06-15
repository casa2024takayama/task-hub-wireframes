import type { InboxItem, Project, Task, TaskSize } from '../types'

const SIZES = new Set<TaskSize>(['small', 'medium', 'large', 'xlarge'])

function normalizeTask(t: Task): Task {
  const sz = typeof t.size === 'string' && SIZES.has(t.size as TaskSize) ? (t.size as TaskSize) : 'small'
  return {
    ...t,
    size: sz,
    originalPaste: t.originalPaste ?? null,
    requestedBy: t.requestedBy ?? null,
    weekStatus: t.weekStatus ?? null,
    waitFor: t.waitFor ?? null,
    waitSince: t.waitSince ?? null,
    roundLabel: t.roundLabel ?? null,
  }
}

function normalizeProject(p: Project): Project {
  return {
    ...p,
    dueDate: p.dueDate ?? null,
    completedAt: p.completedAt ?? null,
    sortOrder: p.sortOrder ?? null,
    tasks: (p.tasks ?? []).map(normalizeTask),
  }
}

/** Firestore 同期・JSON インポートなど、ストア外から入るペイロードの形を揃える */
export function ensureAppDataShape(data: {
  projects: Project[]
  inbox: InboxItem[]
  unassignedTasks: Task[]
}) {
  return {
    projects: data.projects.map(normalizeProject),
    inbox: data.inbox,
    unassignedTasks: data.unassignedTasks.map(normalizeTask),
  }
}
