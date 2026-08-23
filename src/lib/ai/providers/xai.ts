import { createOpenAI } from "@ai-sdk/openai"
import { ProviderDefinition } from "../types"

export const xaiProvider: ProviderDefinition = {
  id: "xai",
  name: "xAI Grok",
  models: [
    // Grok 3 系列
    { id: "grok-3", name: "Grok 3", provider: "xai", contextWindow: 131072, supportsVision: false, supportsFiles: false },
    { id: "grok-3-mini", name: "Grok 3 Mini", provider: "xai", contextWindow: 131072, supportsVision: false, supportsFiles: false },
    // Grok 2 系列
    { id: "grok-2-1212", name: "Grok 2", provider: "xai", contextWindow: 131072, supportsVision: false, supportsFiles: false },
    { id: "grok-2-vision-1212", name: "Grok 2 Vision", provider: "xai", contextWindow: 32768, supportsVision: true, supportsFiles: false },
    // Grok Beta
    { id: "grok-beta", name: "Grok Beta", provider: "xai", contextWindow: 131072, supportsVision: false, supportsFiles: false },
    { id: "grok-vision-beta", name: "Grok Vision Beta", provider: "xai", contextWindow: 32768, supportsVision: true, supportsFiles: false },
  ],
  createProvider: (apiKey: string) => createOpenAI({
    apiKey,
    baseURL: "https://api.x.ai/v1"
  }),
}
