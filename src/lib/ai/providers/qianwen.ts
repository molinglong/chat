import { createOpenAI } from "@ai-sdk/openai"
import { ProviderDefinition } from "../types"

export const qianwenProvider: ProviderDefinition = {
  id: "qianwen",
  name: "通义千问",
  models: [
    { id: "qwen-max", name: "Qwen Max", provider: "qianwen", contextWindow: 32000, supportsVision: false, supportsFiles: false },
    { id: "qwen-plus", name: "Qwen Plus", provider: "qianwen", contextWindow: 131072, supportsVision: false, supportsFiles: false },
    { id: "qwen-turbo", name: "Qwen Turbo", provider: "qianwen", contextWindow: 131072, supportsVision: false, supportsFiles: false },
    { id: "qwen-vl-max", name: "Qwen VL Max", provider: "qianwen", contextWindow: 32000, supportsVision: true, supportsFiles: false },
  ],
  createProvider: (apiKey: string) => createOpenAI({
    apiKey,
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
  }),
}
