'use client'

import { User, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarkdownRenderer } from './MarkdownRenderer'
import type { UIMessage } from 'ai'

interface MessageBubbleProps {
  message: UIMessage
  isStreaming?: boolean
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  // Extract text from message parts
  const textParts = message.parts.filter((p) => p.type === 'text')
  const text = textParts.map((p) => (p as { text: string }).text).join('')
  const lastPart = textParts[textParts.length - 1] as { state?: string } | undefined
  const isCurrentlyStreaming = isStreaming && isAssistant && lastPart?.state === 'streaming'

  return (
    <div
      className={cn(
        'flex gap-3 py-4 px-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message content */}
      <div
        className={cn(
          'flex-1 min-w-0 max-w-[90%] lg:max-w-[85%]',
          isUser ? 'flex flex-col items-end' : 'flex flex-col items-start'
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 max-w-full',
            isUser
              ? 'bg-blue-600 text-white rounded-tr-md'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-md'
          )}
        >
          {isAssistant ? (
            text ? (
              <div className="relative">
                <MarkdownRenderer content={text} />
                {isCurrentlyStreaming && (
                  <span className="inline-block w-2 h-4 ml-0.5 bg-gray-600 dark:bg-gray-400 animate-pulse align-middle" />
                )}
              </div>
            ) : isCurrentlyStreaming ? (
              <div className="flex items-center gap-1.5 py-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            ) : null
          ) : (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{text}</p>
          )}
        </div>
      </div>
    </div>
  )
}
