'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Profile } from '@/types/database'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Avatar from '@/components/ui/Avatar'
import { User, Lock, Save } from 'lucide-react'

interface Props {
  profile: Profile
  userEmail: string
}

export default function SettingsClient({ profile, userEmail }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [profileForm, setProfileForm] = useState({
    name: profile.name,
    nickname: profile.nickname,
  })
  const [passwordForm, setPasswordForm] = useState({
    password: '',
    confirm: '',
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!profileForm.name.trim() || !profileForm.nickname.trim()) {
      toast.error('Nome e apelido são obrigatórios.')
      return
    }
    setSavingProfile(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        name: profileForm.name.trim(),
        nickname: profileForm.nickname.trim(),
      })
      .eq('id', profile.id)

    if (error) {
      toast.error('Erro ao salvar: ' + error.message)
    } else {
      toast.success('Perfil atualizado!')
      router.refresh()
    }
    setSavingProfile(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (passwordForm.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (passwordForm.password !== passwordForm.confirm) {
      toast.error('As senhas não coincidem.')
      return
    }
    setSavingPassword(true)

    const { error } = await supabase.auth.updateUser({
      password: passwordForm.password,
    })

    if (error) {
      toast.error('Erro ao alterar senha: ' + error.message)
    } else {
      toast.success('Senha alterada com sucesso!')
      setPasswordForm({ password: '', confirm: '' })
    }
    setSavingPassword(false)
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <p className="text-slate-400 text-sm mt-1">Edite seu perfil e senha</p>
      </div>

      {/* Avatar preview */}
      <div className="flex items-center gap-4 p-4 bg-slate-800 border border-slate-700 rounded-xl">
        <Avatar name={profileForm.name || profile.name} avatarUrl={profile.avatar_url} size="xl" />
        <div>
          <p className="font-semibold text-white">{profileForm.name || profile.name}</p>
          <p className="text-slate-400 text-sm">@{profileForm.nickname || profile.nickname}</p>
          <p className="text-slate-500 text-xs mt-0.5">{userEmail}</p>
        </div>
      </div>

      {/* Profile form */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <User size={18} className="text-green-400" />
          <h2 className="font-semibold text-white">Dados do Perfil</h2>
        </div>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <Input
            id="name"
            label="Nome completo"
            value={profileForm.name}
            onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Seu nome"
            required
          />
          <Input
            id="nickname"
            label="Apelido"
            value={profileForm.nickname}
            onChange={(e) => setProfileForm((f) => ({ ...f, nickname: e.target.value }))}
            placeholder="Seu apelido"
            required
          />
          <Button type="submit" loading={savingProfile} className="w-full flex items-center justify-center gap-2">
            <Save size={15} />
            Salvar Perfil
          </Button>
        </form>
      </Card>

      {/* Password form */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Lock size={18} className="text-green-400" />
          <h2 className="font-semibold text-white">Alterar Senha</h2>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            id="password"
            type="password"
            label="Nova senha"
            value={passwordForm.password}
            onChange={(e) => setPasswordForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="Mínimo 6 caracteres"
            required
          />
          <Input
            id="confirm"
            type="password"
            label="Confirmar nova senha"
            value={passwordForm.confirm}
            onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))}
            placeholder="Repita a senha"
            required
          />
          <Button type="submit" loading={savingPassword} variant="secondary" className="w-full flex items-center justify-center gap-2">
            <Lock size={15} />
            Alterar Senha
          </Button>
        </form>
      </Card>
    </div>
  )
}
