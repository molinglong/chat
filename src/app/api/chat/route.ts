import { NextRequest } from "next/server"
import {
  streamText,
  wrapLanguageModel,
  extractReasoningMiddleware,
  toUIMessageStream,
  createUIMessageStreamResponse,
  type ModelMessage,
  type UIMessageChunk,
} from "ai"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { decrypt } from "@/lib/crypto"
import { createProviderInstance, getModel } from "@/lib/ai/registry"
import { buildMemorySystemPrompt, getRelevantMemories, extractAndSaveMemories } from "@/lib/memory"
import { generateImage, extractImagePrompts, IMG_MARKER_REGEX } from "@/lib/ai/image"

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

const IMG_PREFIX = "[IMG:"
const IMG_PLACEHOLDER = "\n\n> 🎨 正在生成图片…\n\n"

/**
 * 过滤流式输出中的 [IMG:...] 标记(跨 chunk 安全),替换为占位提示。
 * 最终正文在 onFinish 中统一替换为真实图片后入库,
 * 客户端收到 finish 事件时会拉取库中最终内容覆盖显示。
 */
function createImgMarkerFilterStream(): TransformStream<UIMessageChunk, UIMessageChunk> {
  let pending = ""

  // 计算 buf 末尾与 IMG_PREFIX 前缀的最长重叠长度(标记可能被 chunk 截断)
  const longestPrefixAtEnd = (s: string): number => {
    for (let len = IMG_PREFIX.length; len > 0; len--) {
      if (s.endsWith(IMG_PREFIX.slice(0, len))) return len
    }
    return 0
  }

  return new TransformStream<UIMessageChunk, UIMessageChunk>({
    transform(chunk, controller) {
      if (chunk.type !== "text-delta") {
        controller.enqueue(chunk)
        return
      }
      let buf = pending + chunk.delta
      pending = ""

      // 逐个替换完整的 [IMG:...] 标记;未闭合的标记挂起等待后续 chunk
      while (true) {
        const startIdx = buf.indexOf(IMG_PREFIX)
        if (startIdx === -1) {
          const hold = longestPrefixAtEnd(buf)
          if (hold > 0) {
            pending = buf.slice(buf.length - hold)
            buf = buf.slice(0, buf.length - hold)
          }
          break
        }
        const endIdx = buf.indexOf("]", startIdx)
        if (endIdx === -1) {
          pending = buf.slice(startIdx)
          buf = buf.slice(0, startIdx)
          break
        }
        buf = buf.slice(0, startIdx) + IMG_PLACEHOLDER + buf.slice(endIdx + 1)
      }

      if (buf) {
        controller.enqueue({ type: "text-delta", id: chunk.id, delta: buf })
      }
    },
    flush() {
      // 流结束时仍有未闭合标记(模型输出被截断),直接丢弃;
      // 最终入库内容在 onFinish 中会同样清理残留标记。
    },
  })
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

  // Visualization capabilities — tell the model to auto-use diagrams/charts
  systemParts.push([
    '## Visualization Capabilities',
    '',
    'You can automatically generate visual content using code blocks. Use them PROACTIVELY without waiting for the user to ask — whenever a diagram, chart, or formula would make your answer clearer.',
    '',
    '### Mermaid Diagrams',
    'Use ```mermaid for flowcharts, sequence diagrams, architecture diagrams, state machines, and any process that benefits from visualization.',
    '',
    'Example:',
    '```mermaid',
    'sequenceDiagram',
    '    Alice->>Bob: Hello',
    '    Bob-->>Alice: Hi!',
    '```',
    '',
    '### Data Charts',
    'Use ```chart for bar charts, line charts, pie charts, and area charts. The JSON format:',
    '```chart',
    '{',
    '  "type": "bar|line|pie|area",',
    '  "data": {',
    '    "labels": ["A", "B", "C"],',
    '    "datasets": [{"label": "Series", "data": [10, 20, 15]}]',
    '  },',
    '  "title": "Chart Title"',
    '}',
    '```',
    '',
    '### Math Formulas',
    'Use $...$ for inline math and $$...$$ for block formulas. Support full LaTeX syntax.',
    '',
    '**Important**: Always proactively use these visualizations when they help explain the answer. For example, when comparing data, automatically include a chart. When explaining a process, automatically include a mermaid diagram. When discussing math, always use LaTeX notation.',
  ].join('\n'))

  // Image generation — tell the model how to request images
  systemParts.push([
    '## Image Generation',
    '',
    'You can generate images. When the user asks to see or generate an image (e.g. "XX长什么样", "画一只猫", "来张配图", "generate a picture of..."), place this marker EXACTLY where the image should appear (usually at the end of your answer, on its own line):',
    '',
    '[IMG:detailed image description]',
    '',
    '- Write the description in the same language as the user. Include subject, style, composition and lighting.',
    '- At most 2 images per reply, and only when the user clearly wants an image or a visual.',
    '- Never use it for charts or diagrams — use mermaid/chart code blocks for those.',
    '- Do not output anything else inside the brackets.',
  ].join('\n'))

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
      let content = text ?? ""

      // 检测 [IMG:...] 标记并调用通义万相生成图片(使用百炼/千问的 Key)
      const imagePrompts = extractImagePrompts(content)
      if (imagePrompts.length > 0) {
        const dashKeyRecord = await prisma.apiKey.findUnique({
          where: { userId_provider: { userId, provider: "qianwen" } },
        })
        if (dashKeyRecord) {
          const dashKey = decrypt(dashKeyRecord.encryptedKey)
          const replacements: string[] = []
          for (const prompt of imagePrompts) {
            try {
              const localUrl = await generateImage(prompt, dashKey)
              replacements.push(`![${prompt}](${localUrl})`)
            } catch (err) {
              const reason = err instanceof Error ? err.message : "未知原因"
              console.error("[chat] Image generation failed:", reason)
              replacements.push(`> ⚠️ 图片生成失败:${reason.replace(/\s+/g, " ")}`)
            }
          }
          let idx = 0
          content = content.replace(IMG_MARKER_REGEX, () => replacements[idx++])
        } else {
          // 未配置通义千问(百炼)Key,静默移除标记
          content = content.replace(IMG_MARKER_REGEX, "")
        }
      }
      // 移除模型输出被截断时残留的未闭合标记(避免原始标记入库)
      content = content.replace(/\[IMG:[^\]]*$/g, "")

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

  // 手动构建 UI 消息流:过滤掉 [IMG:...] 标记再发给客户端
  const uiStream = toUIMessageStream({
    stream: result.stream,
    sendReasoning: true,
    sendStart: true,
    sendFinish: true,
  })

  return createUIMessageStreamResponse({
    headers: responseHeaders,
    stream: uiStream.pipeThrough(createImgMarkerFilterStream()),
  })
}
