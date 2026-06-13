'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Profile } from '@/types/database'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Avatar from '@/components/ui/Avatar'
import { Plus, UserX, UserCheck, Shield, Users, CheckCircle, XCircle, Loader2 } from 'lucide-react'

const DEFAULT_PASSWORD = 'PELADASNSB2026'
const EMAIL_DOMAIN = 'peladasnsb.com'

function toNickname(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function toEmail(nickname: string) {
  return `${nickname}@${EMAIL_DOMAIN}`
}

interface Props {
  initialPlayers: Profile[]
}

type ModalMode = 'single' | 'bulk'

interface BulkResult {
  name: string
  nickname: string
  email: string
  status: 'pending' | 'ok' | 'error'
  error?: string
}

export default function PlayersClient({ initialPlayers }: Props) {
  const [players, setPlayers] = useState<Profile[]>(initialPlayers)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>('single')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Single player form
  const [singleForm, setSingleForm] = useState({ name: '', nickname: '' })
  const [singleLoading, setSingleLoading] = useState(false)

  // Bulk form
  const [bulkText, setBulkText] = useState('')
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([])
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkDone, setBulkDone] = useState(false)

  function openModal(mode: ModalMode) {
    setModalMode(mode)
    setSingleForm({ name: '', nickname: '' })
    setBulkText('')
    setBulkResults([])
    setBulkDone(false)
    setModalOpen(true)
  }

  function closeModal() {
    if (bulkRunning) return
    setModalOpen(false)
  }

  // Auto-fill nickname from name
  function handleNameChange(name: string) {
    setSingleForm({ name, nickname: toNickname(name) })
  }

  async function handleCreateSingle(e: React.FormEvent) {
    e.preventDefault()
    const { name, nickname } = singleForm
    if (!name.trim() || !nickname.trim()) {
      toast.error('Nome e apelido são obrigatórios.')
      return
    }
    setSingleLoading(true)

    const res = await fetch('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        nickname: nickname.trim(),
        email: toEmail(nickname.trim()),
        password: DEFAULT_PASSWORD,
        role: 'player',
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error ?? 'Erro ao criar jogador')
    } else {
      toast.success(`${name} criado! Login: ${toEmail(nickname.trim())}`)
      setPlayers((prev) => [...prev, data.profile])
      closeModal()
    }
    setSingleLoading(false)
  }

  async function handleBulkCreate() {
    const lines = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    if (lines.length === 0) {
      toast.error('Adicione pelo menos um nome.')
      return
    }

    const results: BulkResult[] = lines.map((name) => {
      const nick = toNickname(name)
      return { name, nickname: nick, email: toEmail(nick), status: 'pending' }
    })
    setBulkResults(results)
    setBulkRunning(true)

    const created: Profile[] = []

    for (let i = 0; i < results.length; i++) {
      const r = results[i]
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: r.name,
          nickname: r.nickname,
          email: r.email,
          password: DEFAULT_PASSWORD,
          role: 'player',
        }),
      })
      const data = await res.json()

      results[i] = res.ok
        ? { ...r, status: 'ok' }
        : { ...r, status: 'error', error: data.error ?? 'Erro desconhecido' }

      setBulkResults([...results])

      if (res.ok && data.profile) created.push(data.profile)
    }

    setPlayers((prev) => [...prev, ...created])
    setBulkRunning(false)
    setBulkDone(true)

    const ok = results.filter((r) => r.status === 'ok').length
    const fail = results.filter((r) => r.status === 'error').length
    if (fail === 0) toast.success(`${ok} jogador${ok !== 1 ? 'es' : ''} criado${ok !== 1 ? 's' : ''}!`)
    else toast.error(`${ok} criados, ${fail} com erro.`)
  }

  async function handleToggleActive(player: Profile) {
    setTogglingId(player.id)
    const res = await fetch(`/api/players/${player.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !player.active }),
    })
    if (res.ok) {
      setPlayers((prev) =>
        prev.map((p) => (p.id === player.id ? { ...p, active: !p.active } : p))
      )
      toast.success(player.active ? 'Jogador desativado' : 'Jogador reativado')
    } else {
      toast.error('Erro ao alterar status')
    }
    setTogglingId(null)
  }

  const activePlayers = players.filter((p) => p.active)
  const inactivePlayers = players.filter((p) => !p.active)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Jogadores</h1>
          <p className="text-slate-400 text-sm mt-1">
            {activePlayers.length} ativo{activePlayers.length !== 1 ? 's' : ''}
            {inactivePlayers.length > 0 && ` · ${inactivePlayers.length} inativo${inactivePlayers.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => openModal('bulk')} className="flex items-center gap-2">
            <Users size={15} />
            Criar em Lote
          </Button>
          <Button onClick={() => openModal('single')} className="flex items-center gap-2">
            <Plus size={15} />
            Novo Jogador
          </Button>
        </div>
      </div>

      {/* Info sobre login */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-400">
        🔑 Senha padrão de todos os jogadores: <span className="text-white font-mono font-semibold">{DEFAULT_PASSWORD}</span>
        <span className="mx-2 text-slate-600">·</span>
        Login: <span className="text-slate-300">apelido@{EMAIL_DOMAIN}</span>
      </div>

      <PlayerList players={activePlayers} onToggle={handleToggleActive} togglingId={togglingId} active />

      {inactivePlayers.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">Inativos</h2>
          <PlayerList players={inactivePlayers} onToggle={handleToggleActive} togglingId={togglingId} active={false} />
        </div>
      )}

      {/* Modal único jogador */}
      <Modal
        open={modalOpen && modalMode === 'single'}
        onClose={closeModal}
        title="Novo Jogador"
      >
        <form onSubmit={handleCreateSingle} className="space-y-4">
          <Input
            id="name"
            label="Nome completo *"
            placeholder="João Silva"
            value={singleForm.name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
          />
          <Input
            id="nickname"
            label="Apelido (login)"
            placeholder="gerado automaticamente"
            value={singleForm.nickname}
            onChange={(e) => setSingleForm((f) => ({ ...f, nickname: e.target.value }))}
          />
          <div className="bg-slate-900 rounded-lg px-3 py-2 text-xs text-slate-400 space-y-1">
            <p>📧 Email de login: <span className="text-white">{singleForm.nickname ? toEmail(singleForm.nickname) : '—'}</span></p>
            <p>🔑 Senha: <span className="text-white font-mono">{DEFAULT_PASSWORD}</span></p>
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={singleLoading}>Criar</Button>
          </div>
        </form>
      </Modal>

      {/* Modal lote */}
      <Modal
        open={modalOpen && modalMode === 'bulk'}
        onClose={closeModal}
        title="Criar Jogadores em Lote"
        className="max-w-xl"
      >
        <div className="space-y-4">
          {!bulkDone && !bulkRunning && (
            <>
              <p className="text-slate-400 text-sm">
                Cole um nome por linha. O apelido e email serão gerados automaticamente.
              </p>
              <textarea
                rows={8}
                placeholder={'Carlos Silva\nPedro Alves\nMarcos Santos\nJoão Ferreira'}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
              <div className="bg-slate-900 rounded-lg px-3 py-2 text-xs text-slate-400 space-y-1">
                <p>🔑 Todos receberão a senha: <span className="text-white font-mono">{DEFAULT_PASSWORD}</span></p>
                <p>📧 Email gerado: <span className="text-slate-300">primeironome@{EMAIL_DOMAIN}</span></p>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="secondary" className="flex-1" onClick={closeModal}>Cancelar</Button>
                <Button className="flex-1" onClick={handleBulkCreate}>
                  Criar {bulkText.split('\n').filter(l => l.trim()).length || ''} Jogadores
                </Button>
              </div>
            </>
          )}

          {(bulkRunning || bulkDone) && (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {bulkResults.map((r, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-700/50 last:border-0">
                  <div className="flex-shrink-0">
                    {r.status === 'pending' && <Loader2 size={16} className="text-slate-400 animate-spin" />}
                    {r.status === 'ok' && <CheckCircle size={16} className="text-green-400" />}
                    {r.status === 'error' && <XCircle size={16} className="text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium leading-none">{r.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{r.email}</p>
                    {r.error && <p className="text-xs text-red-400 mt-0.5">{r.error}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {bulkDone && (
            <Button className="w-full" onClick={closeModal}>Fechar</Button>
          )}
        </div>
      </Modal>
    </div>
  )
}

function PlayerList({
  players, onToggle, togglingId, active,
}: {
  players: Profile[]
  onToggle: (p: Profile) => void
  togglingId: string | null
  active: boolean
}) {
  if (players.length === 0) {
    return (
      <Card className="text-center py-8">
        <p className="text-slate-400 text-sm">Nenhum jogador {active ? 'ativo' : 'inativo'}.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {players.map((player) => (
        <Card key={player.id} className={`flex items-center gap-3 flex-wrap ${!active ? 'opacity-60' : ''}`}>
          <Avatar name={player.name} avatarUrl={player.avatar_url} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-white text-sm">{player.name}</p>
              {player.role === 'admin' && (
                <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">
                  <Shield size={10} /> Admin
                </span>
              )}
            </div>
            <p className="text-slate-400 text-xs">@{player.nickname} · {player.nickname}@{EMAIL_DOMAIN}</p>
          </div>
          <Button
            variant={active ? 'danger' : 'secondary'}
            size="sm"
            onClick={() => onToggle(player)}
            loading={togglingId === player.id}
            className="flex items-center gap-1.5 whitespace-nowrap"
          >
            {active ? <><UserX size={13} /> Desativar</> : <><UserCheck size={13} /> Reativar</>}
          </Button>
        </Card>
      ))}
    </div>
  )
}
