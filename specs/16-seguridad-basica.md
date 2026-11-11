# SPEC 16 — Seguridad básica: cabeceras, Auth endurecido y advisors de Supabase a cero

> **Estado:** Aprobada
> **Depende de:** SPEC 06, SPEC 07, SPEC 15
> **Fecha:** 2026-11-10
> **Objetivo:** Cerrar el checklist de `reference/security/security-checklist.md` con cabeceras de seguridad en Next.js, protección contra contraseñas filtradas, límite de registros por IP y una migración que deja sin avisos el panel de seguridad de Supabase.

## Por qué existe esta spec

`reference/security/security-checklist.md` enumera seis medidas. Al escribir esta spec, su estado real es este:

- **RLS en `games` y `scores`:** ya activo desde sus migraciones (`20261102164944_games.sql`, `20261102171150_scores.sql`), igual que en `profiles`. Solo se verifica.
- **Contraseña mínima de 8:** ya configurada en el dashboard (SPEC 15) y validada por `lib/auth/schemas.ts`. Solo se verifica.
- **Protección contra contraseñas filtradas:** desactivada. Es uno de los avisos de `get_advisors`.
- **Límite de registros por IP:** el valor por defecto de Supabase (30 cada 5 min).
- **Cabeceras de seguridad:** ninguna. `next.config.ts` está vacío.
- **Panel de avisos de Supabase:** `get_advisors` (security) da tres avisos:
  - `auth_leaked_password_protection`: la protección contra contraseñas filtradas.
  - `anon_security_definer_function_executable` y `authenticated_security_definer_function_executable`: los dos sobre `public.rls_auto_enable()`. Es una función `security definer` que devuelve `event_trigger` y activa RLS en cada tabla nueva de `public`. No viene de ninguna migración del repo (la creó Supabase en el proyecto), pero `anon` y `authenticated` tienen `execute` sobre ella y aparece en `/rest/v1/rpc/rls_auto_enable`.
- `get_advisors` (performance) no da ningún aviso.

## Alcance

**Dentro:**

- Cabeceras de seguridad en `next.config.ts`, con `headers()` y `source: "/(.*)"`, para todas las respuestas:
  - `X-Content-Type-Options: nosniff`.
  - `X-Frame-Options: DENY`.
  - `Referrer-Policy: strict-origin-when-cross-origin`.
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains`, sin `preload`.
  - Las cabeceras viven en una constante `securityHeaders` en el mismo `next.config.ts`.
- Migración `supabase/migrations/<timestamp>_revoke_rls_auto_enable.sql` (`npx supabase migration new revoke_rls_auto_enable`):
  - `revoke execute on function public.rls_auto_enable() from public, anon, authenticated;`
  - La función y su event trigger no se tocan: siguen activando RLS en las tablas nuevas.
  - Después, `npm run db:types` (el fichero de tipos no debería cambiar; se regenera por la regla del proyecto).
- Configuración del dashboard de Supabase (la hace el usuario, en el paso indicado del plan):
  - Authentication → Attack Protection (o Password security): activar "Prevent use of leaked passwords".
  - Authentication → Rate Limits: "Rate limit for sign ups and sign ins" a **10 cada 5 minutos por IP**.
  - Authentication → Email: comprobar que "Minimum password length" sigue en 8.
- Mensaje de contraseña filtrada en `app/login/actions.ts`:
  - `signUp`: un error con `code === "weak_password"` devuelve `{ ok: false, error: "validation", fields: { password } }`, igual que ya hace `updatePassword`.
  - En `signUp` y `updatePassword`, si `error.reasons` incluye `"pwned"`, el mensaje del campo es "ESA CONTRASEÑA APARECE EN FILTRACIONES · ELIGE OTRA". Si no, se mantiene "CONTRASEÑA DEMASIADO DÉBIL".
  - Los textos viven junto a los demás mensajes de campo de `app/login/actions.ts`; `AUTH_ERROR_TEXT` y el tipo `AuthError` no cambian.
- Verificación de RLS: `games`, `scores` y `profiles` con `relrowsecurity = true` (consulta de solo lectura a `pg_class` con el MCP) y `get_advisors` (security) sin avisos.
- Documentación:
  - `CLAUDE.md`: las cabeceras en "Stack and layout", la migración de `rls_auto_enable` y los dos ajustes nuevos en "Manual dashboard setup".
  - `reference/security/security-checklist.md`: marcar las casillas cumplidas.

**Fuera de alcance (para futuras specs):**

- `Content-Security-Policy`: con Next necesita nonces en `proxy.ts` y probar Resend, OAuth y los juegos. Va en su propia spec.
- Reenviar la IP real del cliente a Supabase Auth (`Sb-Forwarded-For`) para que el límite por IP funcione en producción (ver Riesgos).
- Protección de rutas en `proxy.ts`: hoy no hay rutas privadas (decisión de la SPEC 15). Cuando las haya, por ejemplo un perfil de jugador, irán en su propia spec.
- CAPTCHA en registro (Turnstile / hCaptcha).
- Límite de envíos del formulario de contacto de `/acerca` más allá del honeypot actual.
- MFA, SMTP propio, URL de producción.
- Avisos de rendimiento de Supabase (hoy no hay ninguno).

## Modelo de datos

Esta spec no introduce tablas, columnas ni tipos nuevos. Solo cambia un permiso:

```sql
-- supabase/migrations/<timestamp>_revoke_rls_auto_enable.sql
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
```

En el código, la forma del error de Supabase que se lee en `signUp` y `updatePassword`:

```ts
// AuthWeakPasswordError de @supabase/supabase-js
{ code: "weak_password", reasons: ("length" | "characters" | "pwned")[] }
```

## Plan de implementación

1. **Cabeceras.** Añadir `securityHeaders` y `headers()` en `next.config.ts` (leer antes la guía de `headers` en `node_modules/next/dist/docs/`). Comprobar con `curl -sI http://localhost:3000/` y `curl -sI http://localhost:3000/api/health` que salen las cinco cabeceras, y que `/`, `/biblioteca`, un juego jugable y `/login` cargan igual.
2. **Migración de `rls_auto_enable`.** Crear la migración con `npx supabase migration new revoke_rls_auto_enable`, revisar el SQL, aplicarla con `npx supabase db push --linked` y ejecutar `npm run db:types`. Comprobar con `get_advisors` (security) que desaparecen los dos avisos de `rls_auto_enable`. Comprobar con una consulta de solo lectura que el event trigger sigue `enabled`.
3. **Mensaje de contraseña filtrada.** En `app/login/actions.ts`, tratar `weak_password` en `signUp` como error de campo y distinguir `reasons` con `"pwned"` en `signUp` y `updatePassword`. La app funciona igual mientras la protección siga desactivada.
4. **Dashboard (usuario).** El usuario activa "Prevent use of leaked passwords", fija el límite de sign ups y sign ins en 10 cada 5 minutos y comprueba la longitud mínima de 8. Si el plan del proyecto no permite la protección contra contraseñas filtradas, se para aquí y se apunta en la spec (ver Riesgos). Prueba manual: registrarse con `password123` muestra el mensaje de filtración en el campo Contraseña.
5. **Verificación de RLS y advisors.** Consultar `relrowsecurity` de `games`, `scores` y `profiles` y ejecutar `get_advisors` (security y performance).
6. **Documentación.** Actualizar `CLAUDE.md` y marcar `reference/security/security-checklist.md`. Pasar `npm run lint`, `npx tsc --noEmit` y `npm run build`.

## Criterios de aceptación

- [x] `curl -sI http://localhost:3000/` devuelve `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()` y `Strict-Transport-Security: max-age=63072000; includeSubDomains`.
- [x] Las mismas cinco cabeceras salen en `/api/health`, `/juegos/rocas/jugar` y `/login`.
- [x] Con las cabeceras puestas, `/`, `/biblioteca`, `/salon`, `/acerca`, `/login` y los cinco juegos jugables cargan sin errores nuevos en la consola.
- [x] Una página HTML local con `<iframe src="http://localhost:3000/">` no muestra la app.
- [ ] El inicio de sesión con GitHub o Google sigue funcionando y vuelve con la sesión iniciada.
- [x] `games`, `scores` y `profiles` tienen `relrowsecurity = true`.
- [x] `anon` y `authenticated` no tienen `execute` sobre `public.rls_auto_enable()` (`has_function_privilege` devuelve `false`).
- [x] Una tabla creada después de la migración en una transacción revertida sigue teniendo RLS activado (el event trigger sigue funcionando).
- [ ] `get_advisors` (security) no devuelve ningún aviso.
- [x] `get_advisors` (performance) no devuelve ningún aviso.
- [ ] El dashboard muestra la protección contra contraseñas filtradas activada, la longitud mínima en 8 y el límite de sign ups y sign ins en 10 cada 5 minutos.
- [ ] Registrarse con `password123` muestra "ESA CONTRASEÑA APARECE EN FILTRACIONES · ELIGE OTRA" bajo el campo Contraseña y no crea ningún usuario.
- [ ] En `/login/nueva-clave`, guardar `password123` muestra el mismo mensaje en el campo.
- [x] Una contraseña de 7 caracteres sigue mostrando el error de validación de zod sin llamar a Supabase.
- [x] Intentos de inicio de sesión fallidos seguidos desde la misma IP, más rápidos que el ritmo de 10 cada 5 minutos, acaban devolviendo 429 y la app muestra "DEMASIADOS INTENTOS · ESPERA UNOS MINUTOS". Supabase usa un *token bucket* con ráfaga de hasta 30 peticiones: el límite es el ritmo de recarga, así que el bloqueo llega al agotarse la ráfaga, no en el undécimo intento.
- [x] Jugar y guardar una puntuación con iniciales sin sesión funciona igual.
- [x] `/api/health` sigue devolviendo `200 {ok:true}`.
- [x] `CLAUDE.md` documenta las cabeceras, la migración y los ajustes nuevos del dashboard, y el checklist de `reference/security/` tiene sus casillas marcadas.
- [x] `npm run lint`, `npx tsc --noEmit` y `npm run build` pasan sin errores.

> **Nota del paso 4 (2026-11-11):** el plan actual del proyecto de Supabase no permite activar "Prevent use of leaked passwords". Quedan pendientes hasta cambiar de plan:
>
> - la parte de ese ajuste en el criterio del dashboard;
> - los dos criterios de `password123`;
> - el aviso `auth_leaked_password_protection` en el criterio de `get_advisors` (security), que se acepta como único aviso restante.
>
> El código del paso 3 ya está listo y no cambia nada mientras la protección esté desactivada. El límite de 10 sign ups y sign ins cada 5 minutos y la longitud mínima de 8 sí están configurados.

## Decisiones

- **Sí:** las tres cabeceras del checklist más `Permissions-Policy` y `Strict-Transport-Security`. Coste mínimo y ningún efecto en la app. **No:** CSP en esta spec; con Next exige nonces y una prueba de todas las integraciones, así que va aparte.
- **Sí:** `X-Frame-Options: DENY`. Nada en la app ni fuera de ella necesita incrustarla en un iframe. **No:** `frame-ancestors`, que es parte de CSP.
- **Sí:** HSTS sin `preload`. Los navegadores lo ignoran en `http://localhost`, y `preload` es difícil de deshacer sin un dominio de producción decidido.
- **Sí:** revocar `execute` sobre `public.rls_auto_enable()`. **No:** borrarla, porque es la función del event trigger que activa RLS en las tablas nuevas de `public`. **No:** dejarla como aviso aceptado; el permiso no lo necesita nadie, ya que Postgres no comprueba `execute` al disparar un event trigger.
- **Sí:** el cambio de permiso va por migración aunque la función no la creó el repo. El esquema solo cambia por migraciones (regla de `CLAUDE.md`).
- **Sí:** activar la protección contra contraseñas filtradas y mostrar un mensaje claro. El usuario eligió un código de error nuevo `weak`; al escribir la spec se vio que `updatePassword` ya trata `weak_password` como error del campo Contraseña. Se mantiene ese patrón en `signUp` para que el mensaje salga bajo el campo, como el resto de errores de validación, y no se añade un código a `AuthError`. Si se prefiere el código `weak` con alerta general, se cambia aquí antes de aprobar.
- **Sí:** límite de 10 sign ups y sign ins cada 5 minutos por IP. Frena bots y deja margen a quien se equivoca de contraseña. La app ya traduce el 429 a `rate`. El valor es el ritmo de recarga de un *token bucket* con ráfaga de hasta 30 (documentación de Supabase, «Rate limits»), descubierto al verificar: una ráfaga corta pasa siempre y el límite frena el abuso sostenido.
- **No:** protección de rutas en `proxy.ts`. No hay rutas privadas: `/login/nueva-clave` y `/login/usuario` ya redirigen sin sesión desde la propia página, y `updatePassword` y `chooseUsername` comprueban la sesión. Cuando haya rutas privadas, la comprobación seguirá en la página o la acción además del proxy, que no debe ser la única barrera (CVE-2025-29927).
- **Sí:** RLS y longitud mínima solo se verifican; ya estaban hechos en las SPEC 06, 07 y 15.

## Riesgos

| Riesgo                                                                                                                                                                                                     | Mitigación                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Las llamadas a Supabase Auth salen del servidor de Next (Server Actions), así que Supabase ve la IP del servidor, no la del jugador. En producción, el límite de 10 cada 5 min se compartiría entre todos. | En desarrollo la IP del servidor es la del propio usuario, así que el límite se prueba bien. Antes de producción, otra spec reenvía la IP real (`Sb-Forwarded-For`) o sube el límite.             |
| La protección contra contraseñas filtradas solo está en planes de pago y el proyecto está en Free.                                                                                                         | El paso 4 lo comprueba. Si no se puede activar, ese criterio y el aviso `auth_leaked_password_protection` se anotan como pendientes en la spec; el código del paso 3 es inocuo sin la protección. |
| Revocar `execute` rompe el event trigger y las tablas nuevas se crean sin RLS.                                                                                                                             | Postgres no comprueba `execute` al disparar event triggers. Aun así, un criterio de aceptación lo prueba en una transacción revertida.                                                            |
| `X-Frame-Options: DENY` o HSTS rompen OAuth o el correo de Resend.                                                                                                                                         | Ninguno de los dos flujos usa iframes de la app. Un criterio de aceptación repite el login con OAuth.                                                                                             |
| Un límite de 10 te bloquea mientras pruebas en local.                                                                                                                                                      | La ventana es de 5 minutos. Si molesta, se sube temporalmente en el dashboard y se vuelve a 10.                                                                                                   |

## Lo que **no** entra en esta spec

- Content-Security-Policy.
- Protección de rutas en `proxy.ts`.
- Reenvío de la IP del cliente a Supabase Auth.
- CAPTCHA en el registro.
- Límite de envíos del formulario de contacto.
- MFA, SMTP propio y URL de producción.

Cada una, si llega, va en su propia spec.
