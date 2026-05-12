import type { ReactNode } from 'react'

/**
 * プレーンテキスト内の http(s) URL をリンク化（新しいタブ）。
 * Markdown は対象外。
 */
export function LinkifiedText({ text, className }: { text: string; className?: string }) {
  if (!text) return null
  return <span className={className}>{linkifyTextToParts(text)}</span>
}

export function linkifyTextToParts(text: string): ReactNode[] {
  const re = /(https?:\/\/[^\s]+)/g
  const parts = text.split(re)
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      let href = part
      const trailing = /[),.;!?]+$/.exec(part)
      if (trailing) {
        href = part.slice(0, -trailing[0].length)
      }
      if (!/^https?:\/\//i.test(href)) {
        return part
      }
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      )
    }
    return part
  })
}
