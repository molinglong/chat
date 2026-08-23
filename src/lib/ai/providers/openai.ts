import { createOpenAI } from "@ai-sdk/openai"
import { ProviderDefinition } from "../types"

export const openaiProvider: ProviderDefinition = {
  id: "openai",
  name: "OpenAI",
  models: [
    { id: "gpt-4o", name: "GPT-4o", provider: "openai", contextWindow: 128000, supportsVision: true, supportsFiles: true },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", contextWindow: 128000, supportsVision: true, supportsFiles: false },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "openai", contextWindow: 128000, supportsVision: true, supportsFiles: false },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "openai", contextWindow: 16385, supportsVision: false, supportsFiles: false },
  ],
  createProvider: (apiKey: string) => createOpenAI({ apiKey }),
}
