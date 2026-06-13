export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Permissão negada' }, { status: 403 })
  }

  const { name, nickname, email, password, role } = await request.json()

  if (!name || !nickname || !email || !password) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, nickname, role: role ?? 'player' },
  })

  if (authError || !authUser.user) {
    return NextResponse.json(
      { error: authError?.message ?? 'Erro ao criar usuário' },
      { status: 400 }
    )
  }

  // Upsert profile (trigger may have created it already)
  const { data: newProfile, error: profileError } = await adminClient
    .from('profiles')
    .upsert({
      id: authUser.user.id,
      name,
      nickname,
      role: role ?? 'player',
      active: true,
    })
    .select()
    .single()

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  return NextResponse.json({ profile: newProfile }, { status: 201 })
}
