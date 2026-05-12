import { useEffect, useRef, useState } from 'react'
import {
  setDoc,
  getDoc,
  onSnapshot,
  userDataRef,
  auth,
  onAuthStateChanged,
  ensureAnonymousSession,
} from './firebase'
import { useAppStore } from '../store'
import type { Project, Task, InboxItem } from '../types'
import { ensureAppDataShape } from './ensureDataShape'

export type SyncStatus = 'init' | 'synced' | 'saving' | 'offline' | 'error'

interface RemoteData {
  projects: Project[]
  inbox: InboxItem[]
  unassignedTasks: Task[]
  updatedAt?: string
}

function isValidRemoteData(v: unknown): v is RemoteData {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return Array.isArray(o.projects) && Array.isArray(o.inbox) && Array.isArray(o.unassignedTasks)
}

const DEBOUNCE_MS = 1500

export function useFirestoreSync() {
  const [status, setStatus] = useState<SyncStatus>('init')
  const uidRef = useRef<string | null>(null)
  const isApplyingRemoteRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unsubSnapshotRef = useRef<(() => void) | null>(null)
  const unsubStoreRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    let cancelled = false

    function scheduleSave(uid: string) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      setStatus('saving')
      saveTimerRef.current = setTimeout(async () => {
        try {
          const { projects, inbox, unassignedTasks } = useAppStore.getState()
          await setDoc(userDataRef(uid), {
            projects,
            inbox,
            unassignedTasks,
            updatedAt: new Date().toISOString(),
          })
          setStatus('synced')
        } catch (e) {
          console.error('[sync] save failed', e)
          setStatus('error')
        }
      }, DEBOUNCE_MS)
    }

    function teardownSync() {
      unsubSnapshotRef.current?.()
      unsubSnapshotRef.current = null
      unsubStoreRef.current?.()
      unsubStoreRef.current = null
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      uidRef.current = null
    }

    async function startSyncForUid(uid: string) {
      teardownSync()
      uidRef.current = uid

      const snap = await getDoc(userDataRef(uid))
      if (!snap.exists()) {
        const { projects, inbox, unassignedTasks } = useAppStore.getState()
        await setDoc(userDataRef(uid), {
          projects,
          inbox,
          unassignedTasks,
          updatedAt: new Date().toISOString(),
        })
      }

      unsubSnapshotRef.current = onSnapshot(
        userDataRef(uid),
        (docSnap) => {
          if (!docSnap.exists()) return
          const data = docSnap.data()
          if (!isValidRemoteData(data)) return

          isApplyingRemoteRef.current = true
          useAppStore.setState(ensureAppDataShape(data))
          isApplyingRemoteRef.current = false
          setStatus('synced')
        },
        (err) => {
          console.error('[sync] snapshot error', err)
          setStatus('offline')
        }
      )

      unsubStoreRef.current = useAppStore.subscribe((state, prev) => {
        if (isApplyingRemoteRef.current) return
        if (!uidRef.current) return
        if (
          state.projects !== prev.projects ||
          state.inbox !== prev.inbox ||
          state.unassignedTasks !== prev.unassignedTasks
        ) {
          scheduleSave(uidRef.current)
        }
      })
    }

    let unsubAuth: (() => void) | null = null
    let unsubHydrate: (() => void) | null = null

    function bootstrap() {
      unsubAuth = onAuthStateChanged(auth, (user) => {
        if (cancelled) return
        if (!user) {
          ensureAnonymousSession()
          return
        }
        void startSyncForUid(user.uid).catch((err) => {
          console.error('[sync] start failed', err)
          setStatus('error')
        })
      })
    }

    if (useAppStore.persist.hasHydrated()) {
      bootstrap()
    } else {
      unsubHydrate = useAppStore.persist.onFinishHydration(() => {
        if (cancelled) return
        bootstrap()
      })
    }

    return () => {
      cancelled = true
      unsubAuth?.()
      unsubHydrate?.()
      teardownSync()
    }
  }, [])

  return { status }
}
