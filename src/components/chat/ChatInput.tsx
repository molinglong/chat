'use client'

import { useState, useRef, useCallback, useEffect, KeyboardEvent, ChangeEvent } from 'react'
import { Send, Square, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FileUpload, type Attachment } from './FileUpload'
import { ModelSelector } from './ModelSelector'
import type { ModelDefinition } from '@/lib/ai/types'

export interface ChatInputProps {
  onSend: (text: string, attachments?: Attachment[]) => void
  onStop: () => void
  isLoading: boolean
  className?: string
  models: ModelDefinition[]
  selectedModel: string
  onModelChange: (modelId: string) => void
  deepThink: boolean
  onDeepThinkChange: (enabled: boolean) => void
}

export function ChatInput({ onSend, onStop, isLoading, className, models, selectedModel, onModelChange, deepThink, onDeepThinkChange }: ChatInputProps) {
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }, [])

  useEffect(() => {
    adjustHeight()
  }, [input, adjustHeight])

  // Reset height when loading finishes
  useEffect(() => {
    if (!isLoading) {
      textareaRef.current?.focus()
    }
  }, [isLoading])

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleSend() {
    const trimmed = input.trim()
    if ((!trimmed && attachments.length === 0) || isLoading) return
    onSend(trimmed, attachments.length > 0 ? attachments : undefined)
    setInput('')
    setAttachments([])
    // Reset height after send
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }, 0)
  }

  return (
    <div className={cn('relative z-20 px-3 pb-2 pt-1', className)}>
      <div className="max-w-2xl mx-auto">
        <div
          className={cn(
            'relative flex flex-col rounded-xl border z-20',
            'border-line/60',
            'bg-surface-glass backdrop-blur-xl',
            'shadow-lg focus-within:border-line-strong',
            'transition-all'
          )}
        >
          {/* Attachments preview row */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 pt-3">
              {attachments.map((att, idx) => (
                <div
                  key={att.url + idx}
                  className={cn(
                    'group flex items-center gap-2 rounded-lg border',
                    'border-line bg-surface-muted',
                    'px-2 py-1.5 max-w-[200px]'
                  )}
                >
                  {att.type.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={att.url} alt={att.name} className="w-5 h-5 rounded object-cover shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded bg-surface-subtle flex items-center justify-center shrink-0 text-[8px] text-content-secondary">
                      {att.type.split('/')[1]?.toUpperCase().slice(0, 3) || 'FILE'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-content-primary truncate">{att.name}</p>
                  </div>
                  <button
                    onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    className="shrink-0 p-0.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 transition-opacity"
                    aria-label="移除"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Textarea */}
          <div className="px-4 pt-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="输入消息..."
              disabled={isLoading}
              rows={1}
              className={cn(
                'w-full resize-none bg-transparent text-sm',
                'text-content-primary',
                'placeholder:text-content-muted',
                'focus:outline-none disabled:opacity-50',
                'min-h-[24px] max-h-[200px]'
              )}
            />
          </div>

          {/* Bottom controls row */}
          <div className="flex items-center justify-between px-3 pb-2 pt-1.5">
            {/* Left: attachment + deep think toggle */}
            <div className="flex items-center gap-1">
              <FileUpload
                attachments={attachments}
                onAttachmentsChange={setAttachments}
                disabled={isLoading}
              />
              <button
                onClick={() => onDeepThinkChange(!deepThink)}
                className={cn(
                  'h-7 px-2.5 rounded-full text-[11px] font-medium transition-colors',
                  deepThink
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-surface-muted hover:bg-surface-subtle text-content-secondary'
                )}
                title="深度思考"
                aria-label="深度思考"
                aria-pressed={deepThink}
              >
                深度思考
              </button>
            </div>

            {/* Right: model selector + send button */}
            <div className="flex items-center gap-1">
              <ModelSelector
                models={models}
                selectedModel={selectedModel}
                onModelChange={onModelChange}
                compact
              />
              {isLoading ? (
                <button
                  onClick={onStop}
                  className={cn(
                    'h-7 w-7 flex items-center justify-center rounded-full transition-colors shrink-0',
                    'bg-accent text-accent-foreground hover:bg-accent-hover'
                  )}
                  aria-label="停止生成"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim() && attachments.length === 0}
                  className={cn(
                    'h-7 w-7 flex items-center justify-center rounded-full transition-colors shrink-0',
                    (input.trim() || attachments.length > 0)
                      ? 'bg-accent text-accent-foreground hover:bg-accent-hover'
                      : 'bg-surface-muted text-content-muted cursor-not-allowed'
                  )}
                  aria-label="发送消息"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}