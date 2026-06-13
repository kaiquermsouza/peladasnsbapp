import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ManageMatchClient from './ManageMatchClient'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { ArrowLeft } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ManageMatchPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .single()

  if (!match) notFound()

  const [{ data: allPlayers }, { data: matchPlayers }, { data: ratingVoters }] = await Promise.all([
    supabase.from('profiles').select('*').eq('active', true).order('name'),
    supabase.from('match_players').select('*').eq('match_id', id),
    supabase.from('player_ratings').select('voter_id').eq('match_id', id),
  ])

  const uniqueVoters = new Set(ratingVoters?.map((r) => r.voter_id) ?? []).size

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/matches">
          <Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Gerenciar Partida</h1>
          <p className="text-slate-400 text-sm capitalize">{formatDate(match.match_date)}</p>
          {match.location && <p className="text-slate-500 text-xs">{match.location}</p>}
        </div>
      </div>

      <ManageMatchClient
        match={match}
        allPlayers={allPlayers ?? []}
        initialMatchPlayers={matchPlayers ?? []}
        voterCount={uniqueVoters}
      />
    </div>
  )
}
