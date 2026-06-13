'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewMatchPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    match_date: new Date().toISOString().split('T')[0],
    location: '',
    notes: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Não autenticado'); setLoading(false); return }

    const { data, error } = await supabase
      .from('matches')
      .insert({
        match_date: form.match_date,
        location: form.location || null,
        notes: form.notes || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error || !data) {
      toast.error('Erro ao criar partida: ' + (error?.message ?? 'desconhecido'))
      setLoading(false)
      return
    }

    toast.success('Partida criada!')
    router.push(`/matches/${data.id}/manage`)
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/matches">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Nova Partida</h1>
          <p className="text-slate-400 text-sm">Preencha os dados da pelada</p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="match_date"
            name="match_date"
            type="date"
            label="Data da Partida *"
            value={form.match_date}
            onChange={handleChange}
            required
          />

          <Input
            id="location"
            name="location"
            type="text"
            label="Local (opcional)"
            placeholder="Ex: Arena do Bairro"
            value={form.location}
            onChange={handleChange}
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="notes" className="text-sm font-medium text-slate-300">
              Observações (opcional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Alguma observação sobre a pelada..."
              value={form.notes}
              onChange={handleChange}
              className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Link href="/matches" className="flex-1">
              <Button variant="secondary" className="w-full" type="button">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" className="flex-1" loading={loading}>
              Criar Partida
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
