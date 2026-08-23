import { create } from 'zustand'

interface ChatState {
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  currentConversationId: string | null
  setCurrentConversationId: (id: string | null) => void
}

export const useChatStore = create<ChatState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  currentConversationId: null,
  setCurrentConversationId: (id) => set({ currentConversationId: id }),
}))
