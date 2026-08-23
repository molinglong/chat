import { createOpenAI } from "@ai-sdk/openai"
import { ProviderDefinition } from "../types"

export const wenxinProvider: ProviderDefinition = {
  id: "wenxin",
  name: "文心一言",
  models: [
    { id: "ernie-4.0-8k", name: "ERNIE 4.0", provider: "wenxin", contextWindow: 8000, supportsVision: false, supportsFiles: false },
    { id: "ernie-3.5-8k", name: "ERNIE 3.5", provider: "wenxin", contextWindow: 8000, supportsVision: false, supportsFiles: false },
  ],
  createProvider: (apiKey: string) => createOpenAI({
    apiKey,
    baseURL: "https://qianfan.baidubce.com/v2"
  }),
}
