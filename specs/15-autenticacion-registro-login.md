# SPEC 15 — Autenticación: registro, inicio de sesión y recuperación

> **Estado:** implementada
> **Depende de:** SPEC 01, SPEC 04
> **Fecha:** 2026-11-10
> **Objetivo:** Sustituir el `AuthForm` visual de `/login` por autenticación real con Supabase Auth (email y contraseña con confirmación, Google y GitHub, y recuperación de contraseña), con un perfil `public.profiles` con nombre de usuario único y la sesión visible en el Nav.

## Por qué existe esta spec

Hoy `/login` es solo la maqueta de la SPEC 01: `AuthForm` no crea ninguna sesión y cualquier botón navega a `/biblioteca`. `lib/supabase/server.ts` ignora la escritura de cookies en Server Components a la espera de un `proxy.ts` que refresque la sesión, y `CLAUDE.md` deja ese proxy para "la spec de auth". Esta es esa spec.

La app sigue siendo pública: nadie necesita cuenta para jugar ni para guardar puntuaciones con iniciales. La sesión solo identifica al jugador y cambia el Nav. Vincular puntuaciones a la cuenta queda para otra spec, que podrá apoyarse en `public.profiles`.

Se decidió hacerlo todo en una spec, aunque toca muchas piezas. Por eso el plan avanza de forma que cada paso deja la app funcionando, y los pasos que dependen de configuración externa (dashboard de Supabase, apps OAuth) están aislados.

## Alcance

**Dentro:**

- Migración `supabase/migrations/<timestamp>_profiles.sql`:
  - Tabla `public.profiles` (1:1 con `auth.users`) con `username` único, en minúsculas, `^[a-z0-9_]{3,16}$`, que puede ser `null` mientras el jugador no lo haya elegido.
  - Trigger `on_auth_user_created` en `auth.users` que crea la fila de perfil. Toma el `username` de `raw_user_meta_data->>'username'` si es válido y está libre, y si no lo deja en `null`. El trigger nunca hace fallar el registro.
  - RLS: lectura pública (`anon`, `authenticated`). El dueño puede actualizar solo la columna `username` y solo mientras sea `null`. Sin `insert` ni `delete` desde la API.
- Regenerar `lib/supabase/database.types.ts` con `npm run db:types`.
- Refresco de sesión:
  - `lib/supabase/proxy.ts` exporta `updateSession(request)`: crea un `createServerClient` sobre las cookies de la petición y la respuesta, y valida el JWT con `supabase.auth.getClaims()`.
  - `proxy.ts` en la raíz (convención de Next 16) llama a `updateSession`. Su `matcher` excluye `_next/static`, `_next/image`, `favicon.ico` y los ficheros con extensión de imagen.
  - Se actualiza el comentario de `setAll` en `lib/supabase/server.ts`: ahora el proxy refresca la sesión.
- Esquemas compartidos en `lib/auth/schemas.ts` (zod), usados por los formularios y por los Server Actions:
  - `email`: email válido, ≤ 254.
  - `password`: 8–72 caracteres.
  - `username`: se normaliza con `trim().toLowerCase()` y después se valida con `^[a-z0-9_]{3,16}$`.
  - `next`: ruta interna que empieza por `/` y no por `//`. Si no es válida, se usa `/biblioteca`.
- Server Actions en `app/login/actions.ts`. Todos devuelven `{ ok: true }` o `{ ok: false, error, fields? }` con `error` ∈ `"validation" | "credentials" | "unconfirmed" | "taken" | "rate" | "unknown"`, o terminan con `redirect()`:
  - `signIn(formData)`: `signInWithPassword`. Si va bien, `redirect("/biblioteca")`. "Invalid login credentials" → `credentials`. "Email not confirmed" → `unconfirmed`.
  - `signUp(formData)`: valida, comprueba que el `username` no existe en `public.profiles` (`taken` si existe) y llama a `signUp` con `options.data.username` y `emailRedirectTo` = `${NEXT_PUBLIC_SITE_URL}/auth/confirm`. Si va bien, devuelve `{ ok: true }` y el formulario muestra "REVISA TU CORREO". Para un email ya registrado se muestra el mismo mensaje (Supabase no revela si existe).
  - `signInWithProvider(formData)`: `provider` ∈ `"google" | "github"`. Llama a `signInWithOAuth` con `redirectTo` = `${NEXT_PUBLIC_SITE_URL}/auth/callback` y hace `redirect(data.url)`.
  - `requestPasswordReset(formData)`: `resetPasswordForEmail(email)`. Siempre devuelve `{ ok: true }` salvo en `validation` o `rate`, y el formulario muestra "SI EXISTE UNA CUENTA CON ESE CORREO, TE HEMOS ENVIADO UN ENLACE".
  - `updatePassword(formData)`: exige sesión, valida `password` y su repetición (`confirm`), llama a `updateUser({ password })` y hace `redirect("/biblioteca")`.
  - `chooseUsername(formData)`: exige sesión, valida y actualiza `profiles.username` del usuario actual. Una violación de unicidad (`23505`) → `taken`. Si va bien, `redirect("/biblioteca")`.
  - `signOut()`: `auth.signOut()` y `redirect("/")`.
  - Un error con estado 429 o código `over_email_send_rate_limit` / `over_request_rate_limit` → `rate`. Cualquier otro error de Supabase se registra en el servidor y devuelve `unknown`.
- Route Handlers:
  - `app/auth/confirm/route.ts` (`GET`): lee `token_hash`, `type` (`email` | `recovery`) y `next`, llama a `verifyOtp({ token_hash, type })` y redirige a `next` validado. Si falla o faltan parámetros, redirige a `/login?aviso=enlace-invalido`.
  - `app/auth/callback/route.ts` (`GET`): lee `code`, llama a `exchangeCodeForSession(code)` y redirige a `/login/usuario` si el perfil no tiene `username`, o a `/biblioteca` si lo tiene. Si falla, redirige a `/login?aviso=error-oauth`.
- Pantallas. Todas reutilizan `.av-auth-wrap` y `.auth-card` del prototipo, se diseñan con `/frontend-design` y, con sesión iniciada, se comportan como se indica:
  - `/login` (`app/login/page.tsx`, Server Component): con sesión, `redirect("/biblioteca")`. Lee `?aviso=` y pasa el mensaje a `AuthForm`:
    - `enlace-invalido`: "EL ENLACE NO ES VÁLIDO O HA CADUCADO".
    - `error-oauth`: "NO SE PUDO INICIAR SESIÓN CON EL PROVEEDOR".
  - `AuthForm` (`components/AuthForm.tsx`) conserva las pestañas INICIAR SESIÓN / CREAR CUENTA:
    - INICIAR SESIÓN: campos Correo electrónico y Contraseña (el campo Usuario desaparece de esta pestaña) y el enlace "¿OLVIDASTE TU CONTRASEÑA?" a `/login/recuperar`.
    - CREAR CUENTA: campos Usuario, Correo electrónico y Contraseña. Debajo del campo Usuario, la pista "3–16 · a-z 0-9 _".
    - Los formularios usan `useActionState` con el Server Action de cada pestaña. Mientras está pendiente, el botón se deshabilita con el texto "PROCESANDO…".
    - Los errores se muestran en un bloque `role="alert"` sobre el botón: `credentials` "EMAIL O CONTRASEÑA INCORRECTOS", `unconfirmed` "CONFIRMA TU CORREO ANTES DE ENTRAR", `taken` "ESE USUARIO YA EXISTE", `rate` "DEMASIADOS INTENTOS · ESPERA UNOS MINUTOS", `unknown` "ALGO FALLÓ · INTÉNTALO DE NUEVO". `validation` marca cada campo inválido con su mensaje.
    - Tras registrarse, la tarjeta sustituye el formulario por "REVISA TU CORREO" con el email usado y un botón "VOLVER A INICIAR SESIÓN".
    - Los botones GOOGLE y GITHUB son formularios que llaman a `signInWithProvider`.
    - "JUGAR COMO INVITADO" se mantiene y navega a `/biblioteca`.
  - `/login/recuperar`: campo Correo electrónico y botón "ENVIAR ENLACE". Tras enviarlo, muestra el mensaje neutro de `requestPasswordReset`. Enlace "VOLVER" a `/login`.
  - `/login/nueva-clave`: sin sesión, `redirect("/login?aviso=enlace-invalido")`. Campos Contraseña nueva y Repetir contraseña, botón "GUARDAR CONTRASEÑA". Si no coinciden: "LAS CONTRASEÑAS NO COINCIDEN".
  - `/login/usuario`: sin sesión, `redirect("/login")`. Con `username` ya elegido, `redirect("/biblioteca")`. Campo Usuario con la misma pista, botón "ELEGIR USUARIO".
  - Los formularios de las tres subpantallas viven en `components/auth/` (`ResetRequestForm.tsx`, `NewPasswordForm.tsx`, `UsernameForm.tsx`).
- Nav:
  - `lib/data/auth.ts` exporta `getCurrentPlayer()` (solo servidor): devuelve `null` sin sesión, o `{ id, email, username }` leyendo `public.profiles` (`username` puede ser `null`).
  - `app/layout.tsx` llama a `getCurrentPlayer()` y pasa `player` a `<Nav player={player} />`.
  - Sin sesión: el botón "Iniciar Sesión" actual.
  - Con sesión: el `username` en neón cian (o "ELIGE USUARIO" enlazando a `/login/usuario` si es `null`) y un botón "SALIR", que es un formulario con `signOut`. En el panel móvil, lo mismo al final de la lista.
- Variable de entorno nueva `NEXT_PUBLIC_SITE_URL` (`http://localhost:3000` en desarrollo), añadida a `.env.example`. Si falta, los Server Actions que la usan devuelven `unknown` y registran el motivo.
- Configuración manual en el dashboard de Supabase (la hace el usuario; queda documentada en el plan):
  - Authentication → Sign In / Providers → Email: "Confirm email" activado y longitud mínima de contraseña 8.
  - Authentication → URL Configuration: Site URL `http://localhost:3000` y Redirect URLs `http://localhost:3000/**`.
  - Authentication → Emails: la plantilla "Confirm signup" enlaza a `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/biblioteca` y "Reset password" a `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/login/nueva-clave`.
  - Providers Google y GitHub activados con el Client ID y el secreto de sus apps OAuth. La URL de callback de esas apps es `https://ptazjmejroiokyfumpav.supabase.co/auth/v1/callback`.
- Correos con el SMTP por defecto de Supabase.
- `CLAUDE.md`: fila de `/login` y rutas nuevas en la tabla de rutas, `public.profiles`, `proxy.ts`, `lib/supabase/proxy.ts`, `lib/data/auth.ts`, `NEXT_PUBLIC_SITE_URL` y los pasos manuales del dashboard. Se elimina "There is no `proxy.ts` yet".

**Fuera de alcance (para futuras specs):**

- Vincular `public.scores` a la cuenta (`user_id`) o prefijar las iniciales con el `username`.
- Página de perfil, cambiar el `username` una vez elegido, cambiar el email y borrar la cuenta.
- Proteger rutas: todas siguen siendo públicas y el modo invitado se mantiene.
- Iniciar sesión con el `username` en lugar del email.
- Reenviar el correo de confirmación desde la app.
- SMTP propio (Resend u otro) y plantillas de correo con el diseño de la app.
- Magic link, OTP por SMTP, SMS, MFA y otros proveedores OAuth.
- URL de producción en Site URL y Redirect URLs (se añade a mano cuando exista un despliegue).
- Cambios en `supabase/config.toml` (no hay stack local; la configuración real está en el proyecto remoto).
- Framework de tests.

## Modelo de datos

`supabase/migrations/<timestamp>_profiles.sql` (esbozo; el SQL final se revisa antes de `db push`):

```sql
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{3,16}$'),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
-- Lectura pública; actualización del propio username solo mientras sea null
create policy "profiles_select" on public.profiles for select to anon, authenticated using (true);
create policy "profiles_set_username" on public.profiles for update to authenticated
  using (id = (select auth.uid()) and username is null)
  with check (id = (select auth.uid()));
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (username) on public.profiles to authenticated;
-- Trigger: crea el perfil al registrarse; nunca falla el registro
create function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = '' as $$ ... $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
```

`handle_new_user` normaliza `raw_user_meta_data->>'username'` con `lower(trim(...))`. Si cumple el patrón y no existe, lo guarda; si no, inserta la fila con `username = null`. Una carrera entre dos registros con el mismo `username` se resuelve igual: el segundo queda con `null` y elige otro en `/login/usuario`.

Tipos en la app:

```ts
// lib/data/auth.ts
export interface CurrentPlayer {
  id: string;
  email: string;
  username: string | null;
}
// app/login/actions.ts
export type AuthError =
  "validation" | "credentials" | "unconfirmed" | "taken" | "rate" | "unknown";
export type AuthResult =
  | { ok: true }
  | { ok: false; error: AuthError; fields?: Partial<Record<string, string>> };
```

`public.scores` y `public.games` no cambian.

## Plan de implementación

1. **Migración de perfiles.** Crear `supabase/migrations/<timestamp>_profiles.sql` con `npx supabase migration new profiles`, revisar el SQL, aplicarlo con `npx supabase db push --linked` y regenerar los tipos con `npm run db:types`. Comprobar con el MCP de Supabase (`list_tables`, `get_advisors`) que la tabla existe, tiene RLS y no hay avisos de seguridad nuevos. La app no cambia de comportamiento.
2. **Proxy de sesión.** Crear `lib/supabase/proxy.ts` (`updateSession`) y `proxy.ts` con su `matcher`. Actualizar el comentario de `lib/supabase/server.ts`. Comprobar que `/`, `/biblioteca`, un juego y `/api/health` siguen respondiendo igual.
3. **Configuración del dashboard (usuario).** El usuario activa "Confirm email", fija la contraseña mínima en 8, configura Site URL y Redirect URLs y cambia las plantillas "Confirm signup" y "Reset password". Añadir `NEXT_PUBLIC_SITE_URL` a `.env.example` y a `.env.local`.
4. **Esquemas y acciones de email.** Crear `lib/auth/schemas.ts` y `app/login/actions.ts` con `signIn`, `signUp` y `signOut`, y el Route Handler `app/auth/confirm/route.ts`.
5. **AuthForm real.** Reescribir `components/AuthForm.tsx` con `useActionState`, los estados de error, "PROCESANDO…" y el panel "REVISA TU CORREO". `app/login/page.tsx` redirige con sesión y traduce `?aviso=`. Los botones GOOGLE y GITHUB siguen sin acción hasta el paso 8. Prueba manual: registrarse, confirmar desde el correo, llegar a `/biblioteca` con sesión, cerrar el navegador y volver con sesión.
6. **Sesión en el Nav.** Crear `lib/data/auth.ts` (`getCurrentPlayer`), pasar `player` desde `app/layout.tsx` y mostrar el `username` y "SALIR" en `components/Nav.tsx` (escritorio y panel móvil).
7. **Recuperación de contraseña.** Añadir `requestPasswordReset` y `updatePassword`, las páginas `/login/recuperar` y `/login/nueva-clave` y sus formularios en `components/auth/`, y el enlace "¿OLVIDASTE TU CONTRASEÑA?". Prueba manual: pedir el enlace, abrirlo, cambiar la contraseña y entrar con la nueva.
8. **OAuth.** El usuario crea las apps OAuth de Google y GitHub y activa los dos providers en el dashboard. Añadir `signInWithProvider`, el Route Handler `app/auth/callback/route.ts` y conectar los botones GOOGLE y GITHUB.
9. **Elegir usuario.** Añadir `chooseUsername`, la página `/login/usuario` y `components/auth/UsernameForm.tsx`. Prueba manual: primer login con GitHub → `/login/usuario` → elegir usuario → el Nav lo muestra.
10. **Documentación.** Actualizar `CLAUDE.md` según el alcance. Pasar `npm run lint`, `npx tsc --noEmit` y `npm run build`.

## Criterios de aceptación

- [x] `public.profiles` existe con RLS activado, y `get_advisors` (security) no muestra avisos nuevos sobre ella.
- [x] Con la clave publicable y sin sesión, `select` sobre `public.profiles` funciona e `insert`, `update` y `delete` fallan.
- [x] Un usuario autenticado no puede cambiar el `username` de otro, ni el suyo si ya no es `null`.
- [ ] Registrarse con un `username` libre crea un usuario en `auth.users` y su fila en `public.profiles` con ese `username` en minúsculas.
- [x] Registrarse con un `username` existente muestra "ESE USUARIO YA EXISTE" y no crea ningún usuario.
- [x] Un `username` con mayúsculas se guarda en minúsculas; uno de 2 caracteres o con `-` muestra un error en el campo sin llamar a Supabase.
- [ ] Tras registrarse, la tarjeta muestra "REVISA TU CORREO" y llega un correo de confirmación.
- [ ] Iniciar sesión antes de confirmar muestra "CONFIRMA TU CORREO ANTES DE ENTRAR".
- [ ] El enlace de confirmación lleva a `/biblioteca` con la sesión iniciada.
- [ ] Un enlace de confirmación ya usado o manipulado lleva a `/login` con "EL ENLACE NO ES VÁLIDO O HA CADUCADO".
- [x] Una contraseña incorrecta muestra "EMAIL O CONTRASEÑA INCORRECTOS".
- [x] Mientras un formulario se envía, su botón está deshabilitado y muestra "PROCESANDO…".
- [x] Con sesión, el Nav muestra el `username` y "SALIR" en escritorio y en el panel móvil, y no muestra "Iniciar Sesión".
- [x] "SALIR" cierra la sesión, lleva a `/` y el Nav vuelve a mostrar "Iniciar Sesión".
- [x] Con sesión, abrir `/login` redirige a `/biblioteca`.
- [x] La sesión sobrevive a recargar la página y a cerrar y abrir el navegador.
- [x] `/login/recuperar` muestra el mismo mensaje neutro para un email registrado y para uno inexistente.
- [ ] El enlace de recuperación abre `/login/nueva-clave`; tras guardar, la contraseña antigua deja de funcionar y la nueva sí.
- [x] `/login/nueva-clave` sin sesión redirige a `/login` con el aviso de enlace inválido.
- [x] Dos contraseñas distintas en `/login/nueva-clave` muestran "LAS CONTRASEÑAS NO COINCIDEN".
- [x] GOOGLE y GITHUB llevan al proveedor y, al volver, la sesión queda iniciada.
- [x] El primer login OAuth lleva a `/login/usuario`; tras elegir un usuario libre, el Nav lo muestra y los siguientes logins van directos a `/biblioteca`.
- [x] Cancelar en el proveedor OAuth lleva a `/login` con "NO SE PUDO INICIAR SESIÓN CON EL PROVEEDOR".
- [x] `next=//evil.com` en `/auth/confirm` redirige a `/biblioteca`, no fuera de la app.
- [x] "JUGAR COMO INVITADO" sigue llevando a `/biblioteca`, y jugar y guardar puntuaciones con iniciales funciona igual sin sesión.
- [x] `/api/health` sigue devolviendo `200 {ok:true}`.
- [x] `/login` y sus subpantallas no tienen scroll horizontal a 375 px de ancho.
- [x] `npm run lint`, `npx tsc --noEmit` y `npm run build` pasan sin errores.

> **Nota de verificación (2026-11-10):** la spec se marca como implementada con seis criterios sin marcar, pendientes de una prueba manual del flujo de email y contraseña. Necesitan un correo real de una dirección del equipo, porque el SMTP por defecto no entrega a otras. Son: registro con usuario libre desde la app, correo de confirmación y "REVISA TU CORREO", "CONFIRMA TU CORREO ANTES DE ENTRAR", enlace de confirmación hasta `/biblioteca`, enlace ya usado, y recuperación completa de contraseña. Lo que sí está verificado:
>
> - El trigger (minúsculas, `null` si el usuario está ocupado) y la RLS se comprobaron con SQL en una transacción revertida, con roles `anon` y `authenticated` simulados.
> - Un token manipulado en `/auth/confirm` lleva a `/login?aviso=enlace-invalido`.
> - `safeNext` convierte `//evil.com`, `/\evil.com` y `https://evil.com` en `/biblioteca`.
> - Formularios, avisos y ancho de 375 px, con Playwright.
> - OAuth con Google y GitHub, elegir usuario, el Nav con sesión y "SALIR", en la prueba manual del usuario (perfiles `rod123` y `px_kai`).
> - `get_advisors` no da avisos sobre `profiles` ni `handle_new_user`. Los dos que aparecen son ajenos a esta spec: `public.rls_auto_enable()`, que ya existía antes, y la protección contra contraseñas filtradas, desactivada en la configuración de Auth.

## Decisiones

- **Sí:** todo en una spec (email, OAuth, recuperación, perfil, proxy y Nav), decidido por el usuario. Se consideró separar OAuth en una SPEC 16. El plan aísla OAuth en los pasos 8 y 9 para que un bloqueo de configuración externa no frene el resto.
- **Sí:** email y contraseña con confirmación obligatoria. Es el comportamiento por defecto de Supabase y evita cuentas con emails ajenos.
- **Sí:** iniciar sesión solo con email. **No:** email o usuario, porque obligaría a una función `security definer` que traduce usuario → email y permite enumerar cuentas.
- **Sí:** `public.profiles` con `username` único creado por trigger. **No:** guardarlo solo en `user_metadata`, que no garantiza unicidad ni es consultable desde otras tablas.
- **Sí:** `username` nullable y elección en `/login/usuario`. Los usuarios OAuth no traen uno, y una colisión en el trigger no debe romper el registro. **No:** generar el usuario automáticamente desde el nombre del proveedor.
- **Sí:** el `username` solo se puede fijar una vez (la policy exige `username is null`). Cambiarlo es otra spec.
- **Sí:** comprobar la disponibilidad del `username` en `signUp` antes de llamar a Supabase. Así el caso normal da un error claro, y la restricción `unique` del trigger cubre la carrera.
- **Sí:** Server Actions con zod en `app/login/actions.ts`, como `sendContactMessage`. **No:** llamar a Supabase Auth desde el cliente; la validación quedaría solo en el navegador y las cookies las escribiría el cliente.
- **Sí:** confirmación y recuperación con `token_hash` + `verifyOtp` en `/auth/confirm`. Funciona aunque el enlace se abra en otro navegador o dispositivo. **No:** el flujo PKCE con `?code=` para los correos, que exige abrir el enlace en el mismo navegador. OAuth sí usa `?code=` en `/auth/callback`, porque siempre vuelve al mismo navegador.
- **Sí:** `proxy.ts` con `getClaims()` para refrescar la sesión en cada petición. **No:** proteger rutas en el proxy: ninguna ruta exige sesión.
- **Sí:** `getCurrentPlayer()` en `app/layout.tsx` y `player` como prop del Nav. Hace dinámicas todas las páginas, que en su mayoría ya lo eran por leer la base de datos. **No:** `onAuthStateChange` en el Nav del cliente, que mostraría "Iniciar Sesión" un instante antes de cargar el usuario.
- **Sí:** mensajes neutros en registro y recuperación, que no revelan si un email existe.
- **Sí:** SMTP por defecto de Supabase. Tiene un límite bajo de envíos por hora y solo entrega a direcciones del equipo del proyecto, lo que basta para desarrollo. SMTP propio va en otra spec.
- **Sí:** contraseña de 8–72 caracteres (72 es el límite de bcrypt). El mínimo de Supabase se sube a 8 en el dashboard para que coincida.
- **Sí:** `NEXT_PUBLIC_SITE_URL` para construir `emailRedirectTo` y `redirectTo`. **No:** deducir el origen de las cabeceras de la petición, que se pueden falsificar.
- **No:** tocar `supabase/config.toml`. No hay stack local, y la configuración de Auth real vive en el proyecto remoto.

## Riesgos

| Riesgo                                                                                            | Mitigación                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El SMTP por defecto limita los envíos por hora y no entrega a direcciones ajenas al equipo        | Error `rate` con mensaje claro. Las pruebas se hacen con direcciones del equipo. SMTP propio en otra spec.                                                                   |
| Las plantillas de correo no se cambian en el dashboard y los enlaces no pasan por `/auth/confirm` | Paso 3 del plan explícito y criterio de aceptación de confirmación. Sin el cambio, el enlace no inicia sesión y se detecta al probar.                                        |
| El trigger `security definer` falla y bloquea todos los registros                                 | El trigger nunca lanza excepciones por el `username` (inserta `null` si no es válido o está ocupado). Se revisa con `get_advisors` y con un registro de prueba en el paso 5. |
| Open redirect con `next` en `/auth/confirm`                                                       | `next` se valida con el esquema de `lib/auth/schemas.ts` (empieza por `/`, no por `//`) y si no, se usa `/biblioteca`.                                                       |
| Un usuario OAuth nunca elige usuario                                                              | El Nav muestra "ELIGE USUARIO" enlazando a `/login/usuario` mientras `username` sea `null`. Nada más depende del `username` en esta spec.                                    |
| Las apps OAuth de Google o GitHub no están listas                                                 | OAuth está aislado en los pasos 8 y 9. Los pasos 1–7 se pueden cerrar sin él.                                                                                                |

## Lo que **no** entra en esta spec

- Puntuaciones vinculadas a la cuenta.
- Perfil, cambio de `username` o email y borrado de cuenta.
- Rutas protegidas.
- Login por `username`, magic link, MFA y otros proveedores.
- SMTP propio y plantillas de correo con diseño.
- URL de producción.

Cada una, si llega, va en su propia spec.
