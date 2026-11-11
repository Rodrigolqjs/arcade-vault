-- Quita a la API el permiso de ejecutar rls_auto_enable() (SPEC 16).
-- Es la función security definer del event trigger que activa RLS en las tablas
-- nuevas de public. La creó Supabase, no una migración del repo, y estaba expuesta
-- en /rest/v1/rpc/rls_auto_enable. Postgres no comprueba execute al disparar un
-- event trigger, así que el trigger sigue funcionando.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
