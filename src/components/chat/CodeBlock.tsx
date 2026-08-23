'use client'

import { useState, useCallback } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CodeBlockProps {
  language?: string
  code: string
  className?: string
}

export function CodeBlock({ language, code, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [code])

  return (
    <div className={cn('relative group rounded-lg overflow-hidden my-3', className)}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-gray-800 border-b border-gray-700/50">
        <span className="text-xs text-gray-400 font-mono select-none">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
          aria-label="复制代码"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>已复制</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>复制</span>
            </>
          )}
        </button>
      </div>
      {/* Code content */}
      <pre className="p-4 overflow-x-auto bg-gray-900 dark:bg-gray-950 text-sm leading-relaxed">
        <code className="text-gray-200 font-mono">{code}</code>
      </pre>
    </div>
  )
}
