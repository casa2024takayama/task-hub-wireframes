import { useEffect, useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { useAppStore } from './store'
import { useFirestoreSync, type SyncStatus } from './lib/useFirestoreSync'
import Dashboard from './pages/Dashboard'
import Inbox from './pages/Inbox'
import ProjectDetail from './pages/ProjectDetail'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Week from './pages/Week'

const APP_VERSION =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'

const WEEKDAY_JP = ['日', '月', '火', '水', '木', '金', '土']

function formatNow(d: Date) {
  const m = d.getMonth() + 1
  const day = d.getDate()
  const w = WEEKDAY_JP[d.getDay()]
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${m}/${day}（${w}）${hh}:${mm}`
}

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined
    const msToNextMinute = 60000 - (Date.now() % 60000)
    const timeout = setTimeout(() => {
      setNow(new Date())
      interval = setInterval(() => setNow(new Date()), 60000)
    }, msToNextMinute)
    return () => {
      clearTimeout(timeout)
      if (interval) clearInterval(interval)
    }
  }, [])
  return now
}

const SYNC_INDICATOR: Record<SyncStatus, { dot: string; label: string }> = {
  init:       { dot: 'bg-slate-300 animate-pulse', label: '接続中…' },
  local_only: { dot: 'bg-slate-400',               label: 'ローカルのみ' },
  synced:     { dot: 'bg-emerald-400',             label: '同期済み' },
  saving:     { dot: 'bg-amber-400 animate-pulse', label: '保存中…' },
  offline:    { dot: 'bg-rose-400',                label: 'オフライン' },
  error:      { dot: 'bg-rose-500',                label: 'エラー' },
}

function SyncBadge({ status }: { status: SyncStatus }) {
  const { dot, label } = SYNC_INDICATOR[status]
  return (
    <span className="flex items-center gap-1" title={label}>
      <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${dot}`} />
      <span className="text-[10px] text-slate-400 hidden sm:inline">{label}</span>
    </span>
  )
}

export default function App() {
  const inbox = useAppStore((s) => s.inbox)
  const now = useNow()
  const { status } = useFirestoreSync()
  // 全ページ幅広（1180px）＋ペーパー調背景で統一（2026-06 リデザイン）
  return (
    <div
      className="min-h-screen"
      style={{
        background: 'radial-gradient(120% 90% at 50% -10%, #F7F2E7 0%, #F2ECDF 55%, #EAE2D0 100%)',
      }}
    >
      {/* Top nav */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-[1180px] mx-auto px-4 h-12 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <NavLink to="/" className="text-base font-bold font-serif tracking-wide text-slate-800 shrink-0 flex items-baseline gap-1">
              タスクハブ<span className="text-indigo-600">.</span>
              <span className="text-[10px] font-mono font-normal text-slate-400">v{APP_VERSION}</span>
            </NavLink>
            <span className="text-xs text-slate-500 font-mono tabular-nums truncate">
              {formatNow(now)}
            </span>
            <SyncBadge status={status} />
          </div>
          <nav className="flex gap-3 text-sm shrink-0">
            <NavLink
              to="/week"
              className={({ isActive }) => (isActive ? 'text-indigo-700 font-semibold' : 'text-slate-500 hover:text-slate-800')}
            >
              今週
            </NavLink>
            <NavLink
              to="/inbox"
              className={({ isActive }) => (isActive ? 'text-indigo-700 font-semibold' : 'text-slate-500 hover:text-slate-800')}
            >
              受信箱
              {inbox.length > 0 && (
                <span className="ml-1 inline-block bg-rose-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {inbox.length}
                </span>
              )}
            </NavLink>
            <NavLink
              to="/reports"
              className={({ isActive }) => (isActive ? 'text-indigo-700 font-semibold' : 'text-slate-500 hover:text-slate-800')}
            >
              レポート
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) => (isActive ? 'text-indigo-700 font-semibold' : 'text-slate-500 hover:text-slate-800')}
              aria-label="環境設定"
              title="環境設定"
            >
              ⚙
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="max-w-[1180px] mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/week" element={<Week />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}
