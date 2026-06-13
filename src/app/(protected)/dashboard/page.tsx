import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Countdown from '@/components/ui/Countdown'
import { formatDateShort } from '@/lib/utils'
import { Target, Handshake, Calendar, Star, ChevronRight, Vote, CheckCircle, Clock } from 'lucide-react'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

interface MatchRef {
  id: string
  match_date: string
  location: string | null
  voting_status: string
  voting_closes_at: string | null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Player personal stats
  const { data: stats } = await supabase
    .from('player_stats')
    .select('*')
    .eq('id', user.id)
    .single()

  // Find the latest open match the player is confirmed for
  const { data: openMatchPlayer } = await supabase
    .from('match_players')
    .select('*, matches(id, match_date, location, voting_status, voting_closes_at)')
    .eq('player_id', user.id)
    .eq('confirmed', true)
    .limit(10)

  // Find any match with voting_status = 'open' that the player is in
  const openSlot = openMatchPlayer?.find((mp) => {
    const m = mp.matches as MatchRef | null
    return m?.voting_status === 'open'
  })

  const openMatch = openSlot?.matches as MatchRef | null

  // Check if player already voted on the open match
  let alreadyVoted = false
  if (openMatch) {
    const { data: existingVotes } = await supabase
      .from('player_ratings')
      .select('id')
      .eq('match_id', openMatch.id)
      .eq('voter_id', user.id)
      .limit(1)
    alreadyVoted = (existingVotes?.length ?? 0) > 0
  }

  // Recent matches the player participated in
  const { data: recentMatchPlayers } = await supabase
    .from('match_players')
    .select('*, matches(id, match_date, location, voting_status, voting_closes_at)')
    .eq('player_id', user.id)
    .eq('confirmed', true)
    .order('matches(match_date)', { ascending: false })
    .limit(5)

  // Which of those matches the player has voted on
  const matchIds = recentMatchPlayers
    ?.map((mp) => (mp.matches as MatchRef | null)?.id)
    .filter(Boolean) as string[] ?? []

  const { data: votedRatings } = await supabase
    .from('player_ratings')
    .select('match_id')
    .eq('voter_id', user.id)
    .in('match_id', matchIds.length > 0 ? matchIds : ['none'])

  const votedMatchIds = new Set(votedRatings?.map((v) => v.match_id) ?? [])

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex items-center gap-4">
        <Avatar name={profile.name} avatarUrl={profile.avatar_url} size="xl" />
        <div>
          <h1 className="text-2xl font-bold text-white">Olá, {profile.nickname}! 👋</h1>
          <p className="text-slate-400 text-sm">
            {profile.role === 'admin' ? 'Administrador' : 'Jogador'} · Pelada SNSB
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Target className="text-green-400" size={22} />}
          label="Gols"
          value={stats?.total_goals ?? 0}
        />
        <StatCard
          icon={<Handshake className="text-blue-400" size={22} />}
          label="Assistências"
          value={stats?.total_assists ?? 0}
        />
        <StatCard
          icon={<Calendar className="text-purple-400" size={22} />}
          label="Presenças"
          value={stats?.total_matches ?? 0}
        />
        <StatCard
          icon={<Star className="text-yellow-400" size={22} />}
          label="MVPs"
          value={stats?.total_mvp_votes ?? 0}
        />
      </div>

      {/* Voting card */}
      <VotingCard
        openMatch={openMatch}
        alreadyVoted={alreadyVoted}
      />

      {/* Recent matches */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Últimas Partidas</h2>
          <Link href="/rankings">
            <Button variant="ghost" size="sm">
              Ver Rankings <ChevronRight size={14} />
            </Button>
          </Link>
        </div>

        {!recentMatchPlayers || recentMatchPlayers.length === 0 ? (
          <Card>
            <p className="text-slate-400 text-sm text-center py-4">
              Você ainda não participou de nenhuma partida.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentMatchPlayers.map((mp) => {
              const match = mp.matches as MatchRef | null
              if (!match) return null
              const hasVoted = votedMatchIds.has(match.id)
              const isPublished = match.voting_status === 'published'
              return (
                <Card key={mp.id} className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm">
                      {match.location ?? 'Local não informado'}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {formatDateShort(match.match_date)}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-300">
                      <span className="flex items-center gap-1">
                        <Target size={12} className="text-green-400" /> {mp.goals} gol{mp.goals !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Handshake size={12} className="text-blue-400" /> {mp.assists} assist.
                      </span>
                    </div>
                  </div>
                  {isPublished ? (
                    <Link href={`/peladas/${match.id}`}>
                      <Button variant="secondary" size="sm" className="whitespace-nowrap">
                        Ver Resultado
                      </Button>
                    </Link>
                  ) : hasVoted ? (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <CheckCircle size={12} className="text-green-400" /> Votou
                    </span>
                  ) : null}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function VotingCard({
  openMatch,
  alreadyVoted,
}: {
  openMatch: MatchRef | null
  alreadyVoted: boolean
}) {
  if (!openMatch) {
    return (
      <Card className="border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-3">
          <Clock size={20} className="text-slate-500 shrink-0" />
          <div>
            <p className="text-slate-400 text-sm font-medium">Votação da semana</p>
            <p className="text-slate-500 text-xs mt-0.5">Nenhuma votação aberta no momento.</p>
          </div>
        </div>
      </Card>
    )
  }

  if (alreadyVoted) {
    return (
      <Card className="border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3">
          <CheckCircle size={20} className="text-green-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold">Você já votou nessa pelada!</p>
            <p className="text-slate-400 text-xs mt-0.5">Resultado sai na sexta-feira após o admin publicar.</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="border-green-500/40 bg-green-500/5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Vote size={20} className="text-green-400 shrink-0" />
          <div>
            <p className="text-white text-sm font-semibold">Votação da semana aberta!</p>
            <p className="text-slate-400 text-xs mt-0.5">
              Dê nota para os jogadores e escolha o MVP.
            </p>
            {openMatch.voting_closes_at && (
              <Countdown
                targetDate={openMatch.voting_closes_at}
                prefix="Fecha em"
                className="text-yellow-400 text-xs font-semibold mt-1"
              />
            )}
          </div>
        </div>
        <Link href={`/votar/${openMatch.id}`}>
          <Button size="sm" className="whitespace-nowrap">
            Votar agora →
          </Button>
        </Link>
      </div>
    </Card>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
    </Card>
  )
}
