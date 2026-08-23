'use client'

import { useEffect, useState, useCallback } from 'react'
import { Save, Trash2, Loader2, CheckCircle, AlertCircle, Key, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

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

const PROVIDER_ICONS: Record<string, string> = {
  openai: '🤖',
  anthropic: '🧠',
  deepseek: '🔍',
  qianwen: '☁️',
  wenxin: '💬',
}

export default function SettingsPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [keys, setKeys] = useState<KeyInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [draftKeys, setDraftKeys] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [testing, setTesting] = useState<Record<string, boolean>>({})
  const [testResult, setTestResult] = useState<Record<string, 'success' | 'error'>>({})
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
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
  }, [])

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
      if (!res.ok) throw new Error('保存失败')
      setDraftKeys((d) => ({ ...d, [providerId]: '' }))
      setMessage({ type: 'success', text: `${providerId} API Key 已保存` })
      // Refresh keys
      const newKeys = await fetch('/api/keys').then((r) => r.json())
      setKeys(newKeys)
    } catch {
      setMessage({ type: 'error', text: '保存失败，请重试' })
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
      // Simple test: try to list models from the provider using a minimal call
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/"
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="返回"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">设置</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              管理你的 AI 服务 API 密钥
            </p>
          </div>
        </div>

        {/* Toast message */}
        {message && (
          <div
            className={cn(
              'mb-6 px-4 py-3 rounded-xl text-sm flex items-center gap-2',
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
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
        <div className="space-y-4">
          {providers.map((provider) => {
            const existingKey = getKeyForProvider(provider.id)
            const draft = draftKeys[provider.id] ?? ''
            const isSaving = saving[provider.id] ?? false
            const isTesting = testing[provider.id] ?? false
            const result = testResult[provider.id]

            return (
              <div
                key={provider.id}
                className={cn(
                  'rounded-2xl border bg-white dark:bg-gray-800',
                  'border-gray-200 dark:border-gray-700',
                  'shadow-sm p-5 space-y-4'
                )}
              >
                {/* Provider header */}
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{PROVIDER_ICONS[provider.id] ?? '🔑'}</span>
                  <div className="flex-1">
                    <h2 className="font-semibold text-gray-900 dark:text-white text-base">
                      {provider.name}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      模型: {provider.models.join(', ')}
                    </p>
                  </div>
                  {existingKey && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                      已配置
                    </span>
                  )}
                </div>

                {/* Current key display */}
                {existingKey && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
                    <Key className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-sm font-mono text-gray-600 dark:text-gray-300 flex-1">
                      {existingKey.maskedKey}
                    </span>
                  </div>
                )}

                {/* Input */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="password"
                    value={draft}
                    onChange={(e) =>
                      setDraftKeys((d) => ({ ...d, [provider.id]: e.target.value }))
                    }
                    placeholder={existingKey ? '输入新 Key 以替换...' : '输入 API Key...'}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-sm',
                      'border-gray-200 dark:border-gray-600',
                      'bg-white dark:bg-gray-700',
                      'text-gray-900 dark:text-gray-100',
                      'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500'
                    )}
                  />
                  <button
                    onClick={() => handleSave(provider.id)}
                    disabled={!draft.trim() || isSaving}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5',
                      draft.trim() && !isSaving
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    )}
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    保存
                  </button>
                </div>

                {/* Actions */}
                {existingKey && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleDelete(provider.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      删除 Key
                    </button>
                    <button
                      onClick={() => handleTest(provider.id)}
                      disabled={isTesting}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors',
                        'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                      )}
                    >
                      {isTesting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : result === 'success' ? (
                        <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      ) : result === 'error' ? (
                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                      ) : (
                        <span className="w-3.5 h-3.5 flex items-center justify-center">⚡</span>
                      )}
                      测试连接
                    </button>
                    {result && (
                      <span
                        className={cn(
                          'text-xs',
                          result === 'success' ? 'text-green-500' : 'text-red-500'
                        )}
                      >
                        {result === 'success' ? '连接成功' : '连接失败'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Help text */}
        <div className="mt-8 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
          <p className="text-sm text-blue-700 dark:text-blue-400 font-medium mb-1">
            如何获取 API Key？
          </p>
          <ul className="text-xs text-blue-600 dark:text-blue-500 space-y-1 list-disc list-inside">
            <li>OpenAI: platform.openai.com/api-keys</li>
            <li>Anthropic: console.anthropic.com</li>
            <li>DeepSeek: platform.deepseek.com</li>
            <li>通义千问: dashscope.aliyun.com</li>
            <li>文心一言: cloud.baidu.com/product/qianfan</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
