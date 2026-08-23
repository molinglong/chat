'use client'

import { Menu, Settings as SettingsIcon, Plus } from 'lucide-react'
import Link from 'next/link'
import { useChatStore } from '@/store/chat-store'
import { useEffect, useState } from 'react'
import { ThemeToggle } from './ThemeToggle'

export function TopBar() {
  const { toggleSidebar, setSettingsOpen, conversationTitle } = useChatStore()
  const [title, setTitle] = useState(conversationTitle)

  // Update local state when store changes
  useEffect(() => {
    setTitle(conversationTitle)
  }, [conversationTitle])

  return (
    <header className="relative flex items-center justify-between h-9 px-2 shrink-0 m-1.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-xl overflow-hidden">
      {/* Left: sidebar toggle (mobile) + new chat */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 lg:hidden transition-colors"
          aria-label="切换侧边栏"
        >
          <Menu className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
        </button>
        <Link
          href="/chat"
          className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          aria-label="新对话"
        >
          <Plus className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
        </Link>
      </div>

      {/* Center: title */}
      <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {title || "新对话"}
        </span>
      </div>

      {/* Right: theme toggle + settings */}
      <div className="flex items-center gap-0.5">
        <ThemeToggle className="p-1.5 rounded-lg" />
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          aria-label="设置"
        >
          <SettingsIcon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
        </button>
      </div>
    </header>
  )
}
