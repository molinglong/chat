'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Settings, X } from 'lucide-react'
import Link from 'next/link'
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
  const { sidebarOpen, setSidebarOpen } = useChatStore()
  const [conversations, setConversations] = useState<ConversationData[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchConversations()
  }, [])

  async function fetchConversations() {
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
  }

  async function handleNewConversation() {
    router.push('/')
    setSidebarOpen(false)
  }

  async function handleDeleteConversation(id: string) {
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id))
        router.push('/')
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err)
    }
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 flex flex-col',
          'bg-gray-900 dark:bg-gray-950 text-white',
          'transition-transform duration-300 ease-in-out',
          'lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
          <h1 className="text-lg font-semibold tracking-tight">八号产房</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-gray-700/50 lg:hidden transition-colors"
            aria-label="关闭侧边栏"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Conversation Button */}
        <div className="p-3">
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
              bg-white/10 hover:bg-white/15 active:bg-white/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新对话
          </button>
        </div>

        {/* Conversation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {loading ? (
            <div className="px-3 py-6 text-center text-gray-500 text-sm">
              加载中...
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-3 py-6 text-center text-gray-500 text-sm">
              暂无对话记录
            </div>
          ) : (
            conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                id={conv.id}
                title={conv.title}
                onDelete={handleDeleteConversation}
              />
            ))
          )}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-700/50 flex items-center gap-1">
          <Link
            href="/settings"
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <Settings className="w-4 h-4" />
            设置
          </Link>
          <ThemeToggle />
        </div>
      </aside>
    </>
  )
}
