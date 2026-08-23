'use client'

import { useEffect, useState, useCallback } from 'react'
import { Save, Trash2, Loader2, CheckCircle, AlertCircle, Key, Eye, EyeOff, ChevronDown, Zap, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/store/chat-store'

interface ProviderInfo {
  id: string
  name: string
  models: string[]
}

interface KeyInfo {
  id: string
  provider: string
  maskedKey: string
  updatedAt: string
}

const PROVIDER_URL: Record<string, string> = {
  openai: 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com',
  deepseek: 'https://platform.deepseek.com',
  qianwen: 'https://dashscope.aliyun.com',
  wenxin: 'https://cloud.baidu.com/product/qianfan',
  google: 'https://aistudio.google.com/apikey',
  mistral: 'https://console.mistral.ai/api-keys',
  xai: 'https://console.x.ai/',
  groq: 'https://console.groq.com/keys',
  moonshot: 'https://platform.moonshot.cn/console/api-keys',
  zhipu: 'https://open.bigmodel.cn/console/apikey/index',
  doubao: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey',
  yi: 'https://platform.lingyiwanwu.com/apikeys',
}

export function SettingsModal() {
  const { settingsOpen, setSettingsOpen } = useChatStore()
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [keys, setKeys] = useState<KeyInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [draftKeys, setDraftKeys] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [testing, setTesting] = useState<Record<string, boolean>>({})
  const [testResult, setTestResult] = useState<Record<string, 'success' | 'error'>>({})
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({})
  const [helpExpanded, setHelpExpanded] = useState(false)

  // Fetch data when modal opens
  useEffect(() => {
    if (!settingsOpen) return
    setLoading(true)
    Promise.all([
      fetch('/api/providers').then((r) => r.json()),
      fetch('/api/keys').then((r) => r.json()),
    ])
      .then(([provs, keyList]) => {
        setProviders(provs)
        setKeys(keyList)
      })
      .catch(() => setMessage({ type: 'error', text: '加载数据失败' }))
      .finally(() => setLoading(false))
  }, [settingsOpen])

  // Close on Escape
  useEffect(() => {
    if (!settingsOpen) return
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setSettingsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [settingsOpen, setSettingsOpen])

  const getKeyForProvider = useCallback(
    (providerId: string) => keys.find((k) => k.provider === providerId),
    [keys]
  )

  async function handleSave(providerId: string) {
    const value = draftKeys[providerId]?.trim()
    if (!value) return
    setSaving((s) => ({ ...s, [providerId]: true }))
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId, apiKey: value }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '保存失败')
      }
      setDraftKeys((d) => ({ ...d, [providerId]: '' }))
      setMessage({ type: 'success', text: `${providerId} API Key 已保存` })
      const newKeys = await fetch('/api/keys').then((r) => r.json())
      setKeys(newKeys)
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || '保存失败，请重试' })
    } finally {
      setSaving((s) => ({ ...s, [providerId]: false }))
    }
  }

  async function handleDelete(providerId: string) {
    if (!confirm(`确定要删除 ${providerId} 的 API Key 吗？`)) return
    try {
      const res = await fetch('/api/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId }),
      })
      if (!res.ok) throw new Error('删除失败')
      setKeys((prev) => prev.filter((k) => k.provider !== providerId))
      setMessage({ type: 'success', text: `${providerId} API Key 已删除` })
    } catch {
      setMessage({ type: 'error', text: '删除失败，请重试' })
    }
  }

  async function handleTest(providerId: string) {
    setTesting((t) => ({ ...t, [providerId]: true }))
    setTestResult((r) => {
      const next = { ...r }
      delete next[providerId]
      return next
    })
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: providers.find((p) => p.id === providerId)?.models[0] ?? '',
          messages: [{ role: 'user', content: 'Hi' }],
          testOnly: true,
        }),
      })
      if (res.ok || res.status === 200) {
        setTestResult((r) => ({ ...r, [providerId]: 'success' }))
      } else {
        setTestResult((r) => ({ ...r, [providerId]: 'error' }))
      }
    } catch {
      setTestResult((r) => ({ ...r, [providerId]: 'error' }))
    } finally {
      setTesting((t) => ({ ...t, [providerId]: false }))
    }
  }

  if (!settingsOpen) return null

  const renderProviderCard = (provider: ProviderInfo) => {
    const existingKey = getKeyForProvider(provider.id)
    const draft = draftKeys[provider.id] ?? ''
    const isSaving = saving[provider.id] ?? false
    const isTesting = testing[provider.id] ?? false
    const result = testResult[provider.id]
    const isPasswordVisible = showPassword[provider.id] ?? false
    const url = PROVIDER_URL[provider.id]

    return (
      <div
        key={provider.id}
        className={cn(
          'rounded-xl border px-3.5 py-3 space-y-2.5 transition-colors',
          'border-zinc-200/60 dark:border-zinc-800/60',
          'bg-white/60 dark:bg-zinc-900/40',
          existingKey && 'bg-zinc-50/80 dark:bg-zinc-900/60'
        )}
      >
        {/* Header: dot + name + status badge */}
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'w-2 h-2 rounded-full shrink-0',
            existingKey ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-600'
          )} />
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 flex-1 truncate">
            {provider.name}
          </span>
          {existingKey ? (
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium shrink-0">
              已配置
            </span>
          ) : (
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 shrink-0">
              {provider.models.length} 个模型
            </span>
          )}
        </div>

        {/* Saved key display + actions */}
        {existingKey && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-200/40 dark:border-zinc-700/40">
              <Key className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <code className="text-xs text-zinc-600 dark:text-zinc-300 truncate">
                {existingKey.maskedKey}
              </code>
            </div>
            <button
              onClick={() => handleTest(provider.id)}
              disabled={isTesting}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
            >
              {isTesting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : result === 'success' ? (
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              ) : result === 'error' ? (
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">测试</span>
            </button>
            <button
              onClick={() => handleDelete(provider.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-500/70 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">删除</span>
            </button>
          </div>
        )}

        {/* Input row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={isPasswordVisible ? 'text' : 'password'}
              value={draft}
              onChange={(e) => setDraftKeys((d) => ({ ...d, [provider.id]: e.target.value }))}
              placeholder={existingKey ? '输入新 Key 替换...' : '粘贴 API Key...'}
              className={cn(
                'w-full rounded-lg border px-2.5 py-1.5 pr-8 text-xs',
                'border-zinc-200/60 dark:border-zinc-700/60',
                'bg-white dark:bg-zinc-800/60',
                'text-zinc-900 dark:text-zinc-100',
                'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
                'focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10',
                'focus:border-zinc-400 dark:focus:border-zinc-600'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => ({ ...s, [provider.id]: !s[provider.id] }))}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              tabIndex={-1}
            >
              {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button
            onClick={() => handleSave(provider.id)}
            disabled={!draft.trim() || isSaving}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shrink-0',
              draft.trim() && !isSaving
                ? 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-[0.97]'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
            )}
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            保存
          </button>
        </div>

        {/* Get key link */}
        {url && !existingKey && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            获取 Key
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={() => setSettingsOpen(false)}
      />

      {/* Modal card */}
      <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl shadow-2xl">
        {/* Header with macOS red dot */}
        <div className="relative flex items-center px-4 pt-3 pb-2.5 border-b border-zinc-200/60 dark:border-zinc-800/60 shrink-0">
          <button
            onClick={() => setSettingsOpen(false)}
            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors group flex items-center justify-center shrink-0 mr-3"
            aria-label="关闭"
          >
            <svg className="w-1.5 h-1.5 text-red-950 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">设置</h2>
          <kbd className="ml-auto text-[10px] text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 font-mono">ESC</kbd>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
            </div>
          ) : (
            <>
              {/* Toast message */}
              {message && (
                <div
                  className={cn(
                    'mb-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2',
                    message.type === 'success'
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200/60 dark:border-green-800/60'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200/60 dark:border-red-800/60'
                  )}
                >
                  {message.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  {message.text}
                </div>
              )}

              {/* Provider cards */}
              <div className="space-y-2">
                {providers.map(renderProviderCard)}
              </div>

              {/* Help section */}
              <button
                onClick={() => setHelpExpanded(!helpExpanded)}
                className="flex items-center gap-1.5 mt-4 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              >
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', helpExpanded && 'rotate-180')} />
                如何获取 API Key？
              </button>
              {helpExpanded && (
                <div className="mt-2 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60">
                  <ul className="text-[11px] space-y-1.5">
                    {providers.map((provider) => {
                      const url = PROVIDER_URL[provider.id]
                      if (!url) return null
                      return (
                        <li key={provider.id} className="flex items-center gap-2">
                          <span className="text-zinc-500 dark:text-zinc-400 shrink-0 min-w-[5rem]">{provider.name}</span>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate">
                            {url.replace('https://', '')}
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
