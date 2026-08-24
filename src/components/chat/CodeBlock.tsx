'use client'

import { useState, useCallback, useEffect } from 'react'
import { Check, Copy, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/store/chat-store'

interface CodeBlockProps {
  language?: string
  code: string
  className?: string
}

// macOS-style header bar with traffic light dots
function MacHeader({ 
  language, 
  copied, 
  onCopy,
  isPreview = false,
  onPreview
}: {
  language: string
  copied: boolean
  onCopy: () => void
  isPreview?: boolean
  onPreview?: () => void
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-code-header border-b border-line">
      {/* Traffic light dots */}
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57] border border-[#e0443e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e] border border-[#dea123]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28c840] border border-[#1eaa33]" />
      </div>
      <span className="text-[11px] text-content-muted font-mono select-none">
        {language || 'code'}
      </span>
      <div className="flex items-center gap-2">
        {isPreview && onPreview && (
          <button
            onClick={onPreview}
            className="flex items-center gap-1 text-[11px] text-content-muted hover:text-green-500 transition-colors"
            aria-label="查看预览"
          >
            <Eye className="w-3 h-3" />
            <span>预览</span>
          </button>
        )}
        <button
          onClick={onCopy}
          className="flex items-center gap-1 text-[11px] text-content-muted hover:text-content-primary transition-colors"
          aria-label="复制代码"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              <span>已复制</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>复制</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// Plain text fallback shown while shiki loads
function PlainCodeBlock({ language, code, className, previewCode }: CodeBlockProps & { previewCode?: string }) {
  const [copied, setCopied] = useState(false)
  const setPreviewCode = useChatStore(state => state.setPreviewCode)
  const setIsFullscreen = useChatStore(state => state.setIsPreviewFullscreen)

  const handlePreview = useCallback(() => {
    if (previewCode) {
      setPreviewCode(previewCode) // Set the actual HTML code first
      setIsFullscreen(true)       // Then open fullscreen
    }
  }, [previewCode, setPreviewCode, setIsFullscreen])

  return (
    <div className={cn('relative group rounded-lg overflow-hidden my-3 border border-line', className)}>
      <MacHeader 
        language={language || 'code'} 
        copied={copied} 
        onCopy={() => {
          navigator.clipboard.writeText(code).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          })
        }}
        isPreview={!!previewCode}
        onPreview={handlePreview}
      />
      <pre className="p-4 overflow-x-auto bg-code-bg text-sm leading-relaxed">
        <code className="text-content-primary font-mono">{code}</code>
      </pre>
    </div>
  )
}

// Full component with shiki highlighting (only loaded on client)
export function CodeBlock({ language, code, className, previewCode }: CodeBlockProps & { previewCode?: string }) {
  const [copied, setCopied] = useState(false)
  const [highlighted, setHighlighted] = useState<string>('')
  const [isHighlighted, setIsHighlighted] = useState(false)
  const setPreviewCode = useChatStore(state => state.setPreviewCode)
  const setIsFullscreen = useChatStore(state => state.setIsPreviewFullscreen)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [code])

  const handlePreview = useCallback(() => {
    if (previewCode) {
      setPreviewCode(previewCode) // Set the actual HTML code first
      setIsFullscreen(true)       // Then open fullscreen
    }
  }, [previewCode, setPreviewCode, setIsFullscreen])

  useEffect(() => {
    let cancelled = false

    async function highlight() {
      try {
        const { codeToHtml } = await import('shiki/bundle/web')
        const isDark = document.documentElement.classList.contains('dark')
        const html = await codeToHtml(code, {
          lang: language || 'plaintext',
          theme: isDark ? 'one-dark-pro' : 'one-light',
        })
        if (!cancelled) {
          setHighlighted(html)
          setIsHighlighted(true)
        }
      } catch {
        // Fallback to plain text on error
      }
    }

    if (language) {
      highlight()
    }

    return () => {
      cancelled = true
    }
  }, [code, language])

  if (isHighlighted && highlighted) {
    return (
      <div className={cn('relative group rounded-lg overflow-hidden my-3 border border-line', className)}>
        <MacHeader 
          language={language || 'code'} 
          copied={copied} 
          onCopy={handleCopy}
          isPreview={!!previewCode}
          onPreview={handlePreview}
        />
        <div
          className="p-4 overflow-x-auto bg-code-bg text-sm leading-relaxed [&>pre]:!bg-transparent [&>pre]:!m-0 [&>pre]:!p-0"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </div>
    )
  }

  // Fallback: plain text
  return <PlainCodeBlock language={language} code={code} className={className} previewCode={previewCode} />
}