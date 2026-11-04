-- Arkanoid jugable (SPEC 09): bloque-buster acepta puntuaciones.
update public.games
  set accepts_scores = true
where id = 'bloque-buster';
