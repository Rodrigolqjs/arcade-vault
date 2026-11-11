---
name: audit-only
description: El auditor de seguridad audita sin arreglar; los arreglos van por spec y Supabase es solo lectura
metadata:
  type: feedback
---

Auditar sin arreglar: los arreglos van por `/spec` y Supabase se usa solo en lectura (consultas `select` de catálogo y pruebas dentro de `begin; … rollback;`). Nada de commits ni specs escritas por el auditor.

**Why:** el proyecto es spec-driven (CLAUDE.md). El usuario lo repitió en el encargo del 2026-11-11 ("No arregles nada, no escribas specs ni hagas commits").

**How to apply:** en cada hallazgo, dar una frase lista para `/spec`. Escribir solo en `reference/security/` y en esta memoria.
