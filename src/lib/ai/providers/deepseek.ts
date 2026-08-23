import { createOpenAI } from "@ai-sdk/openai"
import { ProviderDefinition } from "../types"

export const deepseekProvider: ProviderDefinition = {
  id: "deepseek",
  name: "DeepSeek",
  models: [
    { id: "deepseek-chat", name: "DeepSeek-V3", provider: "deepseek", contextWindow: 128000, supportsVision: false, supportsFiles: false },
    { id: "deepseek-reasoner", name: "DeepSeek-R1", provider: "deepseek", contextWindow: 128000, supportsVision: false, supportsFiles: false },
    { id: "deepseek-coder", name: "DeepSeek Coder V2", provider: "deepseek", contextWindow: 128000, supportsVision: false, supportsFiles: false },
  ],
  createProvider: (apiKey: string) => createOpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com"
  }),
}
