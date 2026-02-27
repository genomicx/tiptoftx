import { useEffect, useRef, useState } from 'react'

interface LogConsoleProps {
  lines: string[]
}

export function LogConsole({ lines }: LogConsoleProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  function handleCopy() {
    if (!navigator.clipboard) return
    const text = lines.join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => undefined)
  }

  if (lines.length === 0) return null

  return (
    <div className="log-console">
      <div className="log-console-header">
        <span>Log</span>
        <button className="log-copy-btn" onClick={handleCopy} type="button">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {lines.map((line, i) => (
        <div className="log-line" key={`${i}-${line.slice(0, 20)}`}>
          <span className="log-line-num">{i + 1}</span>
          <span className="log-line-text">{line}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
