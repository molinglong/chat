'use client'

import { useState, useCallback, useRef, useEffect, KeyboardEvent } from 'react'
import { Bot, Copy, Check, RotateCw, Pencil, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTypewriter } from '@/lib/useTypewriter'
import { MarkdownRenderer } from './MarkdownRenderer'
import type { UIMessage } from 'ai'

interface MessageBubbleProps {
  message: UIMessage
  isStreaming?: boolean
  isLastAssistant?: boolean
  canRegenerate?: boolean
  onRegenerate?: () => void
  canEdit?: boolean
  onEdit?: (messageId: string, newText: string) => void
}

export function MessageBubble({
  message,
  isStreaming,
  isLastAssistant,
  canRegenerate,
  onRegenerate,
  canEdit,
  onEdit,
}: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Extract text from message parts
  const textParts = message.parts.filter((p) => p.type === 'text')
  const text = textParts.map((p: any) => p.text).join('')
  const lastPart = textParts[textParts.length - 1] as { state?: string } | undefined
  const isCurrentlyStreaming = isStreaming && isAssistant && lastPart?.state === 'streaming'

  // Typewriter effect for assistant messages
  const { displayText, isTyping } = useTypewriter(text, isAssistant)

  // Show cursor while AI is streaming OR typewriter is still catching up
  const showCursor = isCurrentlyStreaming || isTyping

  // Show actions only when message is fully rendered (not streaming, not typing)
  const showActions = isStreaming !== undefined && !isCurrentlyStreaming && !isTyping && text.length > 0

  // Auto-focus and select when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
      // Auto-resize to fit content
      const ta = textareaRef.current
      ta.style.height = 'auto'
      ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
    }
  }, [isEditing])

  // Reset edit value when entering edit mode
  const startEditing = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setEditValue(text)
    setIsEditing(true)
  }, [text])

  const cancelEditing = useCallback(() => {
    setEditValue('')
    setIsEditing(false)
  }, [])

  const commitEdit = useCallback(() => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== text && onEdit) {
      onEdit(message.id, trimmed)
    }
    setIsEditing(false)
  }, [editValue, text, onEdit, message.id])

  const handleEditKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      commitEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEditing()
    }
  }, [commitEdit, cancelEditing])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [text])

  // Edit mode: inline textarea for user messages
  if (isUser && isEditing) {
    return (
      <div className="flex justify-end px-4 py-2">
        <div className="max-w-[80%] w-full">
          <div className="rounded-lg bg-zinc-900 dark:bg-zinc-100 rounded-br-sm overflow-hidden">
            <textarea
              ref={textareaRef}
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value)
                // Auto-resize
                const ta = e.target
                ta.style.height = 'auto'
                ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
              }}
              onKeyDown={handleEditKeyDown}
              onBlur={commitEdit}
              rows={1}
              className="w-full resize-none bg-transparent text-sm leading-relaxed text-white dark:text-zinc-900 outline-none px-3 py-1.5 min-h-[24px] max-h-[200px]"
            />
          </div>
          <div className="flex items-center justify-end gap-1 mt-1">
            <button
              onMouseDown={(e) => { e.preventDefault(); cancelEditing() }}
              className="p-1 rounded-md text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="取消"
              aria-label="取消"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); commitEdit() }}
              className="p-1 rounded-md text-zinc-400 hover:text-green-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="确认"
              aria-label="确认"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex gap-2.5 px-4 py-2', isUser ? 'justify-end' : 'justify-start')}>
      {/* Avatar - only for AI */}
      {!isUser && (
        <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 mt-0.5">
          <Bot className="w-3 h-3" />
        </div>
      )}

      {/* Message content */}
      <div className={cn('min-w-0 overflow-hidden', isUser ? 'max-w-[80%]' : 'flex-1 max-w-full')}>
        {isAssistant ? (
          displayText ? (
            <div className="relative text-sm text-zinc-800 dark:text-zinc-100 leading-relaxed">
              <MarkdownRenderer content={displayText} />
              {showCursor && (
                <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-zinc-600 dark:bg-zinc-400 animate-pulse align-middle" />
              )}
            </div>
          ) : isCurrentlyStreaming ? (
            <div className="flex items-center gap-1.5 py-1">
              <span className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : null
        ) : (
          <div className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-3 py-1.5 rounded-br-sm">
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white dark:text-zinc-900">{text}</p>
          </div>
        )}

        {/* Action bar */}
        {showActions && (
          <div className={cn('flex items-center gap-0.5 mt-1', isUser ? 'justify-end' : 'justify-start')}>
            <button
              onClick={handleCopy}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="复制"
              aria-label="复制"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            {isAssistant && isLastAssistant && canRegenerate && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="重新生成"
                aria-label="重新生成"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            )}
            {isUser && canEdit && onEdit && (
              <button
                onClick={startEditing}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="编辑"
                aria-label="编辑"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
