import { ProviderDefinition, ModelDefinition } from "./types"
import { openaiProvider } from "./providers/openai"
import { anthropicProvider } from "./providers/anthropic"
import { deepseekProvider } from "./providers/deepseek"
import { qianwenProvider } from "./providers/qianwen"
import { wenxinProvider } from "./providers/wenxin"

// All registered providers
export const providers: Record<string, ProviderDefinition> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  deepseek: deepseekProvider,
  qianwen: qianwenProvider,
  wenxin: wenxinProvider,
}

// Get all available models across all providers
export function getAllModels(): ModelDefinition[] {
  return Object.values(providers).flatMap(p => p.models)
}

// Get a specific model definition
export function getModel(modelId: string): ModelDefinition | undefined {
  return getAllModels().find(m => m.id === modelId)
}

// Get the provider for a given model
export function getProviderForModel(modelId: string): ProviderDefinition | undefined {
  const model = getModel(modelId)
  if (!model) return undefined
  return providers[model.provider]
}

// Create an AI SDK provider instance for a given model with the user's API key
export function createProviderInstance(modelId: string, apiKey: string) {
  const provider = getProviderForModel(modelId)
  if (!provider) throw new Error(`Unknown model: ${modelId}`)
  return provider.createProvider(apiKey)
}
