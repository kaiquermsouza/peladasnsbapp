'use client'

import { useState } from 'react'
import { PlayerStats } from '@/types/database'
import Avatar from '@/components/ui/Avatar'

export interface PlayerVictories {
  player_id: string
  name: string
  nickname: string
  avatar_url: string | null
  victories: number
}

export interface TeamWinStats {
  white_wins: number
  black_wins: number
  draws: number
}
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { Target, Handshake, Star, Calendar, Trophy, Shield } from 'lucide-react'

type RankingKey = 'goals' | 'assists' | 'mvp' | 'presence' | 'score' | 'victories'

const TABS: { key: RankingKey; label: string; icon: React.ReactNode }[] = [
  { key: 'score',     label: 'Geral',      icon: <Trophy size={16} /> },
  { key: 'goals',     label: 'Artilheiro', icon: <Target size={16} /> },
  { key: 'assists',   label: 'Garçom',     icon: <Handshake size={16} /> },
  { key: 'mvp',       label: 'MVP',        icon: <Star size={16} /> },
  { key: 'presence',  label: 'Presença',   icon: <Calendar size={16} /> },
  { key: 'victories', label: 'Vitórias',   icon: <Shield size={16} /> },
]

interface Props {
  stats: PlayerStats[]
  playerVictories: PlayerVictories[]
  teamStats: TeamWinStats
}

export default function RankingsClient({ stats, playerVictories, teamStats }: Props) {
  const [activeTab, setActiveTab] = useState<RankingKey>('score')

  const isVictoriesTab = activeTab === 'victories'

  const statsTabMeta: Record<Exclude<RankingKey, 'victories'>, { field: keyof PlayerStats; unit: string; label: string }> = {
    score:    { field: 'total_score',     unit: 'pt',      label: 'Geral' },
    goals:    { field: 'total_goals',     unit: 'gol',     label: 'Artilheiro' },
    assists:  { field: 'total_assists',   unit: 'assist.', label: 'Garçom' },
    mvp:      { field: 'total_mvp_votes', unit: 'voto',    label: 'MVP' },
    presence: { field: 'total_matches',   unit: 'jogo',    label: 'Presença' },
  }

  const currentMeta = !isVictoriesTab ? statsTabMeta[activeTab as Exclude<RankingKey, 'victories'>] : null

  const sortedStats = !isVictoriesTab
    ? [...stats].sort((a, b) => (b[currentMeta!.field] as number) - (a[currentMeta!.field] as number))
    : []

  const sortedVictories = isVictoriesTab ? [...playerVictories] : []

  const totalMatches = teamStats.white_wins + teamStats.black_wins + teamStats.draws

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

      {/* Team wins card (shown on victories tab) */}
      {isVictoriesTab && (
        <Card className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Domínio por time</h2>
          {totalMatches === 0 ? (
            <p className="text-slate-500 text-sm">Nenhuma partida publicada ainda.</p>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🤍</span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white font-medium">Time Branco</span>
                    <span className="text-slate-300">{teamStats.white_wins} vitória{teamStats.white_wins !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-200 rounded-full transition-all"
                      style={{ width: `${totalMatches > 0 ? (teamStats.white_wins / totalMatches) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🖤</span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white font-medium">Time Preto</span>
                    <span className="text-slate-300">{teamStats.black_wins} vitória{teamStats.black_wins !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-700 rounded-full transition-all border border-slate-500"
                      style={{ width: `${totalMatches > 0 ? (teamStats.black_wins / totalMatches) * 100 : 0}%`, background: '#6b7280' }}
                    />
                  </div>
                </div>
              </div>
              {teamStats.draws > 0 && (
                <p className="text-xs text-slate-500">{teamStats.draws} empate{teamStats.draws !== 1 ? 's' : ''} em {totalMatches} partida{totalMatches !== 1 ? 's' : ''}</p>
              )}
            </>
          )}
        </Card>
      )}

      {/* Podium — only for stats tabs */}
      {!isVictoriesTab && sortedStats.length > 0 && (
        <div className="flex items-end justify-center gap-3 pt-4">
          {sortedStats[1] && (
            <PodiumCard
              name={sortedStats[1].name}
              nickname={sortedStats[1].nickname}
              avatarUrl={sortedStats[1].avatar_url}
              position={2}
              value={sortedStats[1][currentMeta!.field] as number}
              unit={currentMeta!.unit}
            />
          )}
          {sortedStats[0] && (
            <PodiumCard
              name={sortedStats[0].name}
              nickname={sortedStats[0].nickname}
              avatarUrl={sortedStats[0].avatar_url}
              position={1}
              value={sortedStats[0][currentMeta!.field] as number}
              unit={currentMeta!.unit}
            />
          )}
          {sortedStats[2] && (
            <PodiumCard
              name={sortedStats[2].name}
              nickname={sortedStats[2].nickname}
              avatarUrl={sortedStats[2].avatar_url}
              position={3}
              value={sortedStats[2][currentMeta!.field] as number}
              unit={currentMeta!.unit}
            />
          )}
        </div>
      )}

      {/* Victories podium */}
      {isVictoriesTab && sortedVictories.length > 0 && (
        <div className="flex items-end justify-center gap-3 pt-4">
          {sortedVictories[1] && (
            <PodiumCard
              name={sortedVictories[1].name}
              nickname={sortedVictories[1].nickname}
              avatarUrl={sortedVictories[1].avatar_url}
              position={2}
              value={sortedVictories[1].victories}
              unit="vitória"
            />
          )}
          {sortedVictories[0] && (
            <PodiumCard
              name={sortedVictories[0].name}
              nickname={sortedVictories[0].nickname}
              avatarUrl={sortedVictories[0].avatar_url}
              position={1}
              value={sortedVictories[0].victories}
              unit="vitória"
            />
          )}
          {sortedVictories[2] && (
            <PodiumCard
              name={sortedVictories[2].name}
              nickname={sortedVictories[2].nickname}
              avatarUrl={sortedVictories[2].avatar_url}
              position={3}
              value={sortedVictories[2].victories}
              unit="vitória"
            />
          )}
        </div>
      )}

      {/* Stats table */}
      {!isVictoriesTab && (
        sortedStats.length === 0 ? (
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
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">{currentMeta!.label}</th>
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
                  {sortedStats.map((player, i) => (
                    <tr
                      key={player.id}
                      className="border-b border-slate-700/50 last:border-0 hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="px-4 py-3"><PositionBadge position={i + 1} /></td>
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
                        {player[currentMeta!.field]}{' '}
                        <span className="text-slate-500 font-normal text-xs">
                          {currentMeta!.unit}{(player[currentMeta!.field] as number) !== 1 ? 's' : ''}
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
        )
      )}

      {/* Victories table */}
      {isVictoriesTab && (
        sortedVictories.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-4xl mb-3">🏆</div>
            <p className="text-white font-medium">Nenhuma vitória registrada ainda</p>
            <p className="text-slate-400 text-sm mt-1">As vitórias aparecem após as partidas serem publicadas com times e placar definidos.</p>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/50">
                    <th className="text-left px-4 py-3 text-slate-400 font-medium w-10">#</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Jogador</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Vitórias</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedVictories.map((player, i) => (
                    <tr
                      key={player.player_id}
                      className="border-b border-slate-700/50 last:border-0 hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="px-4 py-3"><PositionBadge position={i + 1} /></td>
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
                        {player.victories}{' '}
                        <span className="text-slate-500 font-normal text-xs">
                          vitória{player.victories !== 1 ? 's' : ''}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}
    </div>
  )
}

function PodiumCard({
  name, nickname, avatarUrl, position, value, unit,
}: {
  name: string
  nickname: string
  avatarUrl: string | null
  position: number
  value: number
  unit: string
}) {
  const heightClass = position === 1 ? 'h-36' : position === 2 ? 'h-28' : 'h-20'
  const medalEmoji = position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉'
  const borderClass =
    position === 1 ? 'border-yellow-500/50' : position === 2 ? 'border-slate-400/50' : 'border-amber-600/50'
  const bgClass =
    position === 1 ? 'bg-yellow-500/10' : position === 2 ? 'bg-slate-400/10' : 'bg-amber-600/10'

  return (
    <div className={cn('flex flex-col items-center gap-2', position === 1 ? 'order-2' : position === 2 ? 'order-1' : 'order-3')}>
      <Avatar name={name} avatarUrl={avatarUrl} size={position === 1 ? 'xl' : 'lg'} />
      <div className="text-center">
        <p className="text-white text-xs font-medium truncate max-w-[80px]">{nickname}</p>
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
