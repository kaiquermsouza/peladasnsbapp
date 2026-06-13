import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Parse .env.local without requiring dotenv
function loadEnv(filePath: string): Record<string, string> {
  const content = fs.readFileSync(filePath, 'utf-8')
  const env: Record<string, string> = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
  }
  return env
}

const envPath = path.resolve(__dirname, '..', '.env.local')
const env = loadEnv(envPath)

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
const SUPABASE_SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados em .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PASSWORD = 'PELADASNSB2026'

const players = [
  { name: 'Teste Um',     nickname: 'teste1', email: 'teste1@peladasnsb.com' },
  { name: 'Teste Dois',   nickname: 'teste2', email: 'teste2@peladasnsb.com' },
  { name: 'Teste Três',   nickname: 'teste3', email: 'teste3@peladasnsb.com' },
  { name: 'Teste Quatro', nickname: 'teste4', email: 'teste4@peladasnsb.com' },
  { name: 'Teste Cinco',  nickname: 'teste5', email: 'teste5@peladasnsb.com' },
]

async function main() {
  let created = 0
  const failed: string[] = []

  for (const player of players) {
    process.stdout.write(`Criando ${player.name} (${player.email})... `)

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: player.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { name: player.name, nickname: player.nickname, role: 'player' },
    })

    if (authError || !authData.user) {
      console.log(`❌ ${authError?.message ?? 'Erro desconhecido'}`)
      failed.push(player.name)
      continue
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: authData.user.id,
      name: player.name,
      nickname: player.nickname,
      role: 'player',
      active: true,
    })

    if (profileError) {
      console.log(`❌ Perfil: ${profileError.message}`)
      failed.push(player.name)
      continue
    }

    console.log(`✅ (id: ${authData.user.id})`)
    created++
  }

  console.log('\n─── Resultado ───────────────')
  console.log(`✅ Criados com sucesso: ${created}/${players.length}`)
  if (failed.length > 0) {
    console.log(`❌ Falhas: ${failed.join(', ')}`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
