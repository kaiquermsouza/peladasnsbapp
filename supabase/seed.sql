-- ============================================================
-- Pelada FC - Seed Data
-- Execute APÓS criar os usuários via Supabase Auth Admin API
-- Os UUIDs abaixo são exemplos — substitua pelos reais após criar via API
-- ============================================================

-- Para criar usuários de teste, use a API Admin do Supabase:
-- curl -X POST 'https://SEU_PROJECT.supabase.co/auth/v1/admin/users' \
--   -H 'apikey: SERVICE_ROLE_KEY' \
--   -H 'Content-Type: application/json' \
--   -d '{"email":"admin@peladafc.com","password":"Admin@123","email_confirm":true,"user_metadata":{"name":"Administrador","nickname":"admin","role":"admin"}}'

-- UUIDs de exemplo (substitua pelos gerados pelo Supabase Auth)
DO $$
DECLARE
  admin_id UUID := 'a0000000-0000-0000-0000-000000000001';
  player1_id UUID := 'a0000000-0000-0000-0000-000000000002';
  player2_id UUID := 'a0000000-0000-0000-0000-000000000003';
  player3_id UUID := 'a0000000-0000-0000-0000-000000000004';
  player4_id UUID := 'a0000000-0000-0000-0000-000000000005';
  player5_id UUID := 'a0000000-0000-0000-0000-000000000006';
  player6_id UUID := 'a0000000-0000-0000-0000-000000000007';
  player7_id UUID := 'a0000000-0000-0000-0000-000000000008';
  match1_id UUID := 'b0000000-0000-0000-0000-000000000001';
  match2_id UUID := 'b0000000-0000-0000-0000-000000000002';
  match3_id UUID := 'b0000000-0000-0000-0000-000000000003';
BEGIN

-- Profiles (o trigger cria automaticamente, mas podemos fazer upsert)
INSERT INTO public.profiles (id, name, nickname, role) VALUES
  (admin_id,   'Administrador',    'admin',    'admin'),
  (player1_id, 'Carlos Silva',     'Carlao',   'player'),
  (player2_id, 'Pedro Alves',      'Pedrinho', 'player'),
  (player3_id, 'Marcos Santos',    'Marquinho','player'),
  (player4_id, 'João Ferreira',    'Joaozinho','player'),
  (player5_id, 'Lucas Oliveira',   'Lukinha',  'player'),
  (player6_id, 'Rafael Costa',     'Rafa',     'player'),
  (player7_id, 'Gabriel Mendes',   'Gabizinho','player')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, nickname = EXCLUDED.nickname, role = EXCLUDED.role;

-- Partidas
INSERT INTO public.matches (id, match_date, location, notes, created_by) VALUES
  (match1_id, CURRENT_DATE - INTERVAL '14 days', 'Arena do Bairro',   'Pelada boa, muito gol!',    admin_id),
  (match2_id, CURRENT_DATE - INTERVAL '7 days',  'Campo do Parque',   'Chuva no intervalo.',       admin_id),
  (match3_id, CURRENT_DATE - INTERVAL '1 day',   'Arena do Bairro',   'Jogo equilibrado.',         admin_id)
ON CONFLICT (id) DO NOTHING;

-- Jogadores nas partidas com gols e assistências
INSERT INTO public.match_players (match_id, player_id, goals, assists, confirmed) VALUES
  -- Partida 1
  (match1_id, player1_id, 3, 1, true),
  (match1_id, player2_id, 2, 2, true),
  (match1_id, player3_id, 1, 3, true),
  (match1_id, player4_id, 0, 1, true),
  (match1_id, player5_id, 2, 0, true),
  (match1_id, player6_id, 1, 1, true),
  -- Partida 2
  (match2_id, player1_id, 1, 2, true),
  (match2_id, player2_id, 0, 1, true),
  (match2_id, player3_id, 2, 0, true),
  (match2_id, player5_id, 1, 1, true),
  (match2_id, player6_id, 0, 2, true),
  (match2_id, player7_id, 3, 0, true),
  -- Partida 3
  (match3_id, player1_id, 0, 0, true),
  (match3_id, player2_id, 1, 1, true),
  (match3_id, player3_id, 0, 2, true),
  (match3_id, player4_id, 2, 0, true),
  (match3_id, player6_id, 1, 0, true),
  (match3_id, player7_id, 0, 1, true)
ON CONFLICT (match_id, player_id) DO UPDATE SET goals = EXCLUDED.goals, assists = EXCLUDED.assists;

-- Votos MVP
INSERT INTO public.mvp_votes (match_id, voter_id, voted_for_id) VALUES
  -- Partida 1: player1 venceu
  (match1_id, player2_id, player1_id),
  (match1_id, player3_id, player1_id),
  (match1_id, player4_id, player2_id),
  (match1_id, player5_id, player1_id),
  (match1_id, player6_id, player3_id),
  -- Partida 2: player7 venceu
  (match2_id, player1_id, player7_id),
  (match2_id, player2_id, player7_id),
  (match2_id, player3_id, player6_id),
  (match2_id, player5_id, player7_id),
  (match2_id, player6_id, player3_id)
ON CONFLICT (match_id, voter_id) DO NOTHING;

END $$;
