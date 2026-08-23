'use client'

import { useState, useRef, useCallback, useEffect, KeyboardEvent, ChangeEvent } from 'react'
import { Send, Square, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FileUpload, type Attachment } from './FileUpload'

export interface ChatInputProps {
  onSend: (text: string, attachments?: Attachment[]) => void
  onStop: () => void
  isLoading: boolean
  className?: string
}

export function ChatInput({ onSend, onStop, isLoading, className }: ChatInputProps) {
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
    <div className={cn('px-3 sm:px-4 pb-6 lg:pb-4 pt-2', className)}>
      <div className="max-w-3xl mx-auto">
        <div
          className={cn(
            'relative flex flex-col rounded-2xl border',
            'border-gray-300 dark:border-gray-600',
            'bg-white dark:bg-gray-800',
            'shadow-sm focus-within:border-blue-500 dark:focus-within:border-blue-400',
            'focus-within:ring-2 focus-within:ring-blue-500/20',
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
                    'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700',
                    'px-2 py-1.5 max-w-[200px]'
                  )}
                >
                  {att.type.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={att.url} alt={att.name} className="w-6 h-6 rounded object-cover shrink-0" />
                  ) : (
                    <div className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-600 flex items-center justify-center shrink-0 text-[9px] text-gray-500 dark:text-gray-400">
                      {att.type.split('/')[1]?.toUpperCase().slice(0, 3) || 'FILE'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{att.name}</p>
                  </div>
                  <button
                    onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    className="shrink-0 p-0.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 transition-opacity"
                    aria-label="移除"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Shift+Enter 换行)"
              disabled={isLoading}
              rows={1}
              className={cn(
                'flex-1 resize-none bg-transparent px-4 py-3 text-sm',
                'text-gray-900 dark:text-gray-100',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'focus:outline-none disabled:opacity-50',
                'min-h-[44px] max-h-[200px]'
              )}
            />

            <div className="flex items-center pr-2 pb-2 gap-0.5">
              <FileUpload
                attachments={attachments}
                onAttachmentsChange={setAttachments}
                disabled={isLoading}
              />

              {isLoading ? (
                <button
                  onClick={onStop}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    'bg-red-500 hover:bg-red-600 text-white',
                    'shrink-0'
                  )}
                  aria-label="停止生成"
                >
                  <Square className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim() && attachments.length === 0}
                  className={cn(
                    'p-2 rounded-lg transition-colors shrink-0',
                    (input.trim() || attachments.length > 0)
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  )}
                  aria-label="发送消息"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 mt-2">
          AI 可能会产生错误信息，请注意甄别。
        </p>
      </div>
    </div>
  )
}
