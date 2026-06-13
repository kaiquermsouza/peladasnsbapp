import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { cn, formatDate } from '@/lib/utils'
import { MapPin, Star, Target, Handshake, Trophy, TrendingDown } from 'lucide-react'

export const revalidate = 60

interface Props { params: Promise<{ id: string }> }

interface PlayerResult {
  player_id: string
  name: string
  nickname: string
  avatar_url: string | null
  goals: number
  assists: number
  avg_rating: number
  vote_count: number
  is_mvp: boolean
  is_bola_murche: boolean
  team: 'white' | 'black' | null
}

export default async function PeladaResultPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .single()

  if (!match) notFound()

  if (match.voting_status !== 'published') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
        <div className="text-5xl mb-4">⏳</div>
        <h2 className="text-xl font-semibold text-white">Resultado ainda não disponível</h2>
        <p className="text-slate-400 text-sm mt-2">
          O administrador publicará o resultado após o encerramento da votação.
        </p>
        <Link href="/rankings" className="mt-6 inline-block text-sm text-green-400 hover:text-green-300">
          Ver rankings gerais →
        </Link>
      </div>
    )
  }

  // Get all ratings for this match
  const { data: ratings } = await supabase
    .from('player_ratings')
    .select('rated_player_id, rating, is_mvp_vote')
    .eq('match_id', id)

  // Get match players with profiles and team
  const { data: matchPlayers } = await supabase
    .from('match_players')
    .select('player_id, goals, assists, team, profiles(id, name, nickname, avatar_url)')
    .eq('match_id', id)
    .eq('confirmed', true)

  if (!ratings || !matchPlayers) notFound()

  // Unique voter count: total ratings ÷ number of players rated per voter
  const totalVoters = matchPlayers.length > 0
    ? Math.round(ratings.length / matchPlayers.length)
    : 0

  // Aggregate per player
  const results: PlayerResult[] = matchPlayers.map((mp) => {
    const profile = mp.profiles as { id: string; name: string; nickname: string; avatar_url: string | null }
    const playerRatings = ratings.filter((r) => r.rated_player_id === mp.player_id)
    const avg = playerRatings.length > 0
      ? playerRatings.reduce((s, r) => s + r.rating, 0) / playerRatings.length
      : 0
    const mvpVotes = playerRatings.filter((r) => r.is_mvp_vote).length
    return {
      player_id: mp.player_id,
      name: profile.name,
      nickname: profile.nickname,
      avatar_url: profile.avatar_url,
      goals: mp.goals,
      assists: mp.assists,
      avg_rating: avg,
      vote_count: mvpVotes,
      is_mvp: false,
      is_bola_murche: false,
      team: (mp.team as 'white' | 'black' | null) ?? null,
    }
  })

  // Determine MVP(s): player(s) with most MVP votes
  const maxMvpVotes = Math.max(...results.map((r) => r.vote_count))
  results.forEach((r) => { r.is_mvp = r.vote_count === maxMvpVotes && maxMvpVotes > 0 })

  // Determine Bola Murche: player(s) with lowest avg rating (only among those who received votes)
  const ratedResults = results.filter((r) => r.avg_rating > 0)
  const minAvgRating = ratedResults.length > 0 ? Math.min(...ratedResults.map((r) => r.avg_rating)) : null
  results.forEach((r) => {
    r.is_bola_murche = minAvgRating !== null && r.avg_rating === minAvgRating && !r.is_mvp
  })

  // Sort: white first, black second, null last — then by avg_rating desc within each group
  const teamPriority = (t: 'white' | 'black' | null) => t === 'white' ? 0 : t === 'black' ? 1 : 2
  const sorted = [...results].sort((a, b) => {
    const tp = teamPriority(a.team) - teamPriority(b.team)
    return tp !== 0 ? tp : b.avg_rating - a.avg_rating
  })

  const mvps = results.filter((r) => r.is_mvp)
  const isTie = mvps.length > 1
  const bolaMurches = results.filter((r) => r.is_bola_murche)
  const isBolaTie = bolaMurches.length > 1
  const hasTeams = results.some((r) => r.team !== null)

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navbar */}
      <nav className="bg-slate-900 border-b border-slate-800 px-4 py-4 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg">
            <span className="text-2xl">⚽</span>
            <span className="text-green-400">Pelada</span>
            <span>SNSB</span>
          </Link>
          <Link href="/rankings" className="text-sm text-slate-400 hover:text-white transition-colors">
            Rankings →
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <p className="text-slate-400 text-sm uppercase tracking-wide font-medium">Resultado da Pelada</p>
          <h1 className="text-2xl font-bold text-white mt-1 capitalize">{formatDate(match.match_date)}</h1>
          {match.location && (
            <p className="text-slate-400 text-sm flex items-center gap-1 mt-1">
              <MapPin size={14} />{match.location}
            </p>
          )}
        </div>

        {/* Score card */}
        {hasTeams && (
          <div className="rounded-xl overflow-hidden border border-slate-700 flex">
            <div className="flex-1 bg-slate-100 flex flex-col items-center py-5">
              <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Time Branco</span>
              <span className="text-5xl font-black text-slate-900 mt-2 leading-none">{match.score_white}</span>
            </div>
            <div className="flex items-center px-5 bg-slate-800 border-x border-slate-700">
              <span className="text-slate-400 text-2xl font-bold">×</span>
            </div>
            <div className="flex-1 bg-[#111111] flex flex-col items-center py-5">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Time Preto</span>
              <span className="text-5xl font-black text-white mt-2 leading-none">{match.score_black}</span>
            </div>
          </div>
        )}

        {/* MVP card */}
        {mvps.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide flex items-center gap-2">
              <Trophy size={15} className="text-yellow-400" />
              {isTie ? 'Co-MVPs da Pelada' : 'MVP da Pelada'}
            </h2>
            <div className={cn('grid gap-3', mvps.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
              {mvps.map((mvp) => (
                <Card key={mvp.player_id} className="bg-yellow-500/5 border-yellow-500/40 flex flex-col items-center py-6 gap-3 text-center">
                  <Avatar name={mvp.name} avatarUrl={mvp.avatar_url} size="xl" />
                  <div>
                    <p className="font-bold text-white text-lg">{mvp.name}</p>
                    <p className="text-yellow-400 text-sm font-medium">
                      {isTie ? '👑 Co-MVP' : '👑 MVP da Pelada'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-3 py-1">
                    <Star size={14} className="text-yellow-400" />
                    <span className="text-yellow-400 font-bold">{mvp.avg_rating.toFixed(1)}</span>
                    <span className="text-slate-500 text-xs">média</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Target size={11} className="text-green-400" />{mvp.goals} gols</span>
                    <span className="flex items-center gap-1"><Handshake size={11} className="text-blue-400" />{mvp.assists} assists</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Bola Murche card */}
        {bolaMurches.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide flex items-center gap-2">
              <TrendingDown size={15} className="text-red-400" />
              {isBolaTie ? 'Co-Bolas Murche' : 'Bola Murche'}
            </h2>
            <div className={cn('grid gap-3', bolaMurches.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
              {bolaMurches.map((bm) => (
                <Card key={bm.player_id} className="bg-red-500/5 border-red-500/30 flex flex-col items-center py-6 gap-3 text-center">
                  <Avatar name={bm.name} avatarUrl={bm.avatar_url} size="xl" />
                  <div>
                    <p className="font-bold text-white text-lg">{bm.name}</p>
                    <p className="text-red-400 text-sm font-medium">
                      {isBolaTie ? '🥀 Co-Bola Murche' : '🥀 Bola Murche da Rodada'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/30 rounded-full px-3 py-1">
                    <Star size={14} className="text-red-400" />
                    <span className="text-red-400 font-bold">{bm.avg_rating.toFixed(1)}</span>
                    <span className="text-slate-500 text-xs">média</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Target size={11} className="text-green-400" />{bm.goals} gols</span>
                    <span className="flex items-center gap-1"><Handshake size={11} className="text-blue-400" />{bm.assists} assists</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Classification table */}
        <div>
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">Classificação</h2>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/50">
                    <th className="text-left px-4 py-3 text-slate-400 font-medium w-8">#</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Jogador</th>
                    {hasTeams && (
                      <th className="text-center px-3 py-3 text-slate-400 font-medium">Time</th>
                    )}
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Gols</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Assists</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Nota</th>
                    <th className="text-center px-4 py-3 text-slate-400 font-medium">MVP</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((player, i) => (
                    <tr
                      key={player.player_id}
                      className={cn(
                        'border-b border-slate-700/50 last:border-0 transition-colors',
                        player.is_mvp ? 'bg-yellow-500/5' :
                        player.is_bola_murche ? 'bg-red-500/5' :
                        'hover:bg-slate-700/20'
                      )}
                    >
                      <td className="px-4 py-3 text-slate-500 text-sm font-medium">{i + 1}°</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={player.name} avatarUrl={player.avatar_url} size="sm" />
                          <div>
                            <p className={cn('font-medium leading-none', player.is_mvp ? 'text-yellow-400' : player.is_bola_murche ? 'text-red-400' : 'text-white')}>
                              {player.name}
                            </p>
                            <p className="text-slate-500 text-xs mt-0.5">@{player.nickname}</p>
                          </div>
                        </div>
                      </td>
                      {hasTeams && (
                        <td className="px-3 py-3 text-center">
                          <TeamBadge team={player.team} />
                        </td>
                      )}
                      <td className="px-4 py-3 text-right text-slate-300">{player.goals}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{player.assists}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn(
                          'font-bold',
                          player.avg_rating >= 8 ? 'text-green-400' :
                          player.avg_rating >= 5 ? 'text-yellow-400' : 'text-red-400'
                        )}>
                          {player.avg_rating.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {player.is_mvp ? '👑' : player.is_bola_murche ? '🥀' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 px-4 py-2 border-t border-slate-700">
              {totalVoters} jogador{totalVoters !== 1 ? 'es' : ''} avaliaram esta pelada
            </p>
          </Card>
        </div>
      </main>
    </div>
  )
}

function TeamBadge({ team }: { team: 'white' | 'black' | null }) {
  if (team === 'white') {
    return (
      <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-800 border border-slate-300 whitespace-nowrap">
        Branco
      </span>
    )
  }
  if (team === 'black') {
    return (
      <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-[#1a1a1a] text-white border border-slate-600 whitespace-nowrap">
        Preto
      </span>
    )
  }
  return <span className="text-slate-500">—</span>
}
