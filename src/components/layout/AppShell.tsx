import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0d0d17] text-white dark:bg-[#0d0d17] dark:text-white light:bg-gray-50 light:text-gray-900">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-screen-2xl px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
