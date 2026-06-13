'use client'

import { useState } from 'react'
import { PlayerStats } from '@/types/database'
import Avatar from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { Target, Handshake, Star, Calendar, Trophy } from 'lucide-react'

type RankingKey = 'goals' | 'assists' | 'mvp' | 'presence' | 'score'

const TABS: { key: RankingKey; label: string; icon: React.ReactNode; field: keyof PlayerStats; unit: string }[] = [
  { key: 'goals', label: 'Artilheiro', icon: <Target size={16} />, field: 'total_goals', unit: 'gol' },
  { key: 'assists', label: 'Garçom', icon: <Handshake size={16} />, field: 'total_assists', unit: 'assist.' },
  { key: 'mvp', label: 'MVP', icon: <Star size={16} />, field: 'total_mvp_votes', unit: 'voto' },
  { key: 'presence', label: 'Presença', icon: <Calendar size={16} />, field: 'total_matches', unit: 'jogo' },
  { key: 'score', label: 'Geral', icon: <Trophy size={16} />, field: 'total_score', unit: 'pt' },
]

interface Props {
  stats: PlayerStats[]
}

export default function RankingsClient({ stats }: Props) {
  const [activeTab, setActiveTab] = useState<RankingKey>('score')
  const tab = TABS.find((t) => t.key === activeTab)!

  const sorted = [...stats].sort((a, b) => (b[tab.field] as number) - (a[tab.field] as number))
  const top3 = sorted.slice(0, 3)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Rankings</h1>
        <p className="text-slate-400 text-sm mt-1">Estatísticas gerais da pelada</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              activeTab === t.key
                ? 'bg-green-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Podium */}
      {top3.length > 0 && (
        <div className="flex items-end justify-center gap-3 pt-4">
          {top3[1] && <PodiumCard player={top3[1]} position={2} value={top3[1][tab.field] as number} unit={tab.unit} />}
          {top3[0] && <PodiumCard player={top3[0]} position={1} value={top3[0][tab.field] as number} unit={tab.unit} />}
          {top3[2] && <PodiumCard player={top3[2]} position={3} value={top3[2][tab.field] as number} unit={tab.unit} />}
        </div>
      )}

      {/* Full table */}
      {sorted.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-white font-medium">Nenhum dado disponível</p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/50">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium w-10">#</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Jogador</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium">{tab.label}</th>
                  {activeTab === 'score' && (
                    <>
                      <th className="text-right px-4 py-3 text-slate-400 font-medium hidden sm:table-cell">Gols</th>
                      <th className="text-right px-4 py-3 text-slate-400 font-medium hidden sm:table-cell">Assists</th>
                      <th className="text-right px-4 py-3 text-slate-400 font-medium hidden sm:table-cell">MVP</th>
                      <th className="text-right px-4 py-3 text-slate-400 font-medium hidden sm:table-cell">Jogos</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {sorted.map((player, i) => (
                  <tr
                    key={player.id}
                    className="border-b border-slate-700/50 last:border-0 hover:bg-slate-700/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <PositionBadge position={i + 1} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={player.name} avatarUrl={player.avatar_url} size="sm" />
                        <div>
                          <p className="font-medium text-white leading-none">{player.name}</p>
                          <p className="text-slate-400 text-xs mt-0.5">@{player.nickname}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-400">
                      {player[tab.field]}{' '}
                      <span className="text-slate-500 font-normal text-xs">
                        {tab.unit}{(player[tab.field] as number) !== 1 ? 's' : ''}
                      </span>
                    </td>
                    {activeTab === 'score' && (
                      <>
                        <td className="px-4 py-3 text-right text-slate-300 hidden sm:table-cell">{player.total_goals}</td>
                        <td className="px-4 py-3 text-right text-slate-300 hidden sm:table-cell">{player.total_assists}</td>
                        <td className="px-4 py-3 text-right text-slate-300 hidden sm:table-cell">{player.total_mvp_votes}</td>
                        <td className="px-4 py-3 text-right text-slate-300 hidden sm:table-cell">{player.total_matches}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {activeTab === 'score' && (
            <p className="text-xs text-slate-500 px-4 py-2 border-t border-slate-700">
              Fórmula: (gols × 3) + (assists × 2) + (MVP × 5) + (presenças × 1)
            </p>
          )}
        </Card>
      )}
    </div>
  )
}

function PodiumCard({
  player,
  position,
  value,
  unit,
}: {
  player: PlayerStats
  position: number
  value: number
  unit: string
}) {
  const heightClass = position === 1 ? 'h-36' : position === 2 ? 'h-28' : 'h-20'
  const medalEmoji = position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉'
  const borderClass =
    position === 1
      ? 'border-yellow-500/50'
      : position === 2
      ? 'border-slate-400/50'
      : 'border-amber-600/50'
  const bgClass =
    position === 1
      ? 'bg-yellow-500/10'
      : position === 2
      ? 'bg-slate-400/10'
      : 'bg-amber-600/10'

  return (
    <div className={cn('flex flex-col items-center gap-2', position === 1 ? 'order-2' : position === 2 ? 'order-1' : 'order-3')}>
      <Avatar name={player.name} avatarUrl={player.avatar_url} size={position === 1 ? 'xl' : 'lg'} />
      <div className="text-center">
        <p className="text-white text-xs font-medium truncate max-w-[80px]">{player.nickname}</p>
        <p className="text-green-400 text-sm font-bold">{value} {unit}</p>
      </div>
      <div
        className={cn(
          'w-20 rounded-t-lg flex items-start justify-center pt-2 border-t border-x',
          heightClass, borderClass, bgClass
        )}
      >
        <span className="text-2xl">{medalEmoji}</span>
      </div>
    </div>
  )
}

function PositionBadge({ position }: { position: number }) {
  if (position === 1) return <span className="text-lg">🥇</span>
  if (position === 2) return <span className="text-lg">🥈</span>
  if (position === 3) return <span className="text-lg">🥉</span>
  return <span className="text-slate-500 text-sm font-medium">{position}°</span>
}
