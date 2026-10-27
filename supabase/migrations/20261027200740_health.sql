-- Comprobación de salud: permite verificar desde la app que la conexión a la BD funciona.
create or replace function public.health()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select true;
$$;
revoke execute on function public.health() from public;
grant execute on function public.health() to anon, authenticated;
