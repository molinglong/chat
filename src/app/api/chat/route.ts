import { NextRequest } from "next/server"
import { streamText, type ModelMessage } from "ai"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { decrypt } from "@/lib/crypto"
import { createProviderInstance, getModel } from "@/lib/ai/registry"

export const maxDuration = 60 // seconds – Vercel Pro allows up to 300

interface ChatRequestBody {
  model: string
  messages: any[]
  conversationId?: string
}

/**
 * Convert incoming UIMessage format (from @ai-sdk/react useChat) to ModelMessage format
 * that streamText expects. UIMessages use `parts` array; ModelMessages use `content`.
 */
function convertToModelMessages(messages: any[]): ModelMessage[] {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant" || m.role === "system")
    .map((m) => {
      // If message already has string content, use it directly
      if (typeof m.content === "string" && m.content) {
        return { role: m.role, content: m.content } as ModelMessage
      }
      // If content is a valid array of content parts, use it
      if (Array.isArray(m.content) && m.content.length > 0) {
        return { role: m.role, content: m.content } as ModelMessage
      }
      // AI SDK v7 UIMessage format: extract text from `parts`
      if (Array.isArray(m.parts)) {
        const textParts = m.parts
          .filter((p: any) => p.type === "text")
          .map((p: any) => p.text)
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
function extractTextContent(msg: any): string {
  if (typeof msg.content === "string" && msg.content) return msg.content
  if (Array.isArray(msg.content)) {
    return msg.content.filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n")
  }
  if (Array.isArray(msg.parts)) {
    return msg.parts.filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n")
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

  const body: ChatRequestBody = await req.json()
  const { model: modelId, messages: rawMessages, conversationId } = body

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
        userId: session.user.id,
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

  // Extract text from the last user message for persistence
  const lastRawUserMsg = [...rawMessages].reverse().find((m) => m.role === "user")
  const userContent = lastRawUserMsg ? extractTextContent(lastRawUserMsg) : ""

  // Ensure a conversation exists
  let convId = conversationId
  let isNewConversation = false
  if (!convId) {
    const conv = await prisma.conversation.create({
      data: {
        userId: session.user.id,
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
    model: provider(modelId),
    messages,
    onFinish: async ({ text }) => {
      // Ensure content is always a non-null string (Prisma schema requires String, not String?)
      const content = text ?? ""
      try {
        // Persist assistant response
        await prisma.message.create({
          data: {
            conversationId: convId!,
            role: "assistant",
            content,
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
  })
}
