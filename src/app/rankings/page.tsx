import { createClient } from '@/lib/supabase/server'
import RankingsClient from '@/components/rankings/RankingsClient'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PublicRankingsPage() {
  const supabase = await createClient()

  const { data: stats } = await supabase
    .from('player_stats')
    .select('*')
    .order('total_score', { ascending: false })

  // Check if user is logged in for conditional navbar
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-slate-900">
      <nav className="bg-slate-900 border-b border-slate-800 px-4 py-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2 text-white font-bold text-lg">
            <span className="text-2xl">⚽</span>
            <span className="text-green-400">Pelada</span>
            <span>SNSB</span>
          </Link>
          {user ? (
            <Link href="/dashboard" className="text-sm text-green-400 hover:text-green-300 transition-colors">
              ← Dashboard
            </Link>
          ) : (
            <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">
              Entrar →
            </Link>
          )}
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <RankingsClient stats={stats ?? []} />
      </main>
    </div>
  )
}
