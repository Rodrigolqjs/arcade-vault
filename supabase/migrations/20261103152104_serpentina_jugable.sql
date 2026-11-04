-- Serpiente jugable (SPEC 10): serpentina acepta puntuaciones.
update public.games
  set accepts_scores = true
where id = 'serpentina';
