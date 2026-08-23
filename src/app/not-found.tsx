import Link from 'next/link'
import { Home, MessageSquare } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <p className="text-7xl sm:text-8xl font-bold text-zinc-200 dark:text-zinc-800 select-none">
            404
          </p>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            页面不存在
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            你访问的页面不存在或已被移除。
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/50"
          >
            <Home className="w-4 h-4" />
            返回首页
          </Link>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/50"
          >
            <MessageSquare className="w-4 h-4" />
            新对话
          </Link>
        </div>
      </div>
    </div>
  )
}
