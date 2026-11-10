-- Perfiles de jugador 1:1 con auth.users (SPEC 15).
-- username es null hasta que el jugador lo elige (OAuth o colisión en el registro).
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text unique check (username ~ '^[a-z0-9_]{3,16}$'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: lectura pública"
  on public.profiles for select
  to anon, authenticated
  using (true);

-- El dueño fija su username una sola vez: solo mientras la fila actual lo tenga a null.
create policy "profiles: elegir username propio"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()) and username is null)
  with check (id = (select auth.uid()));

-- Supabase concede ALL por defecto en tablas nuevas de public: solo lectura y el
-- update de la columna username; la fila la crea el trigger, nunca la API.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (username) on public.profiles to authenticated;

-- Crea el perfil al registrarse. Nunca hace fallar el registro: un username inválido,
-- ocupado o perdido en una carrera se guarda como null y se elige en /login/usuario.
create function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  wanted text := lower(btrim(new.raw_user_meta_data ->> 'username'));
begin
  if wanted is not null and wanted ~ '^[a-z0-9_]{3,16}$' then
    begin
      insert into public.profiles (id, username) values (new.id, wanted);
      return new;
    exception when unique_violation then
      -- Otro registro se quedó el username: el perfil queda sin él.
      null;
    end;
  end if;
  insert into public.profiles (id, username) values (new.id, null)
    on conflict (id) do nothing;
  return new;
end;
$$;

-- Solo la ejecuta el trigger: no se expone como RPC.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
