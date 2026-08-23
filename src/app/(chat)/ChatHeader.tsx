'use client'

import { Menu } from 'lucide-react'
import { useChatStore } from '@/store/chat-store'

export function ChatHeader() {
  const { toggleSidebar } = useChatStore()

  return (
    <header className="flex items-center gap-3 h-14 px-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden transition-colors"
        aria-label="切换侧边栏"
      >
        <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>
      <div className="flex-1" />
    </header>
  )
}
