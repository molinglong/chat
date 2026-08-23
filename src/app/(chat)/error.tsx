'use client'

import { AlertTriangle, RefreshCw, MessageSquare } from 'lucide-react'

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex items-center justify-center h-full bg-white dark:bg-gray-900 px-4">
      <div className="max-w-sm w-full text-center space-y-5">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-500 dark:text-red-400" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            聊天加载失败
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            无法加载对话内容，请尝试重新加载或返回新建对话。
          </p>
          {process.env.NODE_ENV === 'development' && error.message && (
            <p className="mt-2 text-xs text-red-500 dark:text-red-400 font-mono">
              {error.message}
            </p>
          )}
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
          >
            <RefreshCw className="w-4 h-4" />
            重试
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50"
          >
            <MessageSquare className="w-4 h-4" />
            新对话
          </a>
        </div>
      </div>
    </div>
  )
}
