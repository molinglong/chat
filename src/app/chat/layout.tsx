import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { TopBar } from '@/components/TopBar'
import { SettingsModal } from '@/components/SettingsModal'

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="h-screen bg-zinc-100 dark:bg-black p-0 lg:p-1.5 overflow-hidden">
      <div className="h-full flex overflow-hidden rounded-none lg:rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 bg-white dark:bg-zinc-950">
          <TopBar />
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
      <SettingsModal />
    </div>
  )
}
