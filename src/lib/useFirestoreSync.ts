import { useEffect, useRef, useState } from 'react'
import {
  setDoc,
  onSnapshot,
  userDataRef,
  userBackupRef,
  auth,
  onAuthStateChanged,
  ensureAnonymousSession,
} from './firebase'
import { useAppStore } from '../store'
import type { Project, Task, InboxItem } from '../types'
import { ensureAppDataShape } from './ensureDataShape'

// ============================================================================
// 同期の安全設計（v0.7.14 / 2026-07-03 のデータ消失事故を受けた再設計）
//
// 事故の構造: デモ初期状態 × 「クラウドが空ならローカルを無条件アップロード」
//           × サーバー確認前からアップローダ有効 → デモが全端末に伝播した。
//
// 対策:
//  1. アップローダは「サーバー確定スナップショット（fromCache=false）」を
//     受け取るまで起動しない（キャッシュ値や未確認状態で書き込まない）
//  2. サーバーにドキュメントが無い場合も、ローカルが空なら初期アップロードしない
//  3. セッション初回の保存前に、直前のクラウド値を users/{uid}/data/backup へ退避
//  4. リモート適用でタスク数が激減する場合、現ローカルを localStorage に退避
// ============================================================================

export type SyncStatus =
  | 'init'
  | 'local_only'
  | 'synced'
  | 'saving'
  | 'offline'
  | 'error'

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

function countTasks(d: { projects: Project[]; unassignedTasks: Task[] }): number {
  return d.projects.reduce((n, p) => n + p.tasks.length, 0) + d.unassignedTasks.length
}

function isEmptyData(d: { projects: Project[]; inbox: InboxItem[]; unassignedTasks: Task[] }): boolean {
  return d.projects.length === 0 && d.inbox.length === 0 && d.unassignedTasks.length === 0
}

/** 激減ガードの退避先キー。復元は Settings のインポートにこの JSON を貼れば良い */
export const PRE_SHRINK_BACKUP_KEY = 'task-hub-pre-shrink-backup'

const DEBOUNCE_MS = 1500

export function useFirestoreSync() {
  const [status, setStatus] = useState<SyncStatus>('init')
  const uidRef = useRef<string | null>(null)
  const isApplyingRemoteRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unsubSnapshotRef = useRef<(() => void) | null>(null)
  const unsubStoreRef = useRef<(() => void) | null>(null)
  const uploaderEnabledRef = useRef(false)
  const sessionBackupDoneRef = useRef(false)
  /** 最後にサーバーから受け取った確定値（セッション初回保存前の退避に使う） */
  const lastServerDataRef = useRef<RemoteData | null>(null)

  useEffect(() => {
    let cancelled = false

    function scheduleSave(uid: string) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      setStatus('saving')
      saveTimerRef.current = setTimeout(async () => {
        try {
          // このセッションで初めてクラウドを上書きする前に、直前のクラウド値を退避。
          // 誤った書き込みをしても data/backup から復元できる
          if (!sessionBackupDoneRef.current && lastServerDataRef.current) {
            sessionBackupDoneRef.current = true
            try {
              await setDoc(userBackupRef(uid), {
                ...lastServerDataRef.current,
                backedUpAt: new Date().toISOString(),
              })
            } catch (e) {
              console.warn('[sync] backup write failed (continuing)', e)
            }
          }
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

    // ローカル→クラウドの保存は、サーバーの現状を確認できてから初めて有効化する
    function enableUploader(uid: string) {
      if (uploaderEnabledRef.current) return
      uploaderEnabledRef.current = true
      unsubStoreRef.current = useAppStore.subscribe((state, prev) => {
        if (isApplyingRemoteRef.current) return
        if (uidRef.current !== uid) return
        if (
          state.projects !== prev.projects ||
          state.inbox !== prev.inbox ||
          state.unassignedTasks !== prev.unassignedTasks
        ) {
          scheduleSave(uid)
        }
      })
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
      uploaderEnabledRef.current = false
      lastServerDataRef.current = null
    }

    function startSyncForUid(uid: string) {
      teardownSync()
      uidRef.current = uid

      unsubSnapshotRef.current = onSnapshot(
        userDataRef(uid),
        // includeMetadataChanges が無いと「キャッシュと同内容のサーバー確定」が
        // メタデータのみの変化として握りつぶされ、fromCache=false が永遠に来ない
        // （＝接続中のまま・アップローダ起動せず）。v0.7.14 の安全設計はこれが前提
        { includeMetadataChanges: true },
        (docSnap) => {
          const fromCache = docSnap.metadata.fromCache

          if (docSnap.exists()) {
            const data = docSnap.data()
            if (!isValidRemoteData(data)) return
            const shaped = ensureAppDataShape(data)

            // 激減ガード: リモート適用でタスクが大きく減るなら、現ローカルを退避してから適用
            const local = useAppStore.getState()
            const localCount = countTasks(local)
            const remoteCount = countTasks(shaped)
            if (localCount - remoteCount >= 5 && remoteCount < localCount / 2) {
              try {
                localStorage.setItem(
                  PRE_SHRINK_BACKUP_KEY,
                  JSON.stringify({
                    stashedAt: new Date().toISOString(),
                    reason: `remote(${remoteCount}) << local(${localCount})`,
                    projects: local.projects,
                    inbox: local.inbox,
                    unassignedTasks: local.unassignedTasks,
                  })
                )
                console.warn(
                  `[sync] リモート適用でタスクが激減（${localCount}→${remoteCount}）。` +
                    `適用前のローカルを localStorage["${PRE_SHRINK_BACKUP_KEY}"] に退避しました`
                )
              } catch {
                /* 退避失敗しても同期自体は続行 */
              }
            }

            isApplyingRemoteRef.current = true
            useAppStore.setState(shaped)
            isApplyingRemoteRef.current = false

            if (!fromCache) {
              // サーバー確定値。ここで初めて「クラウドの現状」を知ったことになる
              lastServerDataRef.current = {
                projects: shaped.projects,
                inbox: shaped.inbox,
                unassignedTasks: shaped.unassignedTasks,
              }
              setStatus('synced')
              enableUploader(uid)
            }
            return
          }

          // ドキュメントが存在しない
          if (fromCache) return // キャッシュの「無い」は信用せず、サーバー確定を待つ

          // サーバー上に本当に無い（真の初回）。ローカルに中身があるときだけ初期アップロード。
          // 空のローカルをアップロードしない＝空/初期状態がクラウドを汚さない
          const local = useAppStore.getState()
          if (!isEmptyData(local)) {
            setDoc(userDataRef(uid), {
              projects: local.projects,
              inbox: local.inbox,
              unassignedTasks: local.unassignedTasks,
              updatedAt: new Date().toISOString(),
            }).catch((e) => console.error('[sync] initial upload failed', e))
          }
          setStatus('synced')
          enableUploader(uid)
        },
        (err) => {
          console.error('[sync] snapshot error', err)
          setStatus('offline')
        }
      )
    }

    let unsubAuth: (() => void) | null = null
    let unsubHydrate: (() => void) | null = null

    function bootstrap() {
      unsubAuth = onAuthStateChanged(auth, (user) => {
        if (cancelled) return
        if (!user) {
          ensureAnonymousSession()
          teardownSync()
          setStatus('init')
          return
        }
        // Firestore ルールは Google ログインのみ許可（匿名はローカルのみ）
        if (user.isAnonymous) {
          teardownSync()
          setStatus('local_only')
          return
        }
        startSyncForUid(user.uid)
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
