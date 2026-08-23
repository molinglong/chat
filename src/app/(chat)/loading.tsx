function SkeletonMessage({ isUser }: { isUser: boolean }) {
  return (
    <div className={`flex gap-3 py-4 px-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar skeleton */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
      {/* Content skeleton */}
      <div className={`flex-1 min-w-0 flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl animate-pulse ${
            isUser
              ? 'bg-blue-200 dark:bg-blue-900/40 w-48 h-12 rounded-tr-md'
              : 'bg-gray-200 dark:bg-gray-700 w-72 h-20 rounded-tl-md'
          }`}
        />
      </div>
    </div>
  )
}

export default function ChatLoading() {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Model selector skeleton */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-800">
        <div className="w-32 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-3xl mx-auto">
          <SkeletonMessage isUser={false} />
          <SkeletonMessage isUser={true} />
          <SkeletonMessage isUser={false} />
          <SkeletonMessage isUser={true} />
        </div>
      </div>

      {/* Input skeleton */}
      <div className="px-4 pb-4 pt-2">
        <div className="max-w-3xl mx-auto">
          <div className="h-14 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
