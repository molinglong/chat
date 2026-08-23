'use client'

import { useEffect, useState, useCallback } from 'react'
import { Save, Trash2, Loader2, CheckCircle, AlertCircle, Key, Eye, EyeOff, ChevronDown, Zap } from 'lucide-react'
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

const PROVIDER_META: Record<string, { color: string; dot: string; url: string }> = {
  openai: { color: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', url: 'https://platform.openai.com/api-keys' },
  anthropic: { color: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500', url: 'https://console.anthropic.com' },
  deepseek: { color: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500', url: 'https://platform.deepseek.com' },
  qianwen: { color: 'text-purple-600 dark:text-purple-400', dot: 'bg-purple-500', url: 'https://dashscope.aliyun.com' },
  wenxin: { color: 'text-red-600 dark:text-red-400', dot: 'bg-red-500', url: 'https://cloud.baidu.com/product/qianfan' },
  google: { color: 'text-sky-600 dark:text-sky-400', dot: 'bg-sky-500', url: 'https://aistudio.google.com/apikey' },
  mistral: { color: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500', url: 'https://console.mistral.ai/api-keys' },
  xai: { color: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-600', url: 'https://console.x.ai/' },
  groq: { color: 'text-violet-600 dark:text-violet-400', dot: 'bg-violet-500', url: 'https://console.groq.com/keys' },
  moonshot: { color: 'text-indigo-600 dark:text-indigo-400', dot: 'bg-indigo-500', url: 'https://platform.moonshot.cn/console/api-keys' },
  zhipu: { color: 'text-cyan-600 dark:text-cyan-400', dot: 'bg-cyan-500', url: 'https://open.bigmodel.cn/console/apikey/index' },
  doubao: { color: 'text-teal-600 dark:text-teal-400', dot: 'bg-teal-500', url: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey' },
  yi: { color: 'text-fuchsia-600 dark:text-fuchsia-400', dot: 'bg-fuchsia-500', url: 'https://platform.lingyiwanwu.com/apikeys' },
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

  const configuredProviders = providers.filter((p) => getKeyForProvider(p.id))
  const unconfiguredProviders = providers.filter((p) => !getKeyForProvider(p.id))

  const renderProviderCard = (provider: ProviderInfo) => {
    const existingKey = getKeyForProvider(provider.id)
    const draft = draftKeys[provider.id] ?? ''
    const isSaving = saving[provider.id] ?? false
    const isTesting = testing[provider.id] ?? false
    const result = testResult[provider.id]
    const meta = PROVIDER_META[provider.id]
    const isPasswordVisible = showPassword[provider.id] ?? false

    return (
      <div
        key={provider.id}
        className={cn(
          'rounded-xl border p-3 space-y-2.5 transition-all',
          'border-zinc-200/60 dark:border-zinc-800/60',
          'bg-white/60 dark:bg-zinc-900/40',
          'hover:border-zinc-300 dark:hover:border-zinc-700'
        )}
      >
        {/* Provider header */}
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full shrink-0', meta?.dot ?? 'bg-zinc-500')} />
          <h3 className={cn('font-semibold text-sm flex-1 min-w-0 truncate', meta?.color ?? 'text-zinc-900 dark:text-white')}>
            {provider.name}
          </h3>
          {/* Model tags */}
          <div className="flex flex-wrap gap-1 justify-end">
            {provider.models.map((model) => (
              <span
                key={model}
                className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-mono"
              >
                {model}
              </span>
            ))}
          </div>
        </div>

        {/* Current key display */}
        {existingKey && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800/60">
            <Key className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="text-xs font-mono text-zinc-600 dark:text-zinc-300 flex-1 truncate">
              {existingKey.maskedKey}
            </span>
          </div>
        )}

        {/* Input with password toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={isPasswordVisible ? 'text' : 'password'}
              value={draft}
              onChange={(e) => setDraftKeys((d) => ({ ...d, [provider.id]: e.target.value }))}
              placeholder={existingKey ? '输入新 Key 替换...' : '输入 API Key...'}
              className={cn(
                'w-full rounded-lg border px-2.5 py-1.5 pr-8 text-xs',
                'border-zinc-200/60 dark:border-zinc-700',
                'bg-white/80 dark:bg-zinc-800/80',
                'text-zinc-900 dark:text-zinc-100',
                'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
                'focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-400 dark:focus:border-zinc-600'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => ({ ...s, [provider.id]: !s[provider.id] }))}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              tabIndex={-1}
            >
              {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button
            onClick={() => handleSave(provider.id)}
            disabled={!draft.trim() || isSaving}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0',
              draft.trim() && !isSaving
                ? 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
            )}
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            保存
          </button>
        </div>

        {/* Actions for configured providers */}
        {existingKey && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleTest(provider.id)}
              disabled={isTesting}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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
              测试
            </button>
            {result && (
              <span className={cn('text-xs', result === 'success' ? 'text-green-500' : 'text-red-500')}>
                {result === 'success' ? '成功' : '失败'}
              </span>
            )}
            <div className="flex-1" />
            <button
              onClick={() => handleDelete(provider.id)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-red-500/80 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              删除
            </button>
          </div>
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

      {/* Modal card - glassmorphism */}
      <div className="relative w-full max-w-2xl max-h-[80vh] flex flex-col rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl shadow-2xl">
        {/* Modal header */}
        <div className="relative px-4 pt-3 pb-3 border-b border-zinc-200/60 dark:border-zinc-800/60 shrink-0">
          <button
            onClick={() => setSettingsOpen(false)}
            className="absolute top-3 left-4 w-3.5 h-3.5 rounded-full bg-red-500 hover:bg-red-600 transition-colors group flex items-center justify-center"
            aria-label="关闭"
          >
            <svg className="w-2 h-2 text-red-950 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="text-center">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">设置</h2>
          </div>
        </div>

        {/* Modal body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
          ) : (
            <>
              {/* Toast message */}
              {message && (
                <div
                  className={cn(
                    'mb-4 px-3 py-2 rounded-lg text-xs flex items-center gap-2',
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

              {/* Configured section */}
              {configuredProviders.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">已配置</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">{configuredProviders.length}</span>
                  </div>
                  <div className="space-y-2">
                    {configuredProviders.map(renderProviderCard)}
                  </div>
                </div>
              )}

              {/* Unconfigured section */}
              {unconfiguredProviders.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">待配置</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">{unconfiguredProviders.length}</span>
                  </div>
                  <div className="space-y-2">
                    {unconfiguredProviders.map(renderProviderCard)}
                  </div>
                </div>
              )}

              {/* Collapsible help */}
              <button
                onClick={() => setHelpExpanded(!helpExpanded)}
                className="flex items-center gap-1.5 mt-4 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              >
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', helpExpanded && 'rotate-180')} />
                如何获取 API Key？
              </button>
              {helpExpanded && (
                <div className="mt-2 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60">
                  <ul className="text-[11px] space-y-1.5">
                    {providers.map((provider) => {
                      const meta = PROVIDER_META[provider.id]
                      if (!meta) return null
                      return (
                        <li key={provider.id} className="flex items-center gap-2">
                          <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', meta.dot)} />
                          <span className="text-zinc-600 dark:text-zinc-400 shrink-0">{provider.name}:</span>
                          <a href={meta.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">
                            {meta.url.replace('https://', '')}
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

        {/* Footer */}
        <div className="px-4 py-2 border-t border-zinc-200/60 dark:border-zinc-800/60 shrink-0 flex items-center justify-between">
          <span className="text-[10px] text-zinc-400">共 {providers.length} 个服务商</span>
          <kbd className="text-[10px] text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 font-mono">ESC</kbd>
        </div>
      </div>
    </div>
  )
}
