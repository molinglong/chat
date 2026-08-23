import { ChatPanel } from '@/components/chat/ChatPanel'
import { getAllModels } from '@/lib/ai/registry'

export default function NewChatPage() {
  const allModels = getAllModels()
  const defaultModel = allModels[0]?.id || 'gpt-4o'

  return (
    <ChatPanel
      initialMessages={[]}
      initialModel={defaultModel}
      allModels={allModels}
    />
  )
}
