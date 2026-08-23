'use client'

import { useState, useCallback, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import { AlertCircle, RefreshCw, Settings as SettingsIcon } from 'lucide-react'
import Link from 'next/link'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { ModelSelector } from './ModelSelector'
import type { ModelDefinition } from '@/lib/ai/types'
import type { Attachment } from './FileUpload'

interface ChatPanelProps {
  conversationId?: string
  initialMessages: UIMessage[]
  initialModel: string
  allModels: ModelDefinition[]
}

function getErrorMessage(error: Error): { message: string; type: 'api_key' | 'rate_limit' | 'network' | 'general' } {
  const msg = error.message || ''

  // API Key missing
  if (msg.includes('No API key') || msg.includes('API key') || msg.includes('api key')) {
    // Try to extract provider name
    const match = msg.match(/for\s+(\w+)/i)
    const provider = match?.[1] || ''
    return {
      message: provider
        ? `请先在设置中配置 ${provider} 的 API Key`
        : '请先在设置中配置对应提供商的 API Key',
      type: 'api_key',
    }
  }

  // Rate limit
  if (msg.includes('rate') || msg.includes('429') || msg.includes('too many') || msg.includes('Too many')) {
    return { message: '请求过于频繁，请稍后再试', type: 'rate_limit' }
  }

  // Network errors
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ECONNREFUSED')) {
    return { message: '网络连接失败，请检查网络后重试', type: 'network' }
  }

  return { message: '发生错误，请重试', type: 'general' }
}

export function ChatPanel({
  conversationId: initialConversationId,
  initialMessages,
  initialModel,
  allModels,
}: ChatPanelProps) {
  const [currentModel, setCurrentModel] = useState(initialModel)
  const [conversationId, setConversationId] = useState(initialConversationId)
  const conversationIdRef = useRef(initialConversationId)
  const attachmentsRef = useRef<Attachment[] | undefined>(undefined)

  // Keep ref in sync
  conversationIdRef.current = conversationId

  // Create transport with current model and conversationId
  const transport = new DefaultChatTransport<UIMessage>({
    api: '/api/chat',
    body: {
      model: currentModel,
      conversationId: conversationId,
      // Attachments are read from ref at send time
      get attachments() {
        return attachmentsRef.current
      },
    },
    // Intercept response to capture conversation ID from header
    fetch: async (url, options) => {
      const response = await fetch(url, options)
      const newConvId = response.headers.get('X-Conversation-Id')
      if (newConvId && newConvId !== conversationIdRef.current) {
        conversationIdRef.current = newConvId
        setConversationId(newConvId)
        // Update URL without full navigation
        window.history.replaceState(null, '', `/c/${newConvId}`)
      }
      return response
    },
  })

  const { messages, sendMessage, stop, status, error, clearError, regenerate } = useChat<UIMessage>({
    transport,
    messages: initialMessages,
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  const handleSend = useCallback(
    (text: string, attachments?: Attachment[]) => {
      attachmentsRef.current = attachments
      sendMessage({ text })
      // Clear after send so it's not included in subsequent messages
      attachmentsRef.current = undefined
    },
    [sendMessage]
  )

  const handleStop = useCallback(() => {
    stop()
  }, [stop])

  const handleModelChange = useCallback((modelId: string) => {
    setCurrentModel(modelId)
  }, [])

  const handleRetry = useCallback(() => {
    clearError()
    regenerate()
  }, [clearError, regenerate])

  const errorInfo = error ? getErrorMessage(error) : null

  return (
    <div className="flex flex-col h-full">
      {/* Model selector bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <ModelSelector
          models={allModels}
          selectedModel={currentModel}
          onModelChange={handleModelChange}
        />
      </div>

      {/* Error banner */}
      {error && errorInfo && (
        <div className="mx-4 mt-3 mb-0 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-red-700 dark:text-red-400 font-medium">
              {errorInfo.message}
            </p>
            {process.env.NODE_ENV === 'development' && error.message && (
              <p className="mt-1 text-xs text-red-500/70 dark:text-red-400/60 font-mono truncate">
                {error.message}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400
                  hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                重试
              </button>
              {errorInfo.type === 'api_key' && (
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400
                    hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                >
                  <SettingsIcon className="w-3.5 h-3.5" />
                  前往设置
                </Link>
              )}
            </div>
          </div>
          <button
            onClick={() => clearError()}
            className="shrink-0 p-1 rounded-md text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            aria-label="关闭错误提示"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <MessageList
          messages={messages}
          isStreaming={isLoading}
          className="h-full"
        />
      </div>

      {/* Input area - fixed at bottom */}
      <ChatInput
        onSend={handleSend}
        onStop={handleStop}
        isLoading={isLoading}
      />
    </div>
  )
}
