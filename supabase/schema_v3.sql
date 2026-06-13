-- ============================================================
-- Pelada SNSB — Schema v3: Times + Placar
-- Execute no SQL Editor do Supabase após o schema_v2.sql
-- ============================================================

-- 1. Coluna de time em match_players (white | black | null)
ALTER TABLE public.match_players
  ADD COLUMN IF NOT EXISTS team text
  CHECK (team IN ('white', 'black', null));

-- 2. Colunas de placar na tabela matches
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS score_white int DEFAULT 0;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS score_black int DEFAULT 0;
