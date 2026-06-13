import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VotarClient from './VotarClient'
import { formatMatchDay } from '@/lib/utils'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { ArrowLeft } from 'lucide-react'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

export default async function VotarPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .single()

  if (!match) notFound()

  // Verify player participated
  const { data: mySlot } = await supabase
    .from('match_players')
    .select('*')
    .eq('match_id', id)
    .eq('player_id', user.id)
    .eq('confirmed', true)
    .single()

  if (!mySlot) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🚫</div>
        <h2 className="text-xl font-semibold text-white">Você não participou desta pelada</h2>
        <p className="text-slate-400 text-sm mt-2">Apenas participantes podem votar.</p>
        <Link href="/dashboard" className="inline-block mt-6">
          <Button variant="secondary">Voltar ao Dashboard</Button>
        </Link>
      </div>
    )
  }

  // Check voting status
  const isOpen = match.voting_status === 'open'
  const deadlinePassed = match.voting_closes_at ? new Date() > new Date(match.voting_closes_at) : false

  if (!isOpen || deadlinePassed) {
    const msg = match.voting_status === 'draft'
      ? 'A votação ainda não foi aberta pelo administrador.'
      : match.voting_status === 'published'
      ? 'A votação foi encerrada. Veja o resultado da pelada!'
      : 'O prazo de votação encerrou na quinta-feira às 23:59.'

    return (
      <div className="text-center py-20 max-w-sm mx-auto">
        <div className="text-5xl mb-4">⏱️</div>
        <h2 className="text-xl font-semibold text-white">Votação encerrada</h2>
        <p className="text-slate-400 text-sm mt-2">{msg}</p>
        <div className="flex gap-3 justify-center mt-6">
          <Link href="/dashboard"><Button variant="secondary">Dashboard</Button></Link>
          {match.voting_status === 'published' && (
            <Link href={`/peladas/${match.id}`}><Button>Ver Resultado</Button></Link>
          )}
        </div>
      </div>
    )
  }

  // Check if already voted
  const { data: myVotes } = await supabase
    .from('player_ratings')
    .select('*')
    .eq('match_id', id)
    .eq('voter_id', user.id)

  // Current user's team — determines which team they can vote for
  const myTeam = mySlot.team as 'white' | 'black' | null

  // Players from the OPPOSITE team only (if team is assigned)
  let playersQuery = supabase
    .from('match_players')
    .select('*, profiles(id, name, nickname, avatar_url)')
    .eq('match_id', id)
    .eq('confirmed', true)
    .neq('player_id', user.id)

  if (myTeam === 'white') playersQuery = playersQuery.eq('team', 'black')
  else if (myTeam === 'black') playersQuery = playersQuery.eq('team', 'white')

  const { data: matchPlayers } = await playersQuery

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white capitalize">
            Pelada de {formatMatchDay(match.match_date)}
          </h1>
          <p className="text-slate-400 text-sm">Avalie os jogadores</p>
        </div>
      </div>

      <VotarClient
        matchId={id}
        currentUserId={user.id}
        myTeam={myTeam}
        matchPlayers={(matchPlayers ?? []).filter((mp) => mp.profiles != null).map((mp) => ({
          player_id: mp.player_id,
          goals: mp.goals,
          assists: mp.assists,
          profiles: mp.profiles as { id: string; name: string; nickname: string; avatar_url: string | null; role: string; active: boolean; created_at: string },
        }))}
        existingVotes={myVotes ?? []}
        votingClosesAt={match.voting_closes_at!}
      />
    </div>
  )
}
