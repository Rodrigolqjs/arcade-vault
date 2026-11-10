-- RANARIA (game jam "cruce de carriles sin fin", SPEC ranaria/01): texto del diseño original.
-- La fila ya existe desde la SPEC 06; accepts_scores sigue en false hasta ranaria/02.
update public.games
  set short = 'Cruza la autopista de píxeles sin fin.',
      long  = 'Salta carril a carril entre tráfico neón y troncos a la deriva hasta tocar un nenúfar. Cada nenúfar abre un tramo nuevo, más rápido y con menos nenúfares, y el reloj vuelve a 30 segundos. Ojo con los troncos que parpadean: están a punto de hundirse.'
where id = 'ranaria';
