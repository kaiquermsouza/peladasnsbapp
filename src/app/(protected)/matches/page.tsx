import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import { Plus, MapPin, Users, Settings } from 'lucide-react'
import MatchesPlayerClient from './MatchesPlayerClient'

export const dynamic = 'force-dynamic'

export default async function MatchesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // ── ADMIN VIEW ───────────────────────────────────────────
  if (profile.role === 'admin') {
    const { data: matches } = await supabase
      .from('matches')
      .select('*, match_players(count)')
      .order('match_date', { ascending: false })

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Partidas</h1>
            <p className="text-slate-400 text-sm mt-1">Gerencie as peladas</p>
          </div>
          <Link href="/matches/new">
            <Button className="flex items-center gap-2">
              <Plus size={16} />
              Nova Partida
            </Button>
          </Link>
        </div>

        {!matches || matches.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-5xl mb-4">⚽</div>
            <p className="text-white font-medium">Nenhuma partida cadastrada</p>
            <p className="text-slate-400 text-sm mt-1">Crie a primeira pelada!</p>
            <Link href="/matches/new" className="inline-block mt-4">
              <Button>Criar Partida</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => {
              const playerCount = (match.match_players as { count: number }[])?.[0]?.count ?? 0
              const statusBadge =
                match.voting_status === 'published' ? { label: 'Publicado', cls: 'text-green-400 bg-green-500/10 border-green-500/30' } :
                match.voting_status === 'open'      ? { label: 'Votação aberta', cls: 'text-blue-400 bg-blue-500/10 border-blue-500/30' } :
                match.voting_status === 'closed'    ? { label: 'Encerrado', cls: 'text-orange-400 bg-orange-500/10 border-orange-500/30' } :
                                                      { label: 'Rascunho', cls: 'text-slate-400 bg-slate-700 border-slate-600' }
              return (
                <Card key={match.id} className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white capitalize">
                        {formatDate(match.match_date)}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusBadge.cls}`}>
                        {statusBadge.label}
                      </span>
                    </div>
                    {match.location && (
                      <p className="text-slate-400 text-sm flex items-center gap-1 mt-0.5">
                        <MapPin size={13} />{match.location}
                      </p>
                    )}
                    {match.notes && (
                      <p className="text-slate-500 text-xs mt-1 truncate">{match.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-sm text-slate-300">
                      <Users size={15} className="text-slate-400" />
                      {playerCount} jogador{playerCount !== 1 ? 'es' : ''}
                    </span>
                    <Link href={`/matches/${match.id}/manage`}>
                      <Button variant="secondary" size="sm" className="flex items-center gap-1.5">
                        <Settings size={14} />
                        Gerenciar
                      </Button>
                    </Link>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── PLAYER VIEW ──────────────────────────────────────────
  // Fetch published matches with participants
  const { data: publishedMatches } = await supabase
    .from('matches')
    .select('id, match_date, location, score_white, score_black')
    .eq('voting_status', 'published')
    .order('match_date', { ascending: false })

  if (!publishedMatches || publishedMatches.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Partidas</h1>
        <Card className="text-center py-12">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-white font-medium">Nenhuma partida publicada ainda</p>
          <p className="text-slate-400 text-sm mt-1">Os resultados aparecem aqui após o admin publicar.</p>
        </Card>
      </div>
    )
  }

  const matchIds = publishedMatches.map((m) => m.id)

  // Fetch participants and ratings for all published matches in bulk
  const [{ data: allMatchPlayers }, { data: allRatings }] = await Promise.all([
    supabase
      .from('match_players')
      .select('match_id, player_id, team, profiles(name, nickname)')
      .in('match_id', matchIds)
      .eq('confirmed', true),
    supabase
      .from('player_ratings')
      .select('match_id, rated_player_id, rating, is_mvp_vote')
      .in('match_id', matchIds),
  ])

  // Build summary per match
  const summaries = publishedMatches.map((match) => {
    const players = (allMatchPlayers ?? []).filter((mp) => mp.match_id === match.id)
    const ratings = (allRatings ?? []).filter((r) => r.match_id === match.id)

    // Compute avg rating per player
    const perPlayer = players.map((mp) => {
      const playerRatings = ratings.filter((r) => r.rated_player_id === mp.player_id)
      const avg = playerRatings.length > 0
        ? playerRatings.reduce((s, r) => s + r.rating, 0) / playerRatings.length
        : 0
      const mvpVotes = playerRatings.filter((r) => r.is_mvp_vote).length
      const profile = mp.profiles as { name: string; nickname: string } | null
      return { player_id: mp.player_id, avg, mvpVotes, name: profile?.name ?? '', nickname: profile?.nickname ?? '' }
    })

    // MVP: most mvp votes (> 0)
    const maxMvp = Math.max(...perPlayer.map((p) => p.mvpVotes), 0)
    const mvp = maxMvp > 0 ? perPlayer.find((p) => p.mvpVotes === maxMvp) ?? null : null

    // Bola Murche: lowest avg (only players with votes)
    const rated = perPlayer.filter((p) => p.avg > 0)
    const minAvg = rated.length > 0 ? Math.min(...rated.map((p) => p.avg)) : null
    const bolaMurche = minAvg !== null ? rated.find((p) => p.avg === minAvg) ?? null : null

    const hasTeams = players.some((mp) => mp.team !== null)

    return {
      id: match.id,
      match_date: match.match_date,
      location: match.location,
      score_white: match.score_white ?? 0,
      score_black: match.score_black ?? 0,
      player_count: players.length,
      has_teams: hasTeams,
      mvp_name: mvp?.name ?? null,
      mvp_nickname: mvp?.nickname ?? null,
      bola_murche_name: bolaMurche?.name ?? null,
      bola_murche_nickname: bolaMurche?.nickname ?? null,
    }
  })

  return <MatchesPlayerClient matches={summaries} />
}
