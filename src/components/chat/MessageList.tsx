'use client'

import { useRef, useEffect } from 'react'
import { MessageSquare } from 'lucide-react'
import { MessageBubble } from './MessageBubble'
import type { UIMessage } from 'ai'

interface MessageListProps {
  messages: UIMessage[]
  isStreaming: boolean
  className?: string
}

export function MessageList({ messages, isStreaming, className }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change or during streaming
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Also scroll during streaming (more frequent updates)
  useEffect(() => {
    if (!isStreaming) return
    const interval = setInterval(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 300)
    return () => clearInterval(interval)
  }, [isStreaming])

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              开始新对话
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              选择一个模型，输入你的问题，开始与 AI 对话。
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={className}>
      <div className="max-w-3xl mx-auto">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isStreaming={isStreaming}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
