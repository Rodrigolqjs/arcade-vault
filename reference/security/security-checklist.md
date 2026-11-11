## Checklist de seguridad básico

Implementado en `specs/16-seguridad-basica.md`.

  - [x] RLS: Row Level Security habilitado en ambas tablas: `games` y `scores` (y también en `profiles`)
  - [x] Minimum password length — mínimo 8 caracteres
  - [ ] Leaked password protection — (el warning 4) · pendiente: el plan actual de Supabase no lo permite. El mensaje en la UI ya está listo.
  - [x] Max signup rate — limitar signups por IP (anti-bot) · 10 sign ups y sign ins cada 5 min por IP
  - [x] Headers de seguridad en Next.js · `next.config.ts` (más `Permissions-Policy` y `Strict-Transport-Security`) · verificado con `curl -sI` el 2026-11-11 en `/`, `/login`, `/api/health`, `/juegos/rocas/jugar` y `/auth/confirm`. Siguen pendientes la CSP (SEC-005) y `X-Powered-By` (SEC-003), ver `security-audit.md`.

  Ej:

```ts
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

// En la config de Next.js:
headers: async () => [
  { source: '/(.*)', headers: securityHeaders }
]
```

## Por el ladod e Supabase:

- [x] Panel de warnings y errores de Supabase revisado: se revocó `execute` sobre `public.rls_auto_enable()` (2 warnings). Queda solo `auth_leaked_password_protection` (ver arriba). Performance: sin avisos.
