'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ModelDefinition } from '@/lib/ai/types'

interface ModelSelectorProps {
  models: ModelDefinition[]
  selectedModel: string
  onModelChange: (modelId: string) => void
  className?: string
}

export function ModelSelector({
  models,
  selectedModel,
  onModelChange,
  className,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Group models by provider
  const grouped = models.reduce<Record<string, { providerName: string; models: ModelDefinition[] }>>(
    (acc, model) => {
      if (!acc[model.provider]) {
        // Derive display name from provider id
        const nameMap: Record<string, string> = {
          openai: 'OpenAI',
          anthropic: 'Anthropic',
          deepseek: 'DeepSeek',
          qianwen: '通义千问',
          wenxin: '文心一言',
        }
        acc[model.provider] = {
          providerName: nameMap[model.provider] || model.provider,
          models: [],
        }
      }
      acc[model.provider].models.push(model)
      return acc
    },
    {}
  )

  const selected = models.find((m) => m.id === selectedModel)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium',
          'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700',
          'text-gray-700 dark:text-gray-300 transition-colors',
          'border border-gray-200 dark:border-gray-700'
        )}
      >
        <Bot className="w-4 h-4" />
        <span className="max-w-[160px] truncate">{selected?.name || selectedModel}</span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute top-full left-0 mt-1.5 z-50',
            'min-w-[220px] max-h-[320px] overflow-y-auto',
            'bg-white dark:bg-gray-800 rounded-lg shadow-lg',
            'border border-gray-200 dark:border-gray-700',
            'py-1.5'
          )}
        >
          {Object.entries(grouped).map(([providerId, { providerName, models: providerModels }]) => (
            <div key={providerId}>
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {providerName}
              </div>
              {providerModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    onModelChange(model.id)
                    setIsOpen(false)
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm transition-colors',
                    'hover:bg-gray-100 dark:hover:bg-gray-700',
                    model.id === selectedModel
                      ? 'text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/20'
                      : 'text-gray-700 dark:text-gray-300'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span>{model.name}</span>
                    {model.supportsVision && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
                        Vision
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
