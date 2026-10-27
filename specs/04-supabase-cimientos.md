# SPEC 04 — Cimientos de Supabase

> **Estado:** Implementado
> **Depende de:** ninguna
> **Fecha:** 2026-10-27
> **Objetivo:** Conectar la app a Supabase con clientes de servidor y navegador, migraciones versionadas con el Supabase CLI y un endpoint `/api/health` que demuestra que la conexión a la base de datos funciona.

## Por qué existe esta spec

"Implementar Supabase" abarca autenticación real, persistencia de puntuaciones y, quizá, el catálogo de juegos. Juntas tocan demasiadas áreas para una sola spec. Esta spec solo pone los cimientos que todas esas features necesitan: dependencias, variables de entorno, clientes, carpeta `supabase/` con migraciones y una comprobación de salud. No cambia nada visible en la app.

El proyecto remoto ya existe (`ptazjmejroiokyfumpav`, `https://ptazjmejroiokyfumpav.supabase.co`) y su esquema `public` está vacío. El desarrollo se hace contra ese proyecto remoto, sin stack local con Docker.

## Alcance

**Dentro:**

- Dependencias `@supabase/supabase-js` y `@supabase/ssr`.
- Supabase CLI como devDependency (`supabase`), usado con `npx supabase`.
- Carpeta `supabase/` creada con `npx supabase init` (incluye `config.toml` y su propio `.gitignore`), versionada.
- Vinculación al proyecto remoto con `npx supabase link --project-ref ptazjmejroiokyfumpav` (la hace el usuario; ver Riesgos).
- Primera migración `supabase/migrations/<timestamp>_health.sql` con la función `public.health()`, aplicada al remoto con `npx supabase db push`.
- `lib/supabase/server.ts`: `createClient()` asíncrono para Server Components, Server Actions y Route Handlers, con `createServerClient` y `await cookies()`.
- `lib/supabase/client.ts`: `createClient()` para Client Components, con `createBrowserClient`.
- Route Handler `GET /api/health` que llama a `rpc("health")` con el cliente de servidor. Disponible también en producción.
- Variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.example`.
- `CLAUDE.md`: comandos de Supabase y descripción de `supabase/` y `lib/supabase/`.

**Fuera de alcance (para futuras specs):**

- `proxy.ts` y refresco de sesión (`updateSession`). Va con la spec de auth.
- Autenticación real en `/login`, sesión en el Nav, logout y login social Google/GitHub.
- Tablas de puntuaciones, persistencia del modal "FIN DEL JUEGO" y Salón de la Fama con datos reales.
- Mover el catálogo `GAMES` a la base de datos.
- Tipos TypeScript generados (`supabase gen types`) y script `db:types`.
- Stack local con `npx supabase start` y Docker.
- Clave secreta (`SUPABASE_SECRET_KEY`) o cliente admin.
- Row Level Security de tablas (no hay tablas todavía).

## Modelo de datos

Una sola función SQL, sin tablas. `supabase/migrations/<timestamp>_health.sql`:

```sql
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
```

Respuesta de `GET /api/health`:

```ts
type HealthResponse = { ok: true } | { ok: false };
```

- `200 { ok: true }`: `rpc("health")` devuelve `data === true` sin `error`.
- `503 { ok: false }`: faltan variables de entorno, el RPC devuelve `error` o la llamada lanza. El detalle se registra con `console.error` en el servidor y nunca se envía al cliente.
- Cabecera `Cache-Control: no-store` en ambos casos.

Variables de entorno (en `.env.local`, nunca versionadas):

```bash
NEXT_PUBLIC_SUPABASE_URL=                # https://ptazjmejroiokyfumpav.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=    # clave sb_publishable_… del proyecto
```

## Estructura de archivos

```
app/
  api/
    health/
      route.ts                 # nuevo: GET → rpc("health") → 200 | 503
lib/
  supabase/
    server.ts                  # nuevo: createClient() async con createServerClient + cookies()
    client.ts                  # nuevo: createClient() con createBrowserClient
supabase/
  config.toml                  # nuevo (npx supabase init)
  .gitignore                   # nuevo (npx supabase init)
  migrations/
    <timestamp>_health.sql     # nuevo: función public.health()
.env.example                   # modificado: variables de Supabase
CLAUDE.md                      # modificado: comandos y layout de Supabase
package.json                   # modificado: @supabase/supabase-js, @supabase/ssr, supabase (dev)
```

## Plan de implementación

Antes de escribir código, leer `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` y la guía de `@supabase/ssr` para Next.js, como exige `AGENTS.md`. No hay UI, así que esta spec no invoca `/frontend-design`.

1. Instalar `@supabase/supabase-js` y `@supabase/ssr`, y `supabase` como devDependency. Añadir `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` a `.env.example` con comentarios. Verificación: `npx supabase --version` imprime la versión y `npm run build` pasa.
2. Crear `lib/supabase/server.ts` y `lib/supabase/client.ts`. El de servidor usa `getAll`/`setAll` sobre `await cookies()` y envuelve `setAll` en `try/catch` (en Server Components no se pueden escribir cookies). Verificación: `npx tsc --noEmit` y `npm run lint` pasan.
3. Ejecutar `npx supabase init`. El usuario ejecuta `npx supabase login` y `npx supabase link --project-ref ptazjmejroiokyfumpav`. Verificación: existe `supabase/config.toml` y `git status` no muestra `supabase/.temp/`.
4. Crear la migración con `npx supabase migration new health`, escribir el SQL del modelo de datos y aplicarla con `npx supabase db push`. Verificación: `npx supabase migration list` muestra la migración en local y remoto, y `select public.health();` devuelve `true`.
5. Crear `app/api/health/route.ts` con `GET`. Verificación: con `.env.local` válido, `curl -i localhost:3000/api/health` responde `200 {"ok":true}`; con una clave inválida responde `503 {"ok":false}`.
6. Actualizar `CLAUDE.md`: bloque de comandos con `npx supabase migration new <nombre>`, `npx supabase db push` y `npx supabase migration list`; sección de layout con `supabase/`, `lib/supabase/` y la regla de que el esquema solo cambia con migraciones. Verificación final: `npm run lint`, `npx tsc --noEmit` y `npm run build` sin errores.

## Criterios de aceptación

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `package.json` tiene `@supabase/supabase-js` y `@supabase/ssr` en `dependencies` y `supabase` en `devDependencies`.
- [ ] `npx supabase --version` funciona sin instalación global.
- [ ] `supabase/config.toml` y `supabase/migrations/<timestamp>_health.sql` están versionados; `supabase/.temp/` no.
- [ ] `npx supabase migration list` muestra la migración `health` aplicada en el remoto.
- [ ] En el remoto, `select public.health();` devuelve `true` y la función tiene `search_path` vacío.
- [ ] `lib/supabase/server.ts` exporta una función `createClient` asíncrona que usa `await cookies()`.
- [ ] `lib/supabase/client.ts` exporta `createClient` y solo usa variables `NEXT_PUBLIC_*`.
- [ ] Con `.env.local` válido, `GET /api/health` responde `200`, `{"ok":true}` y `Cache-Control: no-store`.
- [ ] Sin `NEXT_PUBLIC_SUPABASE_URL` o con una clave inválida, `GET /api/health` responde `503` y `{"ok":false}`, sin mensajes de error ni stack en el cuerpo.
- [ ] `/api/health` responde también tras `npm run build && npm run start`.
- [ ] `.env.example` lista las dos variables nuevas y `.env.local` sigue sin versionar.
- [ ] No existe `proxy.ts` en el repo.
- [ ] Las pantallas existentes (`/`, `/biblioteca`, `/salon`, `/acerca`, `/login`, `/juegos/[id]`) se ven y funcionan igual que antes.
- [ ] `CLAUDE.md` documenta los comandos `npx supabase` y las carpetas `supabase/` y `lib/supabase/`.

## Decisiones

- **Sí:** spec solo de cimientos. Auth, puntuaciones y catálogo van en specs propias; juntas tocaban más de tres áreas.
- **No:** incluir auth o puntuaciones aquí.
- **Sí:** `@supabase/ssr` además de `@supabase/supabase-js`. Es el paquete oficial para gestionar la sesión en cookies con el App Router.
- **No:** solo `@supabase/supabase-js`. Guarda la sesión en `localStorage` y no sirve para Server Components.
- **Sí:** Supabase CLI con migraciones SQL versionadas en `supabase/migrations/`. El esquema es reproducible y se revisa en PRs.
- **No:** cambios directos en el dashboard o con el MCP sin migración.
- **Sí:** desarrollo contra el proyecto remoto. Sin Docker; suficiente para un proyecto pequeño.
- **No:** stack local con `npx supabase start`.
- **Sí:** CLI como devDependency. Misma versión para todos y sin instalación global.
- **No:** instalación global con Homebrew.
- **Sí:** URL + publishable key (`sb_publishable_…`). Es el formato actual de Supabase y es seguro exponerlo al navegador.
- **No:** anon key legacy (JWT) ni clave secreta. La secreta no hace falta hasta que haya un cliente admin.
- **Sí:** ambos clientes (`server.ts` y `client.ts`) ya en esta spec. Son los que usarán las specs de auth y puntuaciones.
- **No:** `proxy.ts` ahora. Sin login no hay sesión que refrescar; se añade con la spec de auth.
- **Sí:** función `public.health()` + `GET /api/health`. Prueba URL, clave, red y base de datos de extremo a extremo.
- **No:** comprobar solo con `auth.getUser()`. No toca la base de datos.
- **Sí:** `/api/health` disponible en producción, sin detalles de error en la respuesta. Sirve para monitorizar el despliegue.
- **Sí:** Route Handler en lugar de Server Action. Se llama con `curl` o un monitor externo.
- **No:** tipos generados por ahora. Sin tablas no aportan; llegan con la primera spec que cree tablas.
- **Sí:** `health()` con `security invoker`, `search_path` vacío y `execute` solo para `anon` y `authenticated`. Evita los avisos de seguridad del advisor de Supabase.

## Riesgos

| Riesgo                                                                                                  | Mitigación                                                                                                                     |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `npx supabase login` y `link` piden token y contraseña de la BD; el agente no puede hacerlo solo        | El paso 3 lo ejecuta el usuario (`! npx supabase login` en Claude Code). El resto del plan continúa al terminar.               |
| `npx supabase db push` aplica cambios al único entorno, que es el remoto                                 | La migración solo crea una función idempotente (`create or replace`). Las specs con tablas deberán revisar el SQL antes de aplicarlo. |
| API de `@supabase/ssr` distinta a la conocida (`get`/`set`/`remove` frente a `getAll`/`setAll`)          | Usar la API de la versión instalada en el paso 1 y la guía oficial de Next.js.                                                 |
| `cookies()` es asíncrono en Next 16; los ejemplos antiguos lo llaman de forma síncrona                   | `createClient()` de servidor es `async` y usa `await cookies()`. Criterio de aceptación explícito.                             |
| `setAll` lanza al escribir cookies desde un Server Component                                             | `try/catch` en `setAll`; sin `proxy.ts` no hay sesión que refrescar en esta spec.                                              |
| Faltan variables de entorno en producción                                                               | `/api/health` responde `503 {ok:false}` en vez de un 500; el resto de la app no usa Supabase todavía.                          |
| `.gitignore` ignora `.env*`                                                                             | La excepción `!.env.example` ya existe desde la SPEC 03.                                                                       |

## Lo que **no** entra en esta spec

- `proxy.ts` y refresco de sesión.
- Autenticación real, sesión en el Nav y login social.
- Tablas de puntuaciones y Salón de la Fama con datos reales.
- Catálogo de juegos en la base de datos.
- Tipos generados y script `db:types`.
- Stack local con Docker.
- Clave secreta y cliente admin.

Cada uno de estos, si llega, va en su propia spec.
