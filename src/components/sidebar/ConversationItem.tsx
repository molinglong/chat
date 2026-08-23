'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Trash2, Pencil, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConversationItemProps {
  id: string
  title: string
  onDelete?: (id: string) => void
  onRename?: (id: string, newTitle: string) => void
}

export function ConversationItem({ id, title, onDelete, onRename }: ConversationItemProps) {
  const pathname = usePathname()
  const isActive = pathname === `/chat/c/${id}`
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus and select all text when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Reset edit value when title changes externally
  useEffect(() => {
    setEditValue(title)
  }, [title])

  function startEditing(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setEditValue(title)
    setIsEditing(true)
  }

  function cancelEditing() {
    setEditValue(title)
    setIsEditing(false)
  }

  function commitRename() {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== title && onRename) {
      onRename(id, trimmed)
    } else {
      setEditValue(title)
    }
    setIsEditing(false)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitRename()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEditing()
    }
  }

  // Edit mode: inline input
  if (isEditing) {
    return (
      <div className="flex items-center gap-1 px-1 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/70">
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitRename}
          className="flex-1 min-w-0 bg-transparent text-sm text-zinc-900 dark:text-zinc-50 outline-none px-1.5 py-1"
          placeholder="对话标题"
          maxLength={200}
        />
        <button
          onMouseDown={(e) => { e.preventDefault(); commitRename() }}
          className="p-0.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 text-green-500 transition-colors"
          aria-label="确认"
        >
          <Check className="w-3 h-3" />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); cancelEditing() }}
          className="p-0.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 text-red-500 transition-colors"
          aria-label="取消"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    )
  }

  // Normal mode: link with title + action buttons
  return (
    <Link
      href={`/chat/c/${id}`}
      className={cn(
        'group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors',
        isActive
          ? 'bg-zinc-200/70 dark:bg-zinc-800/70 text-zinc-900 dark:text-zinc-50 font-medium'
          : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 hover:text-zinc-800 dark:hover:text-zinc-200'
      )}
    >
      <span className="flex-1 truncate">{title}</span>
      {onRename && (
        <button
          onClick={startEditing}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-700 hover:text-zinc-600 dark:hover:text-zinc-300 transition-opacity"
          aria-label="重命名"
        >
          <Pencil className="w-3 h-3" />
        </button>
      )}
      {onDelete && (
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete(id)
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-700 hover:text-red-500 dark:hover:text-red-400 transition-opacity"
          aria-label="删除对话"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </Link>
  )
}
