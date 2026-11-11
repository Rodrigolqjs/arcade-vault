---
name: findings
description: Ids SEC-NNN del auditor de seguridad con área, gravedad, estado y fechas; incluye el siguiente id libre
metadata:
  type: project
---

Siguiente id libre: SEC-009

- **SEC-001** · App (deps) · crítico · abierto desde 2026-11-11. `next@16.3.8` tiene GHSA-2464-fhr4-w9xw, GHSA-673q-mjm6-r5xr y GHSA-p3m5-59mp-jv5r. Se corrige en 16.4.6.
- **SEC-002** · App · crítico · abierto desde 2026-11-11. `safeNext` (`lib/auth/schemas.ts`) acepta `/\t/evil.com` y abre un open redirect en `/auth/confirm` (hace falta un `token_hash` válido).
- **SEC-003** · App · bajo · abierto desde 2026-11-11. La cabecera `X-Powered-By` está presente.
- **SEC-004** · App · info · abierto desde 2026-11-11. No hay `server-only` en `lib/data` ni en `lib/supabase/server.ts`.
- **SEC-005** · App · medio · aceptado. Sin CSP (SPEC 16).
- **SEC-006** · App · bajo · aceptado. Contacto sin límite por IP (SPEC 16).
- **SEC-007** · Auth · aceptado. Contraseñas filtradas: el plan no lo permite (SPEC 16).
- **SEC-008** · Auth · aceptado. Rate limit con la IP del servidor (SPEC 16). Pasa a `alto` en producción.

**Why:** cada id se conserva para siempre y se reabre con el mismo id si reaparece.

**How to apply:** el detalle vigente está en `reference/security/security-audit.md`. Ver también [[accepted-risks]].
