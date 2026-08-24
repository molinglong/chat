/**
 * 自定义模型公共逻辑模块
 * - 构建 ModelDefinition 供 UI 使用
 * - 解析 API Key（独立 key / 复用已有 provider key）
 * - 创建 OpenAI 兼容的 provider 实例
 */

import { createOpenAI } from "@ai-sdk/openai"
import { prisma } from "@/lib/db"
import { encrypt, decrypt } from "@/lib/crypto"
import { providers } from "./registry"
import type { ModelDefinition } from "./types"

// 数据库行类型
export interface CustomModelRow {
  id: string
  userId: string
  name: string
  modelId: string
  baseURL: string
  apiKey?: string | null // encrypted
  keyProvider?: string | null
  contextWindow: number
  supportsVision: boolean
  supportsFiles: boolean
  supportsReasoning: boolean
}

// 从 DB 行构建 ModelDefinition（用于 ModelSelector）
export function buildCustomModelDefinition(cm: CustomModelRow): ModelDefinition {
  return {
    id: `custom:${cm.id}`,
    name: cm.name,
    provider: "custom",
    contextWindow: cm.contextWindow,
    supportsVision: cm.supportsVision,
    supportsFiles: cm.supportsFiles,
    supportsReasoning: cm.supportsReasoning,
  }
}

// 解析 API key（返回明文）
// 优先级：独立 apiKey > keyProvider 对应已配置 key > undefined(某些本地服务无需鉴权)
export async function resolveApiKey(userId: string, cm: CustomModelRow): Promise<string | undefined> {
  if (cm.apiKey) {
    try {
      return decrypt(cm.apiKey)
    } catch (err) {
      console.error("[custom-model] Failed to decrypt own apiKey:", err)
    }
  }
  if (cm.keyProvider) {
    const rec = await prisma.apiKey.findFirst({
      where: { userId, provider: cm.keyProvider },
    })
    if (rec) {
      try {
        return decrypt(rec.encryptedKey)
      } catch (err) {
        console.error(`[custom-model] Failed to decrypt ${cm.keyProvider} key:`, err)
      }
    }
  }
  return undefined // 免鉴权模式，本地 Ollama/LM Studio 等常用密钥 "local"
}

// 创建自定义模型的 provider 实例
// 复用服务商 Key 且未填 Base URL → 直接用该服务商原生实例（支持任意该服务商模型 ID）
// 其余情况 → OpenAI 兼容协议实例（需要 Base URL）
export function createCustomProviderInstance(cm: CustomModelRow, apiKey: string | undefined) {
  const baseURL = cm.baseURL && cm.baseURL.trim() !== "" ? cm.baseURL : undefined

  if (!baseURL && cm.keyProvider) {
    const builtin = providers[cm.keyProvider]
    if (builtin) {
      const key = apiKey && apiKey.trim() !== "" ? apiKey : "local"
      return builtin.createProvider(key)
    }
  }

  const opts: Parameters<typeof createOpenAI>[0] = {}
  if (apiKey && apiKey.trim() !== "") {
    opts.apiKey = apiKey
  } else {
    // 很多本地服务需要 apiKey 参数但不真正验证
    opts.apiKey = "local"
  }
  if (baseURL) {
    opts.baseURL = baseURL
  }
  return createOpenAI(opts)
}

// 测试连接（仅调用生成文本，不持久化）
export async function testCustomModelConnection(
  userId: string,
  cm: CustomModelRow
): Promise<{ ok: boolean; error?: string }> {
  try {
    const apiKey = await resolveApiKey(userId, cm)
    const provider = createCustomProviderInstance(cm, apiKey)
    const result = await import("ai").then((ai) =>
      ai.generateText({
        model: provider(cm.modelId),
        prompt: "ping",
        maxOutputTokens: 8,
      })
    )
    // AI SDK v7 returns 'response' not 'responseId'
    if (result.response || result.text) {
      return { ok: true }
    }
    return { ok: false, error: "服务器无响应" }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误"
    return { ok: false, error: msg }
  }
}
