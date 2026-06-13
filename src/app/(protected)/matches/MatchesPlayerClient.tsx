'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { cn, formatDate } from '@/lib/utils'
import { MapPin, Users, ChevronRight, Trophy, Filter } from 'lucide-react'

type Period = '1m' | '3m' | '1y' | 'all'

interface MatchSummary {
  id: string
  match_date: string
  location: string | null
  score_white: number
  score_black: number
  player_count: number
  has_teams: boolean
  mvp_name: string | null
  mvp_nickname: string | null
  bola_murche_name: string | null
  bola_murche_nickname: string | null
}

interface Props {
  matches: MatchSummary[]
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '1m',  label: 'Último mês' },
  { value: '3m',  label: 'Últimos 3 meses' },
  { value: '1y',  label: 'Este ano' },
  { value: 'all', label: 'Todas' },
]

function cutoffDate(period: Period): Date | null {
  const now = new Date()
  if (period === '1m')  { now.setMonth(now.getMonth() - 1);    return now }
  if (period === '3m')  { now.setMonth(now.getMonth() - 3);    return now }
  if (period === '1y')  { now.setFullYear(now.getFullYear() - 1); return now }
  return null
}

export default function MatchesPlayerClient({ matches }: Props) {
  const [period, setPeriod] = useState<Period>('3m')

  const filtered = useMemo(() => {
    const cutoff = cutoffDate(period)
    if (!cutoff) return matches
    return matches.filter((m) => new Date(m.match_date) >= cutoff)
  }, [matches, period])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Partidas</h1>
          <p className="text-slate-400 text-sm mt-1">
            {filtered.length} pelada{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Period filter */}
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2">
          <Filter size={14} className="text-slate-400 shrink-0" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="bg-transparent text-sm text-white focus:outline-none cursor-pointer"
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-slate-800">
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-white font-medium">Nenhuma pelada nesse período</p>
          <p className="text-slate-400 text-sm mt-1">Tente ampliar o filtro de datas.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((match) => (
            <Link key={match.id} href={`/peladas/${match.id}`} className="block group">
              <Card className="transition-all group-hover:border-slate-600 group-hover:bg-slate-800/60">
                <div className="flex items-center gap-4">
                  {/* Date + location */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white capitalize text-sm">
                      {formatDate(match.match_date)}
                    </p>
                    {match.location && (
                      <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                        <MapPin size={11} />{match.location}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {/* Score */}
                      {match.has_teams && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                          <span className="bg-slate-100 text-slate-900 px-1.5 py-0.5 rounded font-bold">
                            {match.score_white}
                          </span>
                          <span className="text-slate-500">×</span>
                          <span className="bg-[#1a1a1a] text-white border border-slate-700 px-1.5 py-0.5 rounded font-bold">
                            {match.score_black}
                          </span>
                        </span>
                      )}
                      {/* Players count */}
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Users size={11} />
                        {match.player_count} jogadores
                      </span>
                      {/* MVP */}
                      {match.mvp_name && (
                        <span className="flex items-center gap-1 text-xs text-yellow-400 font-medium">
                          <Trophy size={11} />
                          {match.mvp_nickname ?? match.mvp_name}
                        </span>
                      )}
                      {/* Bola murche */}
                      {match.bola_murche_name && (
                        <span className={cn(
                          'text-xs text-slate-500',
                          'flex items-center gap-1'
                        )}>
                          🥀 {match.bola_murche_nickname ?? match.bola_murche_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={18} className="text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
