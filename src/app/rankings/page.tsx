import { createClient } from '@/lib/supabase/server'
import RankingsClient from '@/components/rankings/RankingsClient'
import type { PlayerVictories, TeamWinStats } from '@/components/rankings/RankingsClient'
import Link from 'next/link'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export default async function PublicRankingsPage() {
  const supabase = await createClient()

  const { data: stats } = await supabase
    .from('player_stats')
    .select('*')
    .order('total_score', { ascending: false })

  // Published matches for team stats
  const { data: publishedMatches } = await supabase
    .from('matches')
    .select('id, score_white, score_black')
    .eq('voting_status', 'published')

  const teamStats: TeamWinStats = { white_wins: 0, black_wins: 0, draws: 0 }
  publishedMatches?.forEach((m) => {
    if (m.score_white > m.score_black) teamStats.white_wins++
    else if (m.score_black > m.score_white) teamStats.black_wins++
    else teamStats.draws++
  })

  // Individual victories per player
  let playerVictories: PlayerVictories[] = []
  const matchIds = publishedMatches?.map((m) => m.id) ?? []

  if (matchIds.length > 0) {
    const { data: matchPlayers } = await supabase
      .from('match_players')
      .select('player_id, team, match_id, profiles(name, nickname, avatar_url)')
      .in('match_id', matchIds)
      .eq('confirmed', true)
      .not('team', 'is', null)

    const victoriesMap: Record<string, PlayerVictories> = {}

    matchPlayers?.forEach((mp) => {
      if (!mp.team || !mp.profiles) return
      const match = publishedMatches?.find((m) => m.id === mp.match_id)
      if (!match) return

      const won =
        (mp.team === 'white' && match.score_white > match.score_black) ||
        (mp.team === 'black' && match.score_black > match.score_white)

      if (!won) return

      if (!victoriesMap[mp.player_id]) {
        const p = mp.profiles as { name: string; nickname: string; avatar_url: string | null }
        victoriesMap[mp.player_id] = {
          player_id: mp.player_id,
          name: p.name,
          nickname: p.nickname,
          avatar_url: p.avatar_url,
          victories: 0,
        }
      }
      victoriesMap[mp.player_id].victories++
    })

    playerVictories = Object.values(victoriesMap).sort((a, b) => b.victories - a.victories)
  }

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
        <RankingsClient
          stats={stats ?? []}
          playerVictories={playerVictories}
          teamStats={teamStats}
        />
      </main>
    </div>
  )
}
