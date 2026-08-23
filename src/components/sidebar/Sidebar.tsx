'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Settings, X } from 'lucide-react'
import { useChatStore } from '@/store/chat-store'
import { cn } from '@/lib/utils'
import { ConversationItem } from './ConversationItem'
import { ThemeToggle } from '../ThemeToggle'

interface ConversationData {
  id: string
  title: string
  updatedAt: string
}

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen, currentConversationId, setSettingsOpen } = useChatStore()
  const [conversations, setConversations] = useState<ConversationData[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations')
      if (res.ok) {
        const data = await res.json()
        setConversations(data)
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Re-fetch when a conversation is created or switched
  useEffect(() => {
    fetchConversations()
  }, [currentConversationId, fetchConversations])

  async function handleNewConversation() {
    router.push('/chat')
    setSidebarOpen(false)
  }

  async function handleDeleteConversation(id: string) {
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id))
        router.push('/chat')
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err)
    }
  }

  async function handleRenameConversation(id: string, newTitle: string) {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      })
      if (res.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
        )
      }
    } catch (err) {
      console.error('Failed to rename conversation:', err)
    }
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-1.5 bottom-1.5 left-1.5 z-50 w-56 flex flex-col',
          'bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-xl text-zinc-900 dark:text-zinc-100',
          'rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden',
          'transition-transform duration-300 ease-in-out',
          'lg:static lg:z-auto lg:inset-auto lg:translate-x-0 lg:m-1.5',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
          <h1 className="text-base font-semibold tracking-tight">八号产房</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 lg:hidden transition-colors"
            aria-label="关闭侧边栏"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* New Conversation Button */}
        <div className="px-2 pt-1.5">
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center justify-start gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900
              hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            新对话
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-1.5 pt-2">
          <nav className="space-y-0.5">
            {loading ? (
              <div className="px-3 py-6 text-center text-zinc-400 text-xs">
                加载中...
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-3 py-6 text-center text-zinc-400 text-xs">
                暂无对话记录
              </div>
            ) : (
              conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  id={conv.id}
                  title={conv.title}
                  onDelete={handleDeleteConversation}
                  onRename={handleRenameConversation}
                />
              ))
            )}
          </nav>
        </div>

        {/* Footer */}
        <div className="px-2 pt-1 pb-2 flex items-center gap-1">
          <button
            onClick={() => { setSettingsOpen(true); setSidebarOpen(false) }}
            className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            设置
          </button>
          <ThemeToggle />
        </div>
      </aside>
    </>
  )
}
