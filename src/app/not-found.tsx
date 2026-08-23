import Link from 'next/link'
import { Home, MessageSquare } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <p className="text-7xl sm:text-8xl font-bold text-gray-200 dark:text-gray-800 select-none">
            404
          </p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            页面不存在
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            你访问的页面不存在或已被移除。
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
          >
            <Home className="w-4 h-4" />
            返回首页
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50"
          >
            <MessageSquare className="w-4 h-4" />
            新对话
          </Link>
        </div>
      </div>
    </div>
  )
}
