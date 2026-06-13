# ⚽ Pelada FC

Sistema de gestão de pelada de futebol semanal — controle de presenças, gols, assistências e votação de MVP.

## Stack

- **Next.js 14** (App Router)
- **Supabase** (Auth + PostgreSQL + Row Level Security)
- **Tailwind CSS** (tema escuro)
- **TypeScript**

---

## Setup

### 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Aguarde o banco inicializar (~2 min)

### 2. Executar o schema SQL

No Supabase Dashboard → **SQL Editor**, cole e execute o conteúdo de `supabase/schema.sql`.

Isso criará:
- Tabelas: `profiles`, `matches`, `match_players`, `mvp_votes`
- View: `player_stats`
- RLS Policies
- Trigger automático de criação de perfil

### 3. Criar o usuário Admin

No Supabase Dashboard → **Authentication → Users → Add user**:

- Email: `admin@peladafc.com`
- Senha: (sua escolha)

Após criar, execute no SQL Editor:

```sql
INSERT INTO public.profiles (id, name, nickname, role)
VALUES (
  'UUID_DO_USUARIO_CRIADO',
  'Administrador',
  'admin',
  'admin'
)
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

### 4. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha com as chaves do Supabase Dashboard → Settings → API:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> A `SUPABASE_SERVICE_ROLE_KEY` é usada apenas em rotas de API server-side. Nunca exponha no cliente.

### 5. Instalar e rodar

```bash
npm install
npm run dev
```

Acesse http://localhost:3000 → redireciona para `/login`.

---

## Seed com dados de exemplo

Execute `supabase/seed.sql` no SQL Editor após criar os usuários via Auth. Os UUIDs no seed são exemplos — substitua pelos reais gerados pelo Supabase Auth.

---

## Deploy na Vercel

1. Push do código para GitHub
2. Importe o repositório na Vercel
3. Configure as variáveis de ambiente
4. Deploy automático

---

## Páginas

| Rota | Acesso | Descrição |
|------|--------|-----------|
| `/login` | Público | Formulário de login |
| `/dashboard` | Autenticado | Stats pessoais e votação |
| `/rankings` | Público | Rankings com pódio |
| `/matches` | Admin | Lista de partidas |
| `/matches/new` | Admin | Criar partida |
| `/matches/[id]/manage` | Admin | Gerenciar jogadores e stats |
| `/matches/[id]/vote` | Participante | Votar no MVP |
| `/admin/players` | Admin | Gerenciar jogadores |

---

## Fórmula de Pontuação Geral

```
(gols × 3) + (assistências × 2) + (votos MVP × 5) + (presenças × 1)
```
