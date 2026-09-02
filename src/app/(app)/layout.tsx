import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { BottomNav } from '@/components/nav/BottomNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-ink-50 pb-24">
      <div className="safe-top" />
      <main className="mx-auto max-w-lg safe-x">{children}</main>
      <BottomNav />
    </div>
  )
}
