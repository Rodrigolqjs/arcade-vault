# Auditoría de seguridad — Arcade Vault

Última auditoría: BD sin revisar · App 2026-11-11 (rama `spec-16-seguridad-basica`, commits 71133ed y 94fed6e)

## Resumen

| Gravedad | Abiertos | Aceptados | Cerrados |
| -------- | -------- | --------- | -------- |
| crítico  | 2        | 0         | 0        |
| alto     | 0        | 0         | 0        |
| medio    | 0        | 1         | 0        |
| bajo     | 1        | 1         | 0        |
| info     | 1        | 0         | 0        |

Los riesgos aceptados de Auth (contraseñas filtradas y límite por IP del servidor) se registran en la tabla de riesgos aceptados. Como pertenecen a BD/Auth, se reconfirmarán en la auditoría "db".

## Hallazgos abiertos

| Id      | Gravedad | Área | Hallazgo | Evidencia | Arreglo propuesto | Desde |
| ------- | -------- | ---- | -------- | --------- | ----------------- | ----- |
| SEC-001 | crítico | App (deps) | `next@16.3.8` está afectado por 3 advisories: dos `critical` (RCE sin autenticación en Image Optimization API con SVG, GHSA-2464-fhr4-w9xw; RCE en funciones `use cache` que devuelven typed arrays, GHSA-673q-mjm6-r5xr) y uno `high` (DoS en App Router con Server Actions, GHSA-p3m5-59mp-jv5r). Rango afectado: `>=16.0.0 <=16.4.0`. | `npm audit --omit=dev`: 1 critical (next), fix `16.4.6` sin semver major. `package.json:15` fija `"next": "16.3.8"`. `GET /_next/image?url=%2Ffavicon.ico&w=64&q=75` → `200 image/x-icon`, así que el optimizador está activo. La app usa Server Actions (DoS aplicable). No usa `use cache` ni `next/image`. | Subir `next` (y `eslint-config-next`) a `16.4.6` o posterior, ejecutar lint, tsc y build, y repetir `npm audit`. · `/spec Actualizar Next.js a 16.4.6 por GHSA-2464-fhr4-w9xw, GHSA-673q-mjm6-r5xr y GHSA-p3m5-59mp-jv5r` | 2026-11-11 |
| SEC-002 | crítico | App | Open redirect en `/auth/confirm`: `safeNext()` acepta `/\t/evil.com` (`?next=/%09/evil.com`). `redirect()` lo copia tal cual al `Location`, y el parser de URL del navegador (WHATWG) elimina tabulaciones y saltos de línea, así que lo resuelve como `//evil.com` → `http://evil.com/`. Pasa lo mismo con `/\t\evil.com`. Para explotarlo hace falta un `token_hash` válido. El atacante puede usar el suyo (es de un solo uso y caduca): la víctima acaba con la sesión del atacante y redirigida fuera. Hoy el SMTP por defecto solo entrega a direcciones del equipo, lo que limita el riesgo práctico, pero el control falla. | `lib/auth/schemas.ts:23-27` (solo comprueba `startsWith("//")` y `startsWith("/\\")`) y `app/auth/confirm/route.ts:13,26`. Prueba en Node con la misma lógica: `safeNext("/\t/evil.com")` → `"/\t/evil.com"`, y `new URL(…, "http://localhost:3000")` → `http://evil.com/`. `new Headers({Location})` lo acepta, y un servidor Node lo envía sin cambios (`raw Location: "/\t/evil.com"`). En Next, `node_modules/next/dist/server/route-modules/app-route/module.js:466-477` usa `Location: url` sin normalizar. Con un `token_hash` falso, `curl` acaba en `/login?aviso=enlace-invalido` (no se probó de punta a punta porque haría falta un token real). | En `nextSchema`, rechazar cualquier carácter de control o espacio (`/[\u0000-\u001F\u007F\s\\]/`) además de `//` y `/\`. Mejor aún: resolver `new URL(value, SITE_URL)`, exigir que `origin` coincida y devolver `pathname + search + hash`. Añadir criterios de aceptación con `/%09/`, `/%0A/`, `/%5C`, `/%2F/`. · `/spec Endurecer safeNext contra open redirect con caracteres de control` | 2026-11-11 |
| SEC-003 | bajo | App | La cabecera `X-Powered-By: Next.js` revela el framework. | `curl -sI` en `/`, `/login` y `/juegos/rocas/jugar` → `X-Powered-By: Next.js`. `next.config.ts:16-18` no tiene `poweredByHeader: false`. | Añadir `poweredByHeader: false` a `nextConfig`. · `/spec Quitar la cabecera X-Powered-By (poweredByHeader: false)` | 2026-11-11 |
| SEC-004 | info | App | No hay barrera `server-only` en `lib/data/*.ts` ni en `lib/supabase/server.ts`. Hoy ningún Client Component los importa en tiempo de ejecución (solo `import type` en `components/Nav.tsx:6` y `components/Library.tsx:4`), pero nada impediría hacerlo por error. | `grep -rn "server-only"` sin resultados. Cruce de los ficheros `"use client"` con sus imports: solo imports de tipos. | `import "server-only"` al principio de `lib/data/*.ts` y `lib/supabase/server.ts` (paquete `server-only`). Puede ir en la spec de SEC-003. | 2026-11-11 |

## Riesgos aceptados

| Id      | Riesgo | Motivo (spec) | Revisar cuando |
| ------- | ------ | ------------- | -------------- |
| SEC-005 | Sin `Content-Security-Policy` (`medio`). Confirmado el 2026-11-11: no aparece en ninguna respuesta. | SPEC 16, fuera de alcance: necesita nonces en `proxy.ts` y probar Resend, OAuth y los juegos. | Al escribir su spec, o antes de producción. |
| SEC-006 | Formulario de contacto sin límite por IP, solo con honeypot (`bajo`). Honeypot activo: `components/about/ContactForm.tsx:77-84` y `app/acerca/actions.ts:29`. | SPEC 16, fuera de alcance. | Antes de producción o si llega spam. |
| SEC-007 | `auth_leaked_password_protection` desactivado. El plan de Supabase no lo permite y el mensaje `pwned` ya está en `app/login/actions.ts:29-35`. | SPEC 16, nota del paso 4. | Al cambiar de plan. Se reconfirma en la auditoría "db". |
| SEC-008 | El límite de 10 cada 5 min por IP lo ve Supabase con la IP del servidor de Next, así que solo es por jugador en desarrollo. | SPEC 16, Riesgos. | Pasa a `alto` en cuanto exista una URL de producción. |

## Cerrados

| Id | Hallazgo | Cerrado por | Fecha |
| -- | -------- | ----------- | ----- |

## Comprobaciones superadas

App, 2026-11-11:

- **Cabeceras de la spec 16:** las cinco salen en `/`, `/login`, `/api/health`, `/juegos/rocas/jugar` y `/auth/confirm` (`curl -sI`).
- **Redirecciones con `curl`:** `/auth/confirm` con `next=//evil.com`, `/%5Cevil.com` y `https://evil.com`, y `/auth/callback?code=fake`, acaban en `Location` internos (`/login?aviso=…`). Ver SEC-002 para la variante con tabulación.
- **Redirecciones variables:** solo `app/auth/confirm/route.ts:26` (pasa por `safeNext`) y `app/login/actions.ts:164` (`data.url` devuelto por Supabase para OAuth, con el proveedor validado por la lista fija `PROVIDERS`). El resto son literales.
- **Sesión en las acciones:** `updatePassword` (`app/login/actions.ts:197-199`) y `chooseUsername` (`:233-236`) comprueban la sesión con `getClaims()` dentro de la propia acción. `chooseUsername` toma el id de `claims.sub`, no del formulario.
- **Sin `getSession()`:** no aparece en ningún sitio. La identidad sale de `getClaims()` (`lib/data/auth.ts:12`, `lib/supabase/proxy.ts:33`).
- **Validación en Server Actions:** `signIn`, `signUp`, `requestPasswordReset`, `updatePassword`, `chooseUsername` y `sendContactMessage` usan zod en el servidor. `signInWithProvider` usa una lista fija. `saveScore` valida a mano, con las mismas reglas que la BD: `isPlayable`, `^[A-Z0-9_ ]{1,10}$`, entero de 0 a 10.000.000. Solo inserta `game_id`/`name`/`score`, sin `created_at` ni rank del cliente. El `.or()` del rank interpola valores devueltos por la BD, no del cliente.
- **Secretos:** `git grep` de `service_role|sb_secret_|SUPABASE_SECRET|RESEND_API_KEY=` solo encuentra `.env.example:4` (vacío) y un comentario de `supabase/config.toml:20`. Las únicas `NEXT_PUBLIC_*` son `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` y `SITE_URL`.
- **`.env*`:** `.env.local` y `.env` están ignorados (`.gitignore:34`). `git log --all` no encuentra ningún commit con ellos. Solo se versiona `.env.example`.
- **XSS:** ningún `dangerouslySetInnerHTML`, `eval`, `new Function` ni `innerHTML`. El HTML del correo de contacto escapa `& < > " '` (`app/acerca/actions.ts:18-24, 52-55`).
- **Errores:** los de Supabase y Resend solo se registran en el servidor. El cliente recibe `unknown`, `send`, `config`, `unavailable` o `invalid`, y `app/error.tsx` no muestra detalles.
- **Mensajes neutros:** el registro no revela si el email existe (`actions.ts:132`) y la recuperación devuelve `{ok:true}` siempre salvo `rate` (`:186-190`). `unconfirmed` solo aparece con la contraseña correcta.
- **Server-only en cliente:** ningún Client Component importa `lib/data` ni `lib/supabase/server` en tiempo de ejecución (solo `import type`).
- **`proxy.ts`:** no redirige ni lanza. Su `matcher` cubre `/auth/*`, `/login/*` y `/api/*`.
- **Cookies `sb-*`:** `SameSite=Lax` por defecto en `@supabase/ssr` (`node_modules/@supabase/ssr/dist/main/utils/constants.js:6`).

## Preguntas abiertas

- SEC-002: ¿subir a `alto` en vez de `crítico` mientras el SMTP por defecto solo entregue a direcciones del equipo? El auditor lo deja en `crítico` porque el `Location` sale del origen (criterio de la sección 4.1).
- Cookies `Secure` en producción: sin verificar hasta que haya una URL HTTPS de producción.
- Dashboard de Auth (Confirm email, mínimo 8, Site URL y Redirect URLs solo `http://localhost:3000/**`, rate limit 10/5 min, providers Google y GitHub): sin verificar por MCP. Pendiente de la auditoría "db" o de que lo confirme el usuario.
- La auditoría de BD (sección 3) no se ha ejecutado todavía.
