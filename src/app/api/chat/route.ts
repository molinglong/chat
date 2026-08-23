import { NextRequest } from "next/server"
import { streamText, wrapLanguageModel, extractReasoningMiddleware, type ModelMessage } from "ai"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { decrypt } from "@/lib/crypto"
import { createProviderInstance, getModel } from "@/lib/ai/registry"
import { buildMemorySystemPrompt, getRelevantMemories, extractAndSaveMemories } from "@/lib/memory"

export const maxDuration = 60 // seconds – Vercel Pro allows up to 300

interface ChatRequestBody {
  model: string
  messages: IncomingMessage[]
  conversationId?: string
  deepThink?: boolean
}

/** 客户端传入的消息（UIMessage 格式的结构化子集） */
interface IncomingPart {
  type: string
  text?: string
}

interface IncomingMessage {
  role: string
  content?: string | IncomingPart[]
  parts?: IncomingPart[]
  text?: string
}

/**
 * Convert incoming UIMessage format (from @ai-sdk/react useChat) to ModelMessage format
 * that streamText expects. UIMessages use `parts` array; ModelMessages use `content`.
 */
function convertToModelMessages(messages: IncomingMessage[]): ModelMessage[] {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant" || m.role === "system")
    .map((m) => {
      // If message already has string content, use it directly
      if (typeof m.content === "string" && m.content) {
        return { role: m.role, content: m.content } as ModelMessage
      }
      // If content is a valid array of content parts, use it
      if (Array.isArray(m.content) && m.content.length > 0) {
        return { role: m.role, content: m.content } as unknown as ModelMessage
      }
      // AI SDK v7 UIMessage format: extract text from `parts`
      if (Array.isArray(m.parts)) {
        const textParts = m.parts
          .filter((p: IncomingPart) => p.type === "text")
          .map((p: IncomingPart) => p.text ?? "")
          .join("")
        if (textParts) {
          return { role: m.role, content: textParts } as ModelMessage
        }
      }
      // Fallback: use content or empty string
      return { role: m.role, content: String(m.content ?? m.text ?? "") } as ModelMessage
    })
    .filter((m) => m.content !== "")
}

/** Extract plain text from a message (UIMessage or CoreMessage) */
function extractTextContent(msg: IncomingMessage): string {
  if (typeof msg.content === "string" && msg.content) return msg.content
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter((p: IncomingPart) => p.type === "text")
      .map((p: IncomingPart) => p.text ?? "")
      .join("\n")
  }
  if (Array.isArray(msg.parts)) {
    return msg.parts
      .filter((p: IncomingPart) => p.type === "text")
      .map((p: IncomingPart) => p.text ?? "")
      .join("\n")
  }
  return String(msg.content ?? msg.text ?? "")
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }
  const userId = session.user.id

  const body: ChatRequestBody = await req.json()
  const { model: modelId, messages: rawMessages, conversationId, deepThink } = body

  // Validate model
  const modelDef = getModel(modelId)
  if (!modelDef) {
    return new Response(JSON.stringify({ error: `Unknown model: ${modelId}` }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Fetch and decrypt the user's API key for this provider
  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: modelDef.provider,
      },
    },
  })

  if (!apiKeyRecord) {
    return new Response(
      JSON.stringify({ error: `No API key configured for ${modelDef.provider}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  const apiKey = decrypt(apiKeyRecord.encryptedKey)
  const provider = createProviderInstance(modelId, apiKey)

  // Convert incoming messages to ModelMessage format for streamText
  const messages = convertToModelMessages(rawMessages)

  // Extract text from the last user message for persistence & memory relevance
  const lastRawUserMsg = [...rawMessages].reverse().find((m) => m.role === "user")
  const userContent = lastRawUserMsg ? extractTextContent(lastRawUserMsg) : ""

  // Load the user's long-term memories (if the feature is enabled)
  const memorySettings = await prisma.user.findUnique({
    where: { id: userId },
    select: { memoryEnabled: true },
  })
  const memoryEnabled = memorySettings?.memoryEnabled ?? true

  let memorySystemPrompt = ""
  if (memoryEnabled) {
    const memories = await prisma.memory.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    })
    if (memories.length > 0) {
      const relevant = getRelevantMemories(memories, userContent || "")
      memorySystemPrompt = buildMemorySystemPrompt(relevant)
    }
  }

  // Deep thinking: for non-reasoning models, add a system prompt and extract thinking via middleware
  let model = provider(modelId)
  const systemParts: string[] = []
  if (memorySystemPrompt) systemParts.push(memorySystemPrompt)
  if (deepThink && !modelDef.supportsReasoning) {
    systemParts.push('You are a thoughtful AI assistant. Before answering, think step by step about the question inside <think> tags. After your thinking process, provide your final answer outside the tags.')
    model = wrapLanguageModel({
      model,
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    })
  }
  const system = systemParts.length > 0 ? systemParts.join('\n\n') : undefined

  // Ensure a conversation exists
  let convId = conversationId
  let isNewConversation = false
  if (!convId) {
    const conv = await prisma.conversation.create({
      data: {
        userId,
        title: userContent.slice(0, 40) || "新对话",
        model: modelId,
      },
    })
    convId = conv.id
    isNewConversation = true
  }

  // Persist the last user message before streaming
  if (userContent) {
    await prisma.message.create({
      data: {
        conversationId: convId,
        role: "user",
        content: userContent,
      },
    })
  }

  // Stream the response
  const result = streamText({
    model,
    messages,
    ...(system ? { system } : {}),
    onFinish: async ({ text, reasoningText }) => {
      // Ensure content is always a non-null string (Prisma schema requires String, not String?)
      const content = text ?? ""
      try {
        // Persist assistant response (with reasoning if available)
        await prisma.message.create({
          data: {
            conversationId: convId!,
            role: "assistant",
            content,
            reasoning: reasoningText ?? null,
          },
        })
        // Update conversation: timestamp + auto-generate title on first message
        const titleUpdate = isNewConversation
          ? { title: userContent.slice(0, 30) || "新对话" }
          : {}
        await prisma.conversation.update({
          where: { id: convId! },
          data: { updatedAt: new Date(), ...titleUpdate },
        })
        // Extract long-term memories in the background (never blocks the chat)
        if (memoryEnabled && content) {
          extractAndSaveMemories({
            userId,
            model: provider(modelId),
            userText: userContent,
            assistantText: content,
          })
        }
      } catch (error) {
        // AI SDK's notify() silently swallows errors from onFinish callbacks,
        // so we must catch and log them ourselves to avoid silent data loss.
        console.error("[chat] Failed to persist assistant message:", error)
      }
    },
  })

  const responseHeaders: Record<string, string> = { "X-Conversation-Id": convId }
  if (isNewConversation) {
    const title = userContent.slice(0, 30) || "新对话"
    responseHeaders["X-Conversation-Title"] = encodeURIComponent(title)
  }

  return result.toUIMessageStreamResponse({
    headers: responseHeaders,
    sendReasoning: true,
  })
}
