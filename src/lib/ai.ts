import { getAI, getGenerativeModel, GoogleAIBackend, Schema, type GenerativeModel } from 'firebase/ai'
import { firebaseApp } from './firebase'
import type { InboxSuggestion, Project, TaskSize } from '../types'

// Firebase AI Logic (Google AI バックエンド) で使えるモデル名
// 2026-05 時点の公式ドキュメント推奨: gemini-2.5-flash-lite
// (gemini-2.0-flash は 2026-06-01 廃止予定)
const MODEL_NAME = 'gemini-2.5-flash-lite'

/** これ未満の文字数なら AI 解析をスキップ（短文は誤推定が多いので人間に任せる） */
export const MIN_TEXT_LENGTH_FOR_AI = 50

let cachedModel: GenerativeModel | null = null

function getModel(): GenerativeModel {
  if (cachedModel) return cachedModel
  const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() })

  const responseSchema = Schema.object({
    properties: {
      title: Schema.string({
        description: 'タスクとして実行すべき内容を 30 文字以内で簡潔に表したタイトル（日本語）。',
      }),
      projectId: Schema.string({
        description:
          '与えられた既存プロジェクト一覧の中でこのタスクが属しそうなプロジェクトの id。' +
          'どれにも該当しない、または判断できない場合は文字列 "null" を返す。',
      }),
      size: Schema.enumString({
        enum: ['small', 'medium', 'large', 'xlarge'],
        description:
          '作業の大きさ。small=30分以内、medium=〜2時間、large=半日〜1日、xlarge=複数日。' +
          'それ以上の案件はプロジェクト単位と判断し、可能なら最も近い値を選ぶ。',
      }),
      dueDate: Schema.string({
        description:
          '締切日。明示的に書かれている場合または明らかに推測できる場合のみ YYYY-MM-DD で返す。' +
          '不明な場合は文字列 "null" を返す。今日の日付は別途与えられる。',
      }),
      requestedBy: Schema.string({
        description:
          'このタスクの依頼者。人名なら「〇〇さん」、組織・会議体ならその名称（例: 「経営会議」「広報チーム」）。' +
          '本人発意（メモ・アイデアなど自分起点）と判断できる場合は文字列 "自分" を返す。' +
          '判別不能な場合は文字列 "null" を返す。',
      }),
      reason: Schema.string({
        description: '上記の判断理由を 50 文字以内で要約した日本語のメモ。',
      }),
    },
  })

  cachedModel = getGenerativeModel(ai, {
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
      temperature: 0.2,
    },
  })
  return cachedModel
}

interface RawSuggestion {
  title?: unknown
  projectId?: unknown
  size?: unknown
  dueDate?: unknown
  requestedBy?: unknown
  reason?: unknown
}

function normalizeStringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.toLowerCase() === 'null') return null
  return trimmed
}

function isProjectIdValid(id: string | null, projects: Project[]): boolean {
  if (!id) return false
  return projects.some((p) => p.id === id)
}

function isIsoDate(s: string | null): s is string {
  if (!s) return false
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

export interface AnalyzeOptions {
  rawText: string
  projects: Project[]
}

export async function analyzeInboxText({
  rawText,
  projects,
}: AnalyzeOptions): Promise<InboxSuggestion> {
  const trimmed = rawText.trim()
  if (trimmed.length < MIN_TEXT_LENGTH_FOR_AI) {
    return { status: 'skipped' }
  }

  const today = new Date().toISOString().split('T')[0]
  const projectList = projects
    .filter((p) => p.status === 'active')
    .map((p) => ({ id: p.id, name: p.name, resumeNote: p.resumeNote ?? '' }))

  const prompt = [
    'あなたは個人の「タスクハブ」アプリの分類アシスタントです。',
    'ユーザーが受信箱に貼り付けたテキストから、タスクのタイトル・所属プロジェクト・サイズ・締切日・依頼者を抽出します。',
    '判断に迷う場合は無理に埋めず、 "null" を返してください。',
    '',
    `今日の日付（ISO）: ${today}`,
    '',
    '既存プロジェクト（JSON配列）：',
    JSON.stringify(projectList, null, 2),
    '',
    'タスクサイズの基準: small=30分以内、medium=〜2時間、large=半日〜1日、xlarge=複数日。特大より大きいものは本来プロジェクト。',
    '',
    '依頼者の判定基準:',
    '- 人名が読み取れる場合は敬称付きで「〇〇さん」と統一（例: 「田中」と書かれていても「田中さん」）',
    '- 組織・会議体（経営会議、広報チーム、〇〇部 など）はその名称をそのまま',
    '- 本人のアイデア・メモなど、自分起点と判断できる場合は文字列 "自分"',
    '- 判別できない場合は文字列 "null"',
    '',
    '受信箱に貼り付けられたテキスト（区切り <<<>>>）：',
    `<<<${trimmed}>>>`,
  ].join('\n')

  try {
    const model = getModel()
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    const raw = JSON.parse(text) as RawSuggestion

    const title = normalizeStringOrNull(raw.title) ?? ''
    const projectIdRaw = normalizeStringOrNull(raw.projectId)
    const projectId = isProjectIdValid(projectIdRaw, projects) ? projectIdRaw : null
    const sizeRaw = normalizeStringOrNull(raw.size)
    const allowed: TaskSize[] = ['small', 'medium', 'large', 'xlarge']
    const size: TaskSize = allowed.includes(sizeRaw as TaskSize) ? (sizeRaw as TaskSize) : 'small'
    const dueDateRaw = normalizeStringOrNull(raw.dueDate)
    const dueDate = isIsoDate(dueDateRaw) ? dueDateRaw : null
    const requestedBy = normalizeStringOrNull(raw.requestedBy)
    const reason = normalizeStringOrNull(raw.reason) ?? ''

    return {
      status: 'ready',
      title: title || undefined,
      projectId,
      size,
      dueDate,
      requestedBy,
      reason,
      modelName: MODEL_NAME,
      analyzedAt: new Date().toISOString(),
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[ai] analyze failed:', message, e)
    return {
      status: 'failed',
      error: message,
      modelName: MODEL_NAME,
      analyzedAt: new Date().toISOString(),
    }
  }
}
