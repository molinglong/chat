'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import { AlertCircle, RefreshCw, Settings as SettingsIcon } from 'lucide-react'
import Link from 'next/link'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { useChatStore } from '@/store/chat-store'
import type { ModelDefinition } from '@/lib/ai/types'
import type { Attachment } from './FileUpload'

const MODEL_STORAGE_KEY = 'chat:selectedModel'

interface ChatPanelProps {
  conversationId?: string
  conversationTitle?: string
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

  // Fallback: show the real error from the provider so users can see the cause
  // (e.g. quota exhausted, invalid model, auth failure, etc.)
  const cleaned = msg.replace(/^AI_APICallError:\s*/i, '').trim()
  return { message: cleaned || '发生错误，请重试', type: 'general' }
}

export function ChatPanel({
  conversationId: initialConversationId,
  initialMessages,
  initialModel,
  allModels,
  conversationTitle,
}: ChatPanelProps) {
  const [currentModel, setCurrentModel] = useState(initialModel)
  const [conversationId, setConversationId] = useState(initialConversationId)

  // On mount, for new chats, load the last selected model from localStorage
  useEffect(() => {
    if (!initialConversationId) {
      const saved = localStorage.getItem(MODEL_STORAGE_KEY)
      if (saved && allModels.some((m) => m.id === saved)) {
        setCurrentModel(saved)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const conversationIdRef = useRef(initialConversationId)
  const attachmentsRef = useRef<Attachment[] | undefined>(undefined)
  const { setCurrentConversationId, setConversationTitle } = useChatStore()

  // Notify store of current conversation (triggers Sidebar to refresh conversation list)
  useEffect(() => {
    setCurrentConversationId(initialConversationId ?? null)
    setConversationTitle(conversationTitle ?? null)
  }, [initialConversationId, conversationTitle, setCurrentConversationId, setConversationTitle])

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
      const newConvTitle = response.headers.get('X-Conversation-Title')
      if (newConvId && newConvId !== conversationIdRef.current) {
        conversationIdRef.current = newConvId
        setConversationId(newConvId)
        setCurrentConversationId(newConvId) // Notify Sidebar to refresh
        if (newConvTitle) {
          setConversationTitle(decodeURIComponent(newConvTitle))
        }
        // Update URL without full navigation
        window.history.replaceState(null, '', `/chat/c/${newConvId}`)
      }
      return response
    },
  })

  const { messages, sendMessage, setMessages, stop, status, error, clearError, regenerate } = useChat<UIMessage>({
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
    // Persist to localStorage for new chats to pick up
    localStorage.setItem(MODEL_STORAGE_KEY, modelId)
    // Persist to DB for existing conversations
    const convId = conversationIdRef.current
    if (convId) {
      fetch(`/api/conversations/${convId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId }),
      }).catch((err) => console.error('Failed to persist model:', err))
    }
  }, [])

  const handleRetry = useCallback(() => {
    clearError()
    regenerate()
  }, [clearError, regenerate])

  const handleRegenerate = useCallback(() => {
    clearError()
    regenerate()
  }, [clearError, regenerate])

  const handleEditMessage = useCallback(
    async (messageId: string, newText: string) => {
      // Delete the old message and all subsequent messages from the DB
      const convId = conversationIdRef.current
      if (convId) {
        try {
          await fetch(
            `/api/conversations/${convId}/messages?messageId=${messageId}`,
            { method: 'DELETE' }
          )
        } catch (err) {
          console.error('Failed to delete old messages:', err)
        }
      }

      // Truncate local messages to before the edited message
      const editIndex = messages.findIndex((m) => m.id === messageId)
      if (editIndex === -1) return
      const truncated = messages.slice(0, editIndex)
      setMessages(truncated)

      // Send the edited text as a new message
      sendMessage({ text: newText })
    },
    [messages, setMessages, sendMessage]
  )

  const errorInfo = error ? getErrorMessage(error) : null

  return (
    <div className="flex flex-col h-full relative overflow-hidden">

      {/* Error banner */}
      {error && errorInfo && (
        <div className="mx-4 mt-3 mb-0 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
              {errorInfo.message}
            </p>
            {process.env.NODE_ENV === 'development' && error.message && (
              <p className="mt-1 text-xs text-red-400/70 dark:text-red-400/60 font-mono truncate">
                {error.message}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900
                  hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                重试
              </button>
              {errorInfo.type === 'api_key' && (
                <Link
                  href="/chat/settings"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300
                    hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/50"
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <MessageList
          messages={messages}
          isStreaming={isLoading}
          className="min-h-full"
          onRegenerate={handleRegenerate}
          onEditMessage={handleEditMessage}
        />
      </div>

      {/* Input area - fixed at bottom */}
      <ChatInput
        onSend={handleSend}
        onStop={handleStop}
        isLoading={isLoading}
        models={allModels}
        selectedModel={currentModel}
        onModelChange={handleModelChange}
      />
    </div>
  )
}
