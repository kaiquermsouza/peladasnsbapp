'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { PlayerRating, Profile } from '@/types/database'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import Countdown from '@/components/ui/Countdown'
import { cn } from '@/lib/utils'
import { Star, Target, Handshake, CheckCircle } from 'lucide-react'
import Link from 'next/link'

interface MatchPlayerSlot {
  player_id: string
  goals: number
  assists: number
  profiles: Profile
}

interface Props {
  matchId: string
  currentUserId: string
  myTeam: 'white' | 'black' | null
  matchPlayers: MatchPlayerSlot[]
  existingVotes: PlayerRating[]
  votingClosesAt: string
}

interface VoteState {
  rating: number | null
  isMvp: boolean
}

export default function VotarClient({
  matchId,
  currentUserId,
  myTeam,
  matchPlayers,
  existingVotes,
  votingClosesAt,
}: Props) {
  const supabase = createClient()
  const alreadyVoted = existingVotes.length > 0

  // Build initial state from existing votes (read-only mode if already voted)
  const buildInitial = (): Record<string, VoteState> => {
    const state: Record<string, VoteState> = {}
    matchPlayers.forEach((mp) => {
      const existing = existingVotes.find((v) => v.rated_player_id === mp.player_id)
      state[mp.player_id] = {
        rating: existing?.rating ?? null,
        isMvp: existing?.is_mvp_vote ?? false,
      }
    })
    return state
  }

  const [votes, setVotes] = useState<Record<string, VoteState>>(buildInitial)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(alreadyVoted)

  function setRating(playerId: string, rating: number) {
    if (submitted) return
    setVotes((prev) => ({ ...prev, [playerId]: { ...prev[playerId], rating } }))
  }

  function toggleMvp(playerId: string) {
    if (submitted) return
    setVotes((prev) => {
      const isCurrentlyMvp = prev[playerId]?.isMvp
      // Only one MVP at a time
      const reset = Object.fromEntries(
        Object.entries(prev).map(([id, v]) => [id, { ...v, isMvp: false }])
      )
      return { ...reset, [playerId]: { ...reset[playerId], isMvp: !isCurrentlyMvp } }
    })
  }

  function validate(): string | null {
    const missing = matchPlayers.filter((mp) => votes[mp.player_id]?.rating === null)
    if (missing.length > 0) return `Falta dar nota para: ${missing.map((m) => m.profiles.nickname).join(', ')}`
    const mvpCount = Object.values(votes).filter((v) => v.isMvp).length
    if (mvpCount !== 1) return 'Escolha exatamente 1 MVP.'
    return null
  }

  async function handleSubmit() {
    const err = validate()
    if (err) { toast.error(err); return }
    setLoading(true)

    const records = matchPlayers.map((mp) => ({
      match_id: matchId,
      voter_id: currentUserId,
      rated_player_id: mp.player_id,
      rating: votes[mp.player_id].rating!,
      is_mvp_vote: votes[mp.player_id].isMvp,
    }))

    const { error } = await supabase.from('player_ratings').insert(records)
    if (error) {
      toast.error('Erro ao votar: ' + error.message)
      setLoading(false)
      return
    }

    toast.success('Votos enviados! 🏆')
    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <Card variant="highlight" className="text-center py-10 space-y-4">
        <CheckCircle size={52} className="text-green-400 mx-auto" />
        <h3 className="text-xl font-bold text-white">Voto registrado!</h3>
        <p className="text-slate-300 text-sm">
          Você avaliou {matchPlayers.length} jogador{matchPlayers.length !== 1 ? 'es' : ''}.
          <br />O resultado sai na sexta-feira após o admin publicar.
        </p>
        <div className="space-y-2 pt-2">
          {matchPlayers.map((mp) => {
            const v = votes[mp.player_id]
            return (
              <div key={mp.player_id} className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Avatar name={mp.profiles.name} avatarUrl={mp.profiles.avatar_url} size="sm" />
                  <span className="text-sm text-white">{mp.profiles.nickname}</span>
                  {v.isMvp && <span className="text-xs text-yellow-400 font-semibold">👑 MVP</span>}
                </div>
                <RatingBadge rating={v.rating ?? 0} />
              </div>
            )
          })}
        </div>
        <Link href="/dashboard"><Button variant="secondary" className="mt-2">Voltar ao Dashboard</Button></Link>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Team context banner */}
      {myTeam && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 border text-sm font-medium ${
          myTeam === 'white'
            ? 'bg-slate-100/5 border-slate-300/20 text-slate-200'
            : 'bg-slate-900/60 border-slate-600/40 text-slate-300'
        }`}>
          <span className="text-lg">{myTeam === 'white' ? '🤍' : '🖤'}</span>
          <span>
            Você é do <strong>Time {myTeam === 'white' ? 'Branco' : 'Preto'}</strong> — avaliando o{' '}
            <strong>Time {myTeam === 'white' ? 'Preto' : 'Branco'}</strong>
          </span>
          <span className="text-lg ml-auto">{myTeam === 'white' ? '🖤' : '🤍'}</span>
        </div>
      )}

      {/* Countdown header */}
      <div className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
        <p className="text-slate-400 text-sm">Dê nota de 1 a 10 para cada jogador e escolha 1 MVP.</p>
        <Countdown
          targetDate={votingClosesAt}
          prefix="Fecha em"
          className="text-yellow-400 text-xs font-semibold whitespace-nowrap ml-3"
        />
      </div>

      {/* Player cards */}
      {matchPlayers.map((mp) => {
        const v = votes[mp.player_id] ?? { rating: null, isMvp: false }
        return (
          <Card
            key={mp.player_id}
            className={cn(
              'space-y-3 transition-all',
              v.isMvp ? 'border-yellow-500/50 bg-yellow-500/5' : ''
            )}
          >
            {/* Player header */}
            <div className="flex items-center gap-3">
              <Avatar name={mp.profiles.name} avatarUrl={mp.profiles.avatar_url} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white">{mp.profiles.name}</p>
                <p className="text-slate-400 text-xs">@{mp.profiles.nickname}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-300">
                  <span className="flex items-center gap-1"><Target size={11} className="text-green-400" />{mp.goals} gol{mp.goals !== 1 ? 's' : ''}</span>
                  <span className="flex items-center gap-1"><Handshake size={11} className="text-blue-400" />{mp.assists} assist.</span>
                </div>
              </div>
              {v.rating !== null && <RatingBadge rating={v.rating} />}
            </div>

            {/* Rating buttons 1-10 */}
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(mp.player_id, n)}
                  className={cn(
                    'flex-1 min-w-[2.2rem] py-1.5 rounded-lg text-sm font-bold transition-all border',
                    v.rating === n
                      ? 'bg-green-500 border-green-500 text-white scale-105 shadow-lg shadow-green-500/20'
                      : 'bg-slate-900 border-slate-600 text-slate-400 hover:border-green-500/50 hover:text-white'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* MVP toggle */}
            <button
              onClick={() => toggleMvp(mp.player_id)}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all border',
                v.isMvp
                  ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                  : 'bg-slate-900 border-slate-600 text-slate-500 hover:border-slate-500 hover:text-slate-300'
              )}
            >
              <Star size={14} className={v.isMvp ? 'fill-yellow-400 text-yellow-400' : ''} />
              {v.isMvp ? '👑 MVP escolhido!' : 'Votar como MVP'}
            </button>
          </Card>
        )
      })}

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        loading={loading}
        size="lg"
        className="w-full flex items-center justify-center gap-2"
      >
        <CheckCircle size={16} />
        Enviar Avaliações
      </Button>

      <p className="text-center text-xs text-slate-500">
        Você não pode alterar os votos após enviar.
      </p>
    </div>
  )
}

function RatingBadge({ rating }: { rating: number }) {
  const color =
    rating >= 8 ? 'text-green-400 bg-green-500/10 border-green-500/30' :
    rating >= 5 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' :
    'text-red-400 bg-red-500/10 border-red-500/30'
  return (
    <span className={cn('text-lg font-bold border rounded-lg px-2 py-0.5', color)}>
      {rating}
    </span>
  )
}
