'use client'

import { Menu } from 'lucide-react'
import { useChatStore } from '@/store/chat-store'

export function ChatHeader() {
  const { toggleSidebar } = useChatStore()

  return (
    <header className="flex items-center gap-3 h-10 px-4 shrink-0">
      <button
        onClick={toggleSidebar}
        className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 lg:hidden transition-colors"
        aria-label="切换侧边栏"
      >
        <Menu className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
      </button>
      <div className="flex-1" />
    </header>
  )
}
