---
name: accepted-risks
description: Riesgos de seguridad aceptados en Arcade Vault, con la spec que los decide y cuándo revisarlos
metadata:
  type: project
---

Riesgos aceptados, confirmados el 2026-11-11:

- **SEC-007:** `auth_leaked_password_protection`. El plan Free no permite activarlo (SPEC 16, nota del paso 4). Se revisa al cambiar de plan.
- **SEC-008:** el rate limit de Auth ve la IP del servidor de Next (SPEC 16, Riesgos). Pasa a `alto` en cuanto haya una URL de producción.
- **SEC-005:** sin CSP, `medio` (SPEC 16, fuera de alcance; irá en su propia spec).
- **SEC-006:** contacto sin límite por IP, `bajo`. Solo hay honeypot (SPEC 16, fuera de alcance).
- Que `proxy.ts` no proteja rutas no es un hallazgo: ninguna ruta exige sesión (SPEC 15).

**Why:** son decisiones conscientes de las specs 15 y 16, no omisiones.

**How to apply:** en cada auditoría, reconfirmarlos sin abrirlos como hallazgos nuevos. Escalarlos solo si cambia la condición de "revisar cuando". Lista completa de hallazgos: [[findings]].
