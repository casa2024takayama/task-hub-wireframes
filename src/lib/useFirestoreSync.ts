import { useEffect, useRef, useState } from 'react'
import { setDoc, getDoc, onSnapshot, waitForUid, userDataRef } from './firebase'
import { useAppStore } from '../store'
import type { Project, Task, InboxItem } from '../types'

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

  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null

    waitForUid().then(async (uid) => {
      uidRef.current = uid

      // Firestore にデータがなければローカルデータをアップロードして初期化
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

      // リアルタイム同期をサブスクライブ
      unsubSnapshot = onSnapshot(
        userDataRef(uid),
        (docSnap) => {
          if (!docSnap.exists()) return
          const data = docSnap.data()
          if (!isValidRemoteData(data)) return

          isApplyingRemoteRef.current = true
          useAppStore.setState({
            projects: data.projects,
            inbox: data.inbox,
            unassignedTasks: data.unassignedTasks,
          })
          isApplyingRemoteRef.current = false
          setStatus('synced')
        },
        (err) => {
          console.error('[sync] snapshot error', err)
          setStatus('offline')
        }
      )
    }).catch((err) => {
      console.error('[sync] auth error', err)
      setStatus('error')
    })

    // Zustand のデータ変更を監視して Firestore に保存
    const unsubStore = useAppStore.subscribe((state, prev) => {
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

    return () => {
      unsubSnapshot?.()
      unsubStore()
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  return { status }
}
