import { createOpenAI } from "@ai-sdk/openai"
import { ProviderDefinition } from "../types"

export const deepseekProvider: ProviderDefinition = {
  id: "deepseek",
  name: "DeepSeek",
  models: [
    { id: "deepseek-chat", name: "DeepSeek-V2", provider: "deepseek", contextWindow: 128000, supportsVision: false, supportsFiles: false },
    { id: "deepseek-coder", name: "DeepSeek Coder", provider: "deepseek", contextWindow: 128000, supportsVision: false, supportsFiles: false },
  ],
  createProvider: (apiKey: string) => createOpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com"
  }),
}
