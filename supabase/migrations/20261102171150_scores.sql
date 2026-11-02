-- Puntuaciones anónimas con iniciales (SPEC 07).
-- Solo los juegos con motor real aceptan puntuaciones; RLS no puede leer PLAYABLE_GAME_IDS.
alter table public.games
  add column accepts_scores boolean not null default false;
update public.games set accepts_scores = true where id = 'rocas';

create table public.scores (
  id         bigint generated always as identity primary key,
  game_id    text not null references public.games (id) on delete cascade,
  name       text not null check (name ~ '^[A-Z0-9_ ]{1,10}$' and name = btrim(name)),
  score      integer not null check (score between 0 and 10000000),
  created_at timestamptz not null default now()
);

-- Ranking: score desc, empate por created_at asc.
create index scores_ranking_idx on public.scores (game_id, score desc, created_at asc);

alter table public.scores enable row level security;

create policy "scores: lectura pública"
  on public.scores for select
  to anon, authenticated
  using (true);

create policy "scores: inserción en juegos que aceptan puntuaciones"
  on public.scores for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.games g
      where g.id = scores.game_id and g.accepts_scores
    )
  );

-- Supabase concede ALL por defecto en tablas nuevas de public: se revoca para que el
-- insert por columnas impida fijar id o created_at (y adelantarse en los empates).
revoke all on public.scores from anon, authenticated;
grant select on public.scores to anon, authenticated;
grant insert (game_id, name, score) on public.scores to anon, authenticated;

-- best es null sin puntuaciones; plays cuenta las puntuaciones guardadas.
create view public.game_stats
  with (security_invoker = true) as
  select g.id as game_id,
         max(s.score) as best,
         count(s.id)::integer as plays
  from public.games g
  left join public.scores s on s.game_id = g.id
  group by g.id;

revoke all on public.game_stats from anon, authenticated;
grant select on public.game_stats to anon, authenticated;
