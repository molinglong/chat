import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { getAllModels } from '@/lib/ai/registry'
import type { UIMessage } from 'ai'

interface ConversationPageProps {
  params: { id: string }
}

export default async function ConversationPage({ params }: ConversationPageProps) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const { id } = params

  // Load conversation with messages, verify ownership
  const conversation = await prisma.conversation.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!conversation) {
    notFound()
  }

  // Convert DB messages to UIMessage format
  const initialMessages: UIMessage[] = conversation.messages.map((msg) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant' | 'system',
    parts: [{ type: 'text' as const, text: msg.content, state: 'done' as const }],
  }))

  const allModels = getAllModels()

  return (
    <ChatPanel
      key={conversation.id}
      conversationId={conversation.id}
      conversationTitle={conversation.title}
      initialMessages={initialMessages}
      initialModel={conversation.model}
      allModels={allModels}
    />
  )
}
