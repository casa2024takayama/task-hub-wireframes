import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import {
  getFirestore,
  enableIndexedDbPersistence,
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
export const auth = getAuth(app)
export const db = getFirestore(app)

// Firestore のオフラインキャッシュを有効化（オフライン時でも動作する）
enableIndexedDbPersistence(db).catch(() => {
  // 複数タブで開いた場合などは無視
})

/** 匿名サインインして uid を返す */
export function waitForUid(): Promise<string> {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsub()
        resolve(user.uid)
        return
      }
      signInAnonymously(auth).catch(console.error)
    })
  })
}

/** ユーザーの Firestore ドキュメント参照を返す */
export function userDataRef(uid: string) {
  return doc(db, 'users', uid, 'data', 'main')
}

export { getDoc, setDoc, onSnapshot }
export type { Unsubscribe }
