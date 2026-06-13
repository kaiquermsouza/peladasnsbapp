-- ============================================================
-- Pelada FC - Schema SQL completo com RLS
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELAS
-- ============================================================

-- Perfis dos jogadores (espelha auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nickname TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('admin', 'player')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partidas
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_date DATE NOT NULL,
  location TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Jogadores em cada partida
CREATE TABLE IF NOT EXISTS public.match_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  goals INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  confirmed BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(match_id, player_id)
);

-- Votos MVP
CREATE TABLE IF NOT EXISTS public.mvp_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  voted_for_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_id, voter_id),
  CHECK (voter_id != voted_for_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mvp_votes ENABLE ROW LEVEL SECURITY;

-- Helper function: verifica se o usuário atual é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND active = true
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: verifica se o usuário participou de uma partida
CREATE OR REPLACE FUNCTION public.is_match_participant(p_match_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.match_players
    WHERE match_id = p_match_id AND player_id = auth.uid() AND confirmed = true
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ---- PROFILES policies ----

CREATE POLICY "Leitura pública de profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Admin pode criar profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin pode editar qualquer profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Usuário pode editar próprio profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---- MATCHES policies ----

CREATE POLICY "Leitura pública de matches"
  ON public.matches FOR SELECT
  USING (true);

CREATE POLICY "Admin pode criar matches"
  ON public.matches FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin pode editar matches"
  ON public.matches FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin pode deletar matches"
  ON public.matches FOR DELETE
  USING (public.is_admin());

-- ---- MATCH_PLAYERS policies ----

CREATE POLICY "Leitura pública de match_players"
  ON public.match_players FOR SELECT
  USING (true);

CREATE POLICY "Admin pode inserir match_players"
  ON public.match_players FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin pode atualizar match_players"
  ON public.match_players FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin pode deletar match_players"
  ON public.match_players FOR DELETE
  USING (public.is_admin());

-- ---- MVP_VOTES policies ----

CREATE POLICY "Leitura pública de mvp_votes"
  ON public.mvp_votes FOR SELECT
  USING (true);

CREATE POLICY "Participante pode votar em sua partida"
  ON public.mvp_votes FOR INSERT
  WITH CHECK (
    voter_id = auth.uid()
    AND public.is_match_participant(match_id)
    AND voted_for_id != auth.uid()
  );

-- ============================================================
-- TRIGGER: cria profile automaticamente ao criar user no Auth
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, nickname, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'player')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- VIEWS para rankings (leitura otimizada)
-- ============================================================

CREATE OR REPLACE VIEW public.player_stats AS
SELECT
  p.id,
  p.name,
  p.nickname,
  p.avatar_url,
  COALESCE(SUM(mp.goals), 0) AS total_goals,
  COALESCE(SUM(mp.assists), 0) AS total_assists,
  COUNT(DISTINCT mp.match_id) AS total_matches,
  COUNT(DISTINCT mv.id) AS total_mvp_votes,
  COALESCE(SUM(mp.goals) * 3, 0)
    + COALESCE(SUM(mp.assists) * 2, 0)
    + COUNT(DISTINCT mv.id) * 5
    + COUNT(DISTINCT mp.match_id) AS total_score
FROM public.profiles p
LEFT JOIN public.match_players mp ON mp.player_id = p.id AND mp.confirmed = true
LEFT JOIN public.mvp_votes mv ON mv.voted_for_id = p.id
WHERE p.active = true
GROUP BY p.id, p.name, p.nickname, p.avatar_url;

-- ============================================================
-- SEED: dados de exemplo
-- ============================================================

-- Nota: os UUIDs dos usuários precisam ser criados via Auth Admin API.
-- O seed abaixo usa UUIDs fixos para referência nos testes locais.
-- Execute após criar os usuários no Supabase Auth.

-- Inserção de partidas de exemplo (será executada via seed.sql separado)
-- Ver arquivo supabase/seed.sql
