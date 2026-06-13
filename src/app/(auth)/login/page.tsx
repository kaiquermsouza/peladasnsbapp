'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Lock, Mail, User } from 'lucide-react'

type Mode = 'login' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mode, setMode] = useState<Mode>('login')

  // Login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Signup state
  const [signupName, setSignupName] = useState('')
  const [signupNickname, setSignupNickname] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirm, setSignupConfirm] = useState('')
  const [signupLoading, setSignupLoading] = useState(false)

  function switchMode(m: Mode) {
    setMode(m)
    setLoginError('')
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setLoginError('Email ou senha incorretos.')
      toast.error('Falha no login.')
      setLoginLoading(false)
      return
    }

    toast.success('Bem-vindo!')
    router.push('/dashboard')
    router.refresh()
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()

    if (!signupName.trim() || !signupNickname.trim()) {
      toast.error('Preencha nome e apelido.')
      return
    }
    if (signupPassword.length < 6) {
      toast.error('Senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (signupPassword !== signupConfirm) {
      toast.error('As senhas não coincidem.')
      return
    }

    setSignupLoading(true)

    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        data: {
          name: signupName.trim(),
          nickname: signupNickname.trim(),
          role: 'player',
        },
      },
    })

    if (error) {
      toast.error('Erro ao criar conta: ' + error.message)
      setSignupLoading(false)
      return
    }

    toast.success('Conta criada! Entrando...')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">⚽</div>
          <h1 className="text-3xl font-bold text-white">
            <span className="text-green-400">Pelada</span> SNSB
          </h1>
          <p className="text-slate-400 text-sm mt-1">Onde a Foto no final vale tudo!!</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">

          {/* Tab switcher */}
          <div className="flex rounded-lg bg-slate-900 p-1 mb-6">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === 'login'
                  ? 'bg-green-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => switchMode('signup')}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === 'signup'
                  ? 'bg-green-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Criar Login
            </button>
          </div>

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 mt-3.5 pointer-events-none z-10" />
                <Input
                  id="email"
                  type="email"
                  label="Email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 mt-3.5 pointer-events-none z-10" />
                <Input
                  id="password"
                  type="password"
                  label="Senha"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  autoComplete="current-password"
                  required
                  error={loginError}
                />
              </div>
              <Button type="submit" className="w-full" size="lg" loading={loginLoading}>
                Entrar
              </Button>
            </form>
          )}

          {/* SIGNUP FORM */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-3">
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 mt-3.5 pointer-events-none z-10" />
                <Input
                  id="signup-name"
                  type="text"
                  label="Nome completo"
                  placeholder="João Silva"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
              <Input
                id="signup-nickname"
                type="text"
                label="Apelido"
                placeholder="Joaozinho"
                value={signupNickname}
                onChange={(e) => setSignupNickname(e.target.value)}
                required
              />
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 mt-3.5 pointer-events-none z-10" />
                <Input
                  id="signup-email"
                  type="email"
                  label="Email"
                  placeholder="seu@email.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="pl-9"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 mt-3.5 pointer-events-none z-10" />
                <Input
                  id="signup-password"
                  type="password"
                  label="Senha"
                  placeholder="Mínimo 6 caracteres"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 mt-3.5 pointer-events-none z-10" />
                <Input
                  id="signup-confirm"
                  type="password"
                  label="Confirmar senha"
                  placeholder="Repita a senha"
                  value={signupConfirm}
                  onChange={(e) => setSignupConfirm(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
              <Button type="submit" className="w-full mt-1" size="lg" loading={signupLoading}>
                Criar Conta
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
