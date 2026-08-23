'use client'

import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            出现了一些问题
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            应用遇到了意外错误，请尝试重新加载页面。
          </p>
          {process.env.NODE_ENV === 'development' && error.message && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300">
                查看错误详情
              </summary>
              <pre className="mt-2 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-red-600 dark:text-red-400 overflow-x-auto whitespace-pre-wrap">
                {error.message}
                {error.digest && `\nDigest: ${error.digest}`}
              </pre>
            </details>
          )}
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/50"
          >
            <RefreshCw className="w-4 h-4" />
            重试
          </button>
          <a
            href="/chat"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/50"
          >
            <Home className="w-4 h-4" />
            返回首页
          </a>
        </div>
      </div>
    </div>
  )
}
