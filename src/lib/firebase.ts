import { initializeApp } from 'firebase/app'
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  linkWithPopup,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const firebaseApp = app
export const auth = getAuth(app)
// オフラインキャッシュ（多タブ対応）。旧 enableIndexedDbPersistence は非推奨のため移行
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
const googleProvider = new GoogleAuthProvider()

/** signOut → signInWithPopup の間に匿名サインインが割り込まないようにする */
let pendingGoogleSignIn = false

/** このブラウザでまだ何もログインしていないときだけ匿名サインイン */
export function ensureAnonymousSession(): void {
  if (pendingGoogleSignIn) return
  if (!auth.currentUser) {
    signInAnonymously(auth).catch(console.error)
  }
}

/**
 * 今の匿名ユーザーを Google にひもづけ（UID は維持 → この端末の Firestore パスが変わらない）
 * 最初に触る端末で実行する。
 */
export async function linkGoogleToCurrentUser(): Promise<void> {
  const user = auth.currentUser
  if (!user) throw new Error('not signed in')
  if (!user.isAnonymous) throw new Error('already linked or signed in')
  await linkWithPopup(user, googleProvider)
}

/**
 * いったんサインアウトして Google でログイン（同一 Google の UID に揃う → 他端末と同じデータ）
 * 匿名のまま溜めた、この端末だけのデータはサーバーに無い可能性があるので注意。
 */
export async function signInWithGoogleReplacingSession(): Promise<void> {
  pendingGoogleSignIn = true
  try {
    await signOut(auth)
    await signInWithPopup(auth, googleProvider)
  } catch (e) {
    pendingGoogleSignIn = false
    await signInAnonymously(auth).catch(console.error)
    throw e
  } finally {
    pendingGoogleSignIn = false
  }
}

export { onAuthStateChanged, signInAnonymously, signOut }

export function getAuthSummary(user: User | null): {
  isAnonymous: boolean
  email: string | null
} {
  if (!user) return { isAnonymous: true, email: null }
  return { isAnonymous: user.isAnonymous, email: user.email }
}

/** ユーザーの Firestore ドキュメント参照を返す */
export function userDataRef(uid: string) {
  return doc(db, 'users', uid, 'data', 'main')
}

/** 上書き前退避用のバックアップドキュメント（セッション初回保存の直前に main の旧値を保存） */
export function userBackupRef(uid: string) {
  return doc(db, 'users', uid, 'data', 'backup')
}

export { getDoc, setDoc, onSnapshot }
export type { Unsubscribe }
