import { useEffect, useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { useAppStore } from './store'
import Dashboard from './pages/Dashboard'
import Inbox from './pages/Inbox'
import ProjectDetail from './pages/ProjectDetail'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

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

export default function App() {
  const inbox = useAppStore((s) => s.inbox)
  const now = useNow()

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top nav */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <NavLink to="/" className="text-base font-bold text-slate-800 shrink-0">
              タスクハブ
            </NavLink>
            <span className="text-xs text-slate-500 font-mono tabular-nums truncate">
              {formatNow(now)}
            </span>
          </div>
          <nav className="flex gap-3 text-sm shrink-0">
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

      <main className="max-w-3xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}
