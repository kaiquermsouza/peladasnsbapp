'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Profile, MatchPlayer, Match } from '@/types/database'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import Countdown from '@/components/ui/Countdown'
import { Save, Users, Vote, Trophy, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { getVotingDeadline } from '@/lib/utils'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface PlayerRow {
  player: Profile
  checked: boolean
  goals: number
  assists: number
  team: 'white' | 'black' | null
}

interface Props {
  match: Match
  allPlayers: Profile[]
  initialMatchPlayers: MatchPlayer[]
  voterCount: number
}

type Section = 1 | 2 | 3

export default function ManageMatchClient({ match, allPlayers, initialMatchPlayers, voterCount }: Props) {
  const supabase = createClient()

  const buildRows = (mp: MatchPlayer[]): PlayerRow[] =>
    allPlayers.map((player) => {
      const found = mp.find((m) => m.player_id === player.id)
      return {
        player,
        checked: !!found,
        goals: found?.goals ?? 0,
        assists: found?.assists ?? 0,
        team: found?.team ?? null,
      }
    })

  const [rows, setRows] = useState<PlayerRow[]>(buildRows(initialMatchPlayers))
  const [scoreWhite, setScoreWhite] = useState(match.score_white ?? 0)
  const [scoreBlack, setScoreBlack] = useState(match.score_black ?? 0)
  const [votingStatus, setVotingStatus] = useState(match.voting_status)
  const [votingClosesAt, setVotingClosesAt] = useState(match.voting_closes_at)
  const [section, setSection] = useState<Section>(() => {
    if (match.voting_status !== 'draft') return 3
    if (initialMatchPlayers.length >= 2) return 2
    return 1
  })
  const [presenceSaved, setPresenceSaved] = useState(initialMatchPlayers.length > 0)
  const [statsSaved, setStatsSaved] = useState(
    match.voting_status !== 'draft' || initialMatchPlayers.length >= 2
  )
  const [loadingPresence, setLoadingPresence] = useState(false)
  const [loadingStats, setLoadingStats] = useState(false)
  const [loadingVoting, setLoadingVoting] = useState(false)
  const [currentVoterCount, setCurrentVoterCount] = useState(voterCount)

  const checkedPlayers = rows.filter((r) => r.checked)

  function togglePlayer(playerId: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.player.id === playerId
          ? { ...r, checked: !r.checked, goals: 0, assists: 0, team: null }
          : r
      )
    )
  }

  function updateTeam(playerId: string, team: 'white' | 'black' | null) {
    setRows((prev) =>
      prev.map((r) => (r.player.id === playerId ? { ...r, team } : r))
    )
  }

  function updateStat(playerId: string, field: 'goals' | 'assists', value: number) {
    setRows((prev) =>
      prev.map((r) =>
        r.player.id === playerId ? { ...r, [field]: Math.max(0, value) } : r
      )
    )
  }

  async function savePresence() {
    setLoadingPresence(true)
    const present = rows.filter((r) => r.checked)
    const absent = rows.filter((r) => !r.checked).map((r) => r.player.id)

    if (absent.length > 0) {
      await supabase.from('match_players').delete().eq('match_id', match.id).in('player_id', absent)
    }
    if (present.length > 0) {
      const { error } = await supabase.from('match_players').upsert(
        present.map((r) => ({
          match_id: match.id,
          player_id: r.player.id,
          goals: r.goals,
          assists: r.assists,
          confirmed: true,
          team: r.team,
        })),
        { onConflict: 'match_id,player_id' }
      )
      if (error) { toast.error('Erro: ' + error.message); setLoadingPresence(false); return }
    }

    // Save match scores
    const { error: scoreError } = await supabase
      .from('matches')
      .update({ score_white: scoreWhite, score_black: scoreBlack })
      .eq('id', match.id)
    if (scoreError) { toast.error('Erro ao salvar placar: ' + scoreError.message); setLoadingPresence(false); return }

    toast.success(`${present.length} presenças salvas!`)
    setPresenceSaved(true)
    setSection(2)
    setLoadingPresence(false)
  }

  async function saveStats() {
    if (checkedPlayers.length < 2) {
      toast.error('Marque ao menos 2 jogadores presentes.')
      return
    }
    setLoadingStats(true)
    const { error } = await supabase.from('match_players').upsert(
      checkedPlayers.map((r) => ({
        match_id: match.id,
        player_id: r.player.id,
        goals: r.goals,
        assists: r.assists,
        confirmed: true,
        team: r.team,
      })),
      { onConflict: 'match_id,player_id' }
    )
    if (error) { toast.error('Erro: ' + error.message); setLoadingStats(false); return }
    toast.success('Estatísticas salvas!')
    setStatsSaved(true)
    setSection(3)
    setLoadingStats(false)
  }

  async function openVoting() {
    setLoadingVoting(true)
    const deadline = getVotingDeadline(match.match_date)
    const { error } = await supabase
      .from('matches')
      .update({ voting_status: 'open', voting_closes_at: deadline.toISOString() })
      .eq('id', match.id)
    if (error) { toast.error('Erro: ' + error.message); setLoadingVoting(false); return }
    setVotingStatus('open')
    setVotingClosesAt(deadline.toISOString())
    toast.success('Votação aberta!')
    setLoadingVoting(false)
  }

  async function closeVoting() {
    setLoadingVoting(true)
    const { error } = await supabase
      .from('matches')
      .update({ voting_status: 'closed' })
      .eq('id', match.id)
    if (error) { toast.error('Erro: ' + error.message); setLoadingVoting(false); return }
    setVotingStatus('closed')
    toast.success('Votação encerrada.')
    setLoadingVoting(false)
  }

  async function publishResult() {
    setLoadingVoting(true)
    const { error } = await supabase
      .from('matches')
      .update({ voting_status: 'published', result_published_at: new Date().toISOString() })
      .eq('id', match.id)
    if (error) { toast.error('Erro: ' + error.message); setLoadingVoting(false); return }
    setVotingStatus('published')
    toast.success('Resultado publicado! 🏆')
    setLoadingVoting(false)
  }

  // Poll voter count when open
  useEffect(() => {
    if (votingStatus !== 'open') return
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('player_ratings')
        .select('voter_id')
        .eq('match_id', match.id)
      const unique = new Set(data?.map((r) => r.voter_id) ?? []).size
      setCurrentVoterCount(unique)
    }, 30_000)
    return () => clearInterval(interval)
  }, [votingStatus, match.id, supabase])

  const deadline = getVotingDeadline(match.match_date)

  const stepClasses = (s: Section) =>
    s === section
      ? 'bg-green-500 text-white'
      : s < section || (s === 2 && presenceSaved) || (s === 3 && statsSaved)
      ? 'bg-green-500/20 text-green-400 border border-green-500/40'
      : 'bg-slate-700 text-slate-500'

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {([1, 2, 3] as Section[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => {
                if (s === 2 && !presenceSaved) return
                if (s === 3 && !statsSaved) return
                setSection(s)
              }}
              className={`w-8 h-8 rounded-full text-sm font-bold transition-all ${stepClasses(s)} ${
                (s === 2 && !presenceSaved) || (s === 3 && !statsSaved)
                  ? 'cursor-not-allowed opacity-50'
                  : 'cursor-pointer'
              }`}
            >
              {s}
            </button>
            <span className={`text-xs font-medium ${s === section ? 'text-white' : 'text-slate-500'}`}>
              {s === 1 ? 'Presença' : s === 2 ? 'Estatísticas' : 'Votação'}
            </span>
            {s < 3 && <div className="w-6 h-px bg-slate-700 mx-1" />}
          </div>
        ))}
      </div>

      {/* ── SEÇÃO 1: PRESENÇA ─────────────────────────── */}
      {section === 1 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm flex items-center gap-2">
              <Users size={15} />
              {checkedPlayers.length} jogador{checkedPlayers.length !== 1 ? 'es' : ''} marcado{checkedPlayers.length !== 1 ? 's' : ''}
            </p>
          </div>

          {rows.map((row) => (
            <Card
              key={row.player.id}
              className={cn('transition-all', row.checked ? 'border-green-500/30' : 'opacity-50')}
            >
              <div className="flex items-center gap-3">
                {/* Checkbox + player info */}
                <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={row.checked}
                    onChange={() => togglePlayer(row.player.id)}
                    className="w-5 h-5 accent-green-500 cursor-pointer flex-shrink-0"
                  />
                  <Avatar name={row.player.name} avatarUrl={row.player.avatar_url} size="md" />
                  <div className="min-w-0">
                    <p className="font-medium text-white text-sm">{row.player.name}</p>
                    <p className="text-slate-400 text-xs">@{row.player.nickname}</p>
                  </div>
                </label>

                {/* Team toggle — only when checked */}
                {row.checked && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => updateTeam(row.player.id, row.team === 'white' ? null : 'white')}
                      className={cn(
                        'px-3 py-1 text-xs font-semibold rounded-lg border transition-all',
                        row.team === 'white'
                          ? 'bg-white text-slate-900 border-white'
                          : 'bg-transparent text-slate-400 border-slate-600 hover:border-slate-300 hover:text-slate-200'
                      )}
                    >
                      Branco
                    </button>
                    <button
                      type="button"
                      onClick={() => updateTeam(row.player.id, row.team === 'black' ? null : 'black')}
                      className={cn(
                        'px-3 py-1 text-xs font-semibold rounded-lg border transition-all',
                        row.team === 'black'
                          ? 'bg-[#1a1a1a] text-white border-slate-500'
                          : 'bg-transparent text-slate-400 border-slate-600 hover:border-slate-400 hover:text-slate-200'
                      )}
                    >
                      Preto
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}

          {/* Score inputs */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 flex items-center gap-4">
            <span className="text-slate-400 text-sm font-medium whitespace-nowrap">Placar:</span>
            <div className="flex items-center gap-3 flex-1 justify-center">
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-slate-400 font-medium">Branco</span>
                <input
                  type="number" min={0} value={scoreWhite}
                  onChange={(e) => setScoreWhite(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-14 text-center bg-slate-900 border border-slate-600 text-white text-xl font-bold rounded-lg py-1 focus:outline-none focus:border-white"
                />
              </div>
              <span className="text-slate-500 text-xl font-bold mt-4">×</span>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-slate-400 font-medium">Preto</span>
                <input
                  type="number" min={0} value={scoreBlack}
                  onChange={(e) => setScoreBlack(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-14 text-center bg-slate-900 border border-slate-600 text-white text-xl font-bold rounded-lg py-1 focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>
          </div>

          <Button onClick={savePresence} loading={loadingPresence} className="w-full flex items-center justify-center gap-2" size="lg">
            <Save size={16} />
            Salvar Presenças e Continuar
          </Button>
        </div>
      )}

      {/* ── SEÇÃO 2: ESTATÍSTICAS ─────────────────────── */}
      {section === 2 && (
        <div className="space-y-3">
          <p className="text-slate-400 text-sm">{checkedPlayers.length} jogadores presentes — lance gols e assistências.</p>

          {checkedPlayers.map((row) => (
            <Card key={row.player.id} className="border-green-500/20">
              <div className="flex items-center gap-3 flex-wrap">
                <Avatar name={row.player.name} avatarUrl={row.player.avatar_url} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm">{row.player.name}</p>
                  <p className="text-slate-400 text-xs">
                    @{row.player.nickname}
                    {row.team && (
                      <span className={cn(
                        'ml-2 px-1.5 py-0.5 text-xs rounded font-semibold',
                        row.team === 'white' ? 'bg-white text-slate-900' : 'bg-[#1a1a1a] text-white border border-slate-600'
                      )}>
                        {row.team === 'white' ? 'Branco' : 'Preto'}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatInput label="Gols" value={row.goals} onChange={(v) => updateStat(row.player.id, 'goals', v)} color="text-green-400" />
                  <StatInput label="Assists" value={row.assists} onChange={(v) => updateStat(row.player.id, 'assists', v)} color="text-blue-400" />
                </div>
              </div>
            </Card>
          ))}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setSection(1)} className="flex-1">← Presença</Button>
            <Button onClick={saveStats} loading={loadingStats} className="flex-1 flex items-center justify-center gap-2">
              <Save size={16} />
              Salvar e Continuar
            </Button>
          </div>
        </div>
      )}

      {/* ── SEÇÃO 3: CONTROLE DE VOTAÇÃO ─────────────── */}
      {section === 3 && (
        <div className="space-y-4">
          {/* draft */}
          {votingStatus === 'draft' && (
            <Card className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="text-slate-400" />
                <h3 className="font-semibold text-white">Abrir Votação</h3>
              </div>
              <p className="text-slate-400 text-sm">
                A votação fechará automaticamente na{' '}
                <span className="text-white font-medium">
                  quinta-feira, {deadline.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} às 23:59 BRT
                </span>
              </p>
              <div className="bg-slate-900 rounded-lg px-4 py-3 text-sm text-slate-400">
                <span className="text-white font-medium">{checkedPlayers.length}</span> jogadores irão avaliar uns aos outros
              </div>
              <Button onClick={openVoting} loading={loadingVoting} className="w-full flex items-center justify-center gap-2" size="lg">
                <Vote size={16} />
                Abrir Votação Agora
              </Button>
            </Card>
          )}

          {/* open */}
          {votingStatus === 'open' && votingClosesAt && (
            <Card variant="highlight" className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="font-semibold text-green-400">Votação Aberta</span>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="bg-slate-900 rounded-lg px-4 py-3 flex-1">
                  <p className="text-slate-400 text-xs mb-1">Encerra em</p>
                  <Countdown targetDate={votingClosesAt} prefix="" className="text-white font-semibold text-lg" />
                </div>
                <div className="bg-slate-900 rounded-lg px-4 py-3 flex-1 text-center">
                  <p className="text-slate-400 text-xs mb-1">Votaram</p>
                  <p className="text-white font-semibold text-lg">
                    {currentVoterCount} <span className="text-slate-400 text-sm font-normal">/ {checkedPlayers.length}</span>
                  </p>
                </div>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${checkedPlayers.length > 0 ? (currentVoterCount / checkedPlayers.length) * 100 : 0}%` }}
                />
              </div>
              <Button variant="danger" onClick={closeVoting} loading={loadingVoting} className="w-full">
                Fechar Votação Antecipadamente
              </Button>
            </Card>
          )}

          {/* closed */}
          {votingStatus === 'closed' && (
            <Card className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                <span className="font-semibold text-orange-400">Votação Encerrada — Aguardando Publicação</span>
              </div>
              <div className="bg-slate-900 rounded-lg px-4 py-3">
                <p className="text-slate-400 text-sm">
                  <span className="text-white font-semibold">{currentVoterCount}</span> jogadores avaliaram esta pelada.
                </p>
              </div>
              <p className="text-slate-400 text-sm">
                Revise o resultado antes de publicar. Após publicado, ficará visível para todos.
              </p>
              <Button onClick={publishResult} loading={loadingVoting} className="w-full flex items-center justify-center gap-2" size="lg">
                <Trophy size={16} />
                Publicar Resultado Agora
              </Button>
            </Card>
          )}

          {/* published */}
          {votingStatus === 'published' && (
            <Card variant="highlight" className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-green-400" />
                <span className="font-semibold text-green-400">Resultado Publicado</span>
              </div>
              <p className="text-slate-400 text-sm">
                O resultado está visível publicamente na página da pelada.
              </p>
              <Link href={`/peladas/${match.id}`} target="_blank">
                <Button variant="secondary" className="w-full flex items-center justify-center gap-2">
                  <ExternalLink size={15} />
                  Ver Resultado Público
                </Button>
              </Link>
            </Card>
          )}

          <Button variant="ghost" size="sm" onClick={() => setSection(2)} className="text-slate-500">
            ← Editar estatísticas
          </Button>
        </div>
      )}
    </div>
  )
}

function StatInput({ label, value, onChange, color }: {
  label: string; value: number; onChange: (v: number) => void; color: string
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-xs font-medium ${color}`}>{label}</span>
      <div className="flex items-center border border-slate-600 rounded-lg overflow-hidden">
        <button type="button" onClick={() => onChange(value - 1)} className="px-2 py-1 text-slate-300 hover:bg-slate-700 text-sm font-bold">−</button>
        <input
          type="number" min={0} value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className="w-10 text-center bg-slate-900 text-white text-sm py-1 focus:outline-none"
        />
        <button type="button" onClick={() => onChange(value + 1)} className="px-2 py-1 text-slate-300 hover:bg-slate-700 text-sm font-bold">+</button>
      </div>
    </div>
  )
}
