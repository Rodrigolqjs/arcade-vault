-- Tetris jugable (SPEC 08): caida acepta puntuaciones.
update public.games
  set accepts_scores = true
where id = 'caida';
