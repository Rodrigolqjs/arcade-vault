-- Cruce de carriles jugable (SPEC ranaria/02): ranaria acepta puntuaciones.
update public.games
  set accepts_scores = true
where id = 'ranaria';
