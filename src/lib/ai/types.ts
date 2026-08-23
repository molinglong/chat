export interface ModelDefinition {
  id: string           // e.g. "gpt-4o"
  name: string         // 显示名 e.g. "GPT-4o"
  provider: string     // provider key e.g. "openai"
  contextWindow: number
  supportsVision: boolean
  supportsFiles: boolean
}

export interface ProviderDefinition {
  id: string           // e.g. "openai"
  name: string         // 显示名 e.g. "OpenAI"
  models: ModelDefinition[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createProvider: (apiKey: string) => any  // 返回 AI SDK provider 实例
}
