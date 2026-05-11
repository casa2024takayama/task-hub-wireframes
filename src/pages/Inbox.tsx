import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '../store'
import { analyzeInboxText, MIN_TEXT_LENGTH_FOR_AI } from '../lib/ai'
import type { InboxItem, Project } from '../types'

interface FormState {
  title: string
  projectId: string
  size: 'small' | 'large'
  dueDate: string
  requestedBy: string
  aiApplied: boolean
}

const EMPTY_FORM: FormState = {
  title: '',
  projectId: '',
  size: 'small',
  dueDate: '',
  requestedBy: '',
  aiApplied: false,
}

function applySuggestionToForm(item: InboxItem): FormState | null {
  const s = item.suggestion
  if (!s || s.status !== 'ready') return null
  return {
    title: s.title ?? '',
    projectId: s.projectId ?? '',
    size: s.size ?? 'small',
    dueDate: s.dueDate ?? '',
    requestedBy: s.requestedBy ?? '',
    aiApplied: true,
  }
}

export default function Inbox() {
  const inbox = useAppStore((st) => st.inbox)
  const projects = useAppStore((st) => st.projects)
  const unassignedTasks = useAppStore((st) => st.unassignedTasks)
  const removeFromInbox = useAppStore((st) => st.removeFromInbox)
  const promoteInboxItem = useAppStore((st) => st.promoteInboxItem)
  const setInboxSuggestion = useAppStore((st) => st.setInboxSuggestion)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, FormState>>({})
  const requestedIdsRef = useRef<Set<string>>(new Set())

  // 過去入力された依頼者をユニークに集めて <datalist> サジェストに使う
  const requestedBySuggestions = useMemo(() => {
    const set = new Set<string>(['自分'])
    const allTasks = [...projects.flatMap((p) => p.tasks), ...unassignedTasks]
    for (const t of allTasks) {
      if (t.requestedBy) set.add(t.requestedBy)
    }
    return Array.from(set)
  }, [projects, unassignedTasks])

  function getForm(id: string): FormState {
    return form[id] ?? EMPTY_FORM
  }

  function setField<K extends keyof FormState>(id: string, key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [id]: { ...getForm(id), [key]: value } }))
  }

  function triggerAI(item: InboxItem) {
    if (requestedIdsRef.current.has(item.id)) return
    requestedIdsRef.current.add(item.id)

    if (item.rawText.trim().length < MIN_TEXT_LENGTH_FOR_AI) {
      setInboxSuggestion(item.id, { status: 'skipped' })
      return
    }

    setInboxSuggestion(item.id, { status: 'pending' })
    void analyzeInboxText({ rawText: item.rawText, projects }).then((suggestion) => {
      setInboxSuggestion(item.id, suggestion)
    })
  }

  function handleRetry(id: string) {
    const item = inbox.find((x) => x.id === id)
    if (!item) return
    requestedIdsRef.current.delete(id)
    setInboxSuggestion(id, { status: 'pending' })
    void analyzeInboxText({ rawText: item.rawText, projects }).then((suggestion) => {
      setInboxSuggestion(id, suggestion)
    })
  }

  // 展開した受信箱アイテムについて、未解析なら AI を呼ぶ
  useEffect(() => {
    if (!expandedId) return
    const item = inbox.find((x) => x.id === expandedId)
    if (!item) return

    // 既に解析済み（成功・失敗・スキップどれでも）なら何もしない
    if (item.suggestion) return

    triggerAI(item)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedId, inbox])

  // suggestion が ready になったら、フォームが空のときだけ初期値として流し込む
  useEffect(() => {
    inbox.forEach((item) => {
      if (item.suggestion?.status !== 'ready') return
      const current = form[item.id]
      const isPristine =
        !current ||
        (!current.title &&
          !current.projectId &&
          !current.dueDate &&
          !current.requestedBy &&
          !current.aiApplied)
      if (!isPristine) return
      const next = applySuggestionToForm(item)
      if (next) {
        setForm((prev) => ({ ...prev, [item.id]: next }))
      }
    })
  }, [inbox, form])

  function handlePromote(id: string) {
    const f = getForm(id)
    if (!f.title.trim()) return
    promoteInboxItem(id, {
      title: f.title.trim(),
      projectId: f.projectId || null,
      size: f.size,
      dueDate: f.dueDate || null,
      requestedBy: f.requestedBy.trim() || null,
    })
    setExpandedId(null)
  }

  return (
    <div>
      <h1 className="text-lg font-bold text-slate-800 mb-4">
        受信箱
        {inbox.length > 0 && <span className="ml-2 text-sm text-slate-500">{inbox.length}件</span>}
      </h1>

      {inbox.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <p className="text-slate-400 text-sm">受信箱は空です 🎉</p>
        </div>
      ) : (
        <div className="space-y-2">
          {inbox.map((item) => {
            const isOpen = expandedId === item.id
            const f = getForm(item.id)
            const createdAt = new Date(item.createdAt)
            const timeStr = `${createdAt.getMonth() + 1}/${createdAt.getDate()} ${String(createdAt.getHours()).padStart(2, '0')}:${String(createdAt.getMinutes()).padStart(2, '0')}`
            const isAiCandidate = item.rawText.trim().length >= MIN_TEXT_LENGTH_FOR_AI

            return (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <button
                  className="w-full text-left p-4 flex items-start gap-3"
                  onClick={() => setExpandedId(isOpen ? null : item.id)}
                >
                  <span className="text-indigo-500 shrink-0 mt-0.5">📨</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 line-clamp-2">{item.rawText}</p>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                      <span>{timeStr}</span>
                      <SuggestionBadge item={item} isAiCandidate={isAiCandidate} />
                    </p>
                  </div>
                  <span className="text-slate-400 text-sm shrink-0">{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3">
                    <SuggestionHeader item={item} isAiCandidate={isAiCandidate} projects={projects} aiApplied={f.aiApplied} onRetry={handleRetry} />

                    <div>
                      <label className="text-xs text-slate-500 block mb-1">タスクタイトル</label>
                      <input
                        autoFocus
                        value={f.title}
                        onChange={(e) => setField(item.id, 'title', e.target.value)}
                        placeholder="何をすればよいか一言で"
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-400"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">プロジェクト</label>
                        <select
                          value={f.projectId}
                          onChange={(e) => setField(item.id, 'projectId', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-400 bg-white"
                        >
                          <option value="">未割当</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-slate-500 block mb-1">サイズ</label>
                        <select
                          value={f.size}
                          onChange={(e) => setField(item.id, 'size', e.target.value as 'small' | 'large')}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-400 bg-white"
                        >
                          <option value="small">小（30分以内）</option>
                          <option value="large">大</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-slate-500 block mb-1">締切</label>
                        <input
                          type="date"
                          value={f.dueDate}
                          onChange={(e) => setField(item.id, 'dueDate', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-500 block mb-1">
                        依頼者{' '}
                        <span className="text-slate-400 font-normal">
                          （任意。「自分」＝アイデア・メモとして扱う）
                        </span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          list={`req-list-${item.id}`}
                          value={f.requestedBy}
                          onChange={(e) => setField(item.id, 'requestedBy', e.target.value)}
                          placeholder="例: 田中さん / 経営会議 / 自分"
                          className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-400"
                        />
                        <datalist id={`req-list-${item.id}`}>
                          {requestedBySuggestions.map((v) => (
                            <option key={v} value={v} />
                          ))}
                        </datalist>
                        <button
                          type="button"
                          onClick={() => setField(item.id, 'requestedBy', '自分')}
                          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 rounded-lg whitespace-nowrap"
                          title="自分のアイデア・メモとして登録"
                        >
                          自分
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => removeFromInbox(item.id)}
                        className="text-xs text-slate-400 hover:text-rose-500"
                      >
                        削除
                      </button>
                      <button
                        onClick={() => handlePromote(item.id)}
                        disabled={!f.title.trim()}
                        className="bg-indigo-600 disabled:opacity-40 text-white text-sm px-5 py-1.5 rounded-lg hover:bg-indigo-700 transition"
                      >
                        振り分け完了
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SuggestionBadge({ item, isAiCandidate }: { item: InboxItem; isAiCandidate: boolean }) {
  if (!isAiCandidate) return null
  const s = item.suggestion
  // まだ開いていない（未解析）→ バッジなし
  if (!s) return null
  if (s.status === 'pending') {
    return <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">AI 解析中…</span>
  }
  if (s.status === 'ready') {
    return <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">✨ AI 提案あり</span>
  }
  if (s.status === 'failed') {
    return <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">AI エラー</span>
  }
  return null
}

function SuggestionHeader({
  item,
  isAiCandidate,
  projects,
  aiApplied,
  onRetry,
}: {
  item: InboxItem
  isAiCandidate: boolean
  projects: Project[]
  aiApplied: boolean
  onRetry: (id: string) => void
}) {
  if (!isAiCandidate) {
    return (
      <p className="text-xs text-slate-500">
        短い文なので AI 提案はスキップ（{MIN_TEXT_LENGTH_FOR_AI} 文字以上で自動入力されます）。手で 3 つだけ決めてください。
      </p>
    )
  }
  const s = item.suggestion
  if (!s || s.status === 'pending') {
    return <p className="text-xs text-indigo-600">✨ AI が内容を解析中…しばらくお待ちください</p>
  }
  if (s.status === 'failed') {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-md px-3 py-2 space-y-1">
        <p className="text-xs font-semibold text-rose-700">AI 解析に失敗しました</p>
        <p className="text-[11px] text-rose-600 break-all">{s.error ?? '原因不明'}</p>
        <button
          onClick={() => onRetry(item.id)}
          className="text-[11px] text-rose-700 underline"
        >
          再解析する
        </button>
      </div>
    )
  }
  if (s.status === 'skipped') {
    return <p className="text-xs text-slate-500">AI 解析はスキップされました。</p>
  }
  // ready
  const projectName = s.projectId ? (projects.find((p) => p.id === s.projectId)?.name ?? '不明') : '未割当'
  return (
    <div className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-md px-3 py-2 space-y-0.5">
      <p className="font-semibold">
        ✨ AI 提案 {aiApplied && <span className="text-[10px] font-normal text-indigo-500">（フォームに反映済み）</span>}
      </p>
      <p>
        プロジェクト: <span className="font-mono">{projectName}</span> ／ サイズ:{' '}
        <span className="font-mono">{s.size}</span> ／ 締切: <span className="font-mono">{s.dueDate ?? '—'}</span>
      </p>
      <p>依頼者: <span className="font-mono">{s.requestedBy ?? '—'}</span></p>
      {s.reason && <p className="text-[11px] text-indigo-500">理由: {s.reason}</p>}
    </div>
  )
}
