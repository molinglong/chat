'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConversationItemProps {
  id: string
  title: string
  onDelete?: (id: string) => void
}

export function ConversationItem({ id, title, onDelete }: ConversationItemProps) {
  const pathname = usePathname()
  const isActive = pathname === `/c/${id}`

  return (
    <Link
      href={`/c/${id}`}
      className={cn(
        'group flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
        'hover:bg-gray-700/50',
        isActive
          ? 'bg-gray-700/70 text-white'
          : 'text-gray-300 hover:text-white'
      )}
    >
      <MessageSquare className="w-4 h-4 shrink-0 opacity-60" />
      <span className="flex-1 truncate">{title}</span>
      {onDelete && (
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete(id)
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-600/20 hover:text-red-400 transition-opacity"
          aria-label="删除对话"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </Link>
  )
}
