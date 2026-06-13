-- ============================================================
-- Pelada SNSB — Schema v2: Votação com notas 1-10 + MVP
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. Colunas de controle na tabela matches
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS voting_status text DEFAULT 'draft'
  CHECK (voting_status IN ('draft', 'open', 'closed', 'published'));
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS voting_closes_at timestamptz;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS result_published_at timestamptz;

-- 2. Remover tabela antiga de votos
DROP TABLE IF EXISTS public.mvp_votes CASCADE;

-- 3. Tabela de avaliações (nota 1-10 + MVP)
CREATE TABLE IF NOT EXISTS public.player_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rated_player_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 10),
  is_mvp_vote boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(match_id, voter_id, rated_player_id),
  CHECK (voter_id <> rated_player_id)
);

ALTER TABLE public.player_ratings ENABLE ROW LEVEL SECURITY;

-- Apenas participantes podem votar, enquanto a votação está aberta
CREATE POLICY "player can rate" ON public.player_ratings
  FOR INSERT WITH CHECK (
    auth.uid() = voter_id
    AND EXISTS (
      SELECT 1 FROM public.match_players mp
      WHERE mp.match_id = player_ratings.match_id
        AND mp.player_id = auth.uid()
        AND mp.confirmed = true
    )
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = player_ratings.match_id
        AND m.voting_status = 'open'
        AND now() < m.voting_closes_at
    )
  );

CREATE POLICY "public read ratings" ON public.player_ratings
  FOR SELECT USING (true);

-- 4. Função: calcula deadline (quinta-feira 23:59 BRT da semana da partida)
CREATE OR REPLACE FUNCTION public.get_voting_deadline(match_date date)
RETURNS timestamptz AS $$
DECLARE
  dow int;
  days_until_thursday int;
  thursday_date date;
BEGIN
  dow := EXTRACT(DOW FROM match_date)::int; -- 0=dom, 1=seg ... 4=qui
  days_until_thursday := (4 - dow + 7) % 7;
  IF days_until_thursday = 0 THEN days_until_thursday := 7; END IF;
  thursday_date := match_date + days_until_thursday;
  RETURN (thursday_date::text || ' 23:59:59')::timestamp AT TIME ZONE 'America/Sao_Paulo';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Atualizar view player_stats para usar player_ratings como MVP
DROP VIEW IF EXISTS public.player_stats;

CREATE OR REPLACE VIEW public.player_stats AS
SELECT
  p.id,
  p.name,
  p.nickname,
  p.avatar_url,
  COALESCE(SUM(mp.goals), 0)::int                         AS total_goals,
  COALESCE(SUM(mp.assists), 0)::int                       AS total_assists,
  COUNT(DISTINCT mp.match_id)::int                         AS total_matches,
  COUNT(DISTINCT pr.match_id) FILTER (
    WHERE pr.is_mvp_vote = true
  )::int                                                   AS total_mvp_votes,
  ROUND(AVG(pr.rating), 2)                                 AS avg_rating,
  (
    COALESCE(SUM(mp.goals), 0) * 3
    + COALESCE(SUM(mp.assists), 0) * 2
    + COUNT(DISTINCT pr.match_id) FILTER (WHERE pr.is_mvp_vote = true) * 5
    + COUNT(DISTINCT mp.match_id)
  )::int                                                   AS total_score
FROM public.profiles p
LEFT JOIN public.match_players mp
  ON mp.player_id = p.id AND mp.confirmed = true
LEFT JOIN public.player_ratings pr
  ON pr.rated_player_id = p.id
WHERE p.active = true
GROUP BY p.id, p.name, p.nickname, p.avatar_url;

-- 6. RLS adicional: admin pode atualizar voting_status
CREATE POLICY "admin can update matches"
  ON public.matches FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
