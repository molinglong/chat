import { createAnthropic } from "@ai-sdk/anthropic"
import { ProviderDefinition } from "../types"

export const anthropicProvider: ProviderDefinition = {
  id: "anthropic",
  name: "Anthropic",
  models: [
    { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", provider: "anthropic", contextWindow: 200000, supportsVision: true, supportsFiles: true },
    { id: "claude-3-opus-20240229", name: "Claude 3 Opus", provider: "anthropic", contextWindow: 200000, supportsVision: true, supportsFiles: true },
    { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", provider: "anthropic", contextWindow: 200000, supportsVision: true, supportsFiles: false },
  ],
  createProvider: (apiKey: string) => createAnthropic({ apiKey }),
}
