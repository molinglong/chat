'use client'

import { useState, useEffect, useCallback } from 'react'
import { Eye, X, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/store/chat-store'

interface PreviewBlockProps {
  code: string
  className?: string
}

// Track last rendered code to avoid re-rendering the same content
let lastRenderedCode = ''

// ── macOS-style header bar ──────────────────────────────────────────
function MacHeader({ 
  title, 
  onExpand,
  onClose 
}: { 
  title: string
  onExpand: () => void
  onClose?: () => void
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-code-header border-b border-line">
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57] border border-[#e0443e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e] border border-[#dea123]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28c840] border border-[#1eaa33]" />
      </div>
      <span className="text-[11px] text-content-muted font-mono select-none">{title}</span>
      <div className="flex items-center gap-2">
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center justify-center w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e] hover:brightness-90 transition-all"
            aria-label="关闭预览"
          >
            <X className="w-2 h-2 text-[#820000] opacity-0 hover:opacity-100 transition-opacity" />
          </button>
        )}
        <button
          onClick={onExpand}
          className="flex items-center justify-center w-3 h-3 rounded-full bg-[#28c840] border border-[#1eaa33] hover:brightness-90 transition-all"
          aria-label="全屏预览"
        >
          <Maximize2 className="w-2 h-2 text-[#006600] opacity-0 hover:opacity-100 transition-opacity" />
        </button>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────
export function PreviewBlock({ code, className }: PreviewBlockProps) {
  const [isDark, setIsDark] = useState(false)
  const fullscreen = useChatStore(state => state.isPreviewFullscreen)
  const setIsFullscreen = useChatStore(state => state.setIsPreviewFullscreen)
  
  const openPreview = useCallback(() => {
    setIsFullscreen(true)
  }, [setIsFullscreen])
  
  const closePreview = useCallback(() => {
    setIsFullscreen(false)
  }, [setIsFullscreen])

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Auto-open preview when code appears
  useEffect(() => {
    if (!fullscreen) {
      openPreview()
    }
  }, [code, fullscreen, openPreview])

  // Don't re-render if code hasn't changed
  if (code === lastRenderedCode) {
    return null
  }
  lastRenderedCode = code

  return (
    <>
      <div className={cn('my-3 rounded-lg overflow-hidden border border-line', className)}>
        <MacHeader 
          title="preview" 
          onExpand={openPreview}
          onClose={closePreview}
        />
        <div className="bg-code-bg p-4 text-xs text-content-muted">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4" />
            <span>已自动打开预览窗口</span>
          </div>
          <p>该预览窗口支持：</p>
          <ul className="ml-4 mt-1 space-y-0.5 text-content-secondary">
            <li>✅ HTML/CSS/JavaScript 渲染</li>
            <li>✅ 外部资源加载（CDN）</li>
            <li>✅ 交互操作（按钮、表单等）</li>
            <li>⚠️ API 请求需要同源策略</li>
          </ul>
        </div>
      </div>
    </>
  )
}
