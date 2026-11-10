// Auth validation shared by the forms (client) and the Server Actions (SPEC 15).
// Error messages are the user-facing text shown under each field.
import { z } from "zod";
export const USERNAME_PATTERN = /^[a-z0-9_]{3,16}$/;
export const USERNAME_HINT = "3–16 · a-z 0-9 _";
export const DEFAULT_NEXT = "/biblioteca";
export const emailSchema = z
  .string()
  .trim()
  .pipe(z.email("CORREO NO VÁLIDO").max(254, "CORREO NO VÁLIDO"));
// 72 is bcrypt's limit; the Supabase minimum is raised to 8 in the dashboard.
export const passwordSchema = z
  .string()
  .min(8, "MÍNIMO 8 CARACTERES")
  .max(72, "MÁXIMO 72 CARACTERES");
export const usernameSchema = z
  .string()
  .transform((s) => s.trim().toLowerCase())
  .pipe(
    z.string().regex(USERNAME_PATTERN, `USUARIO NO VÁLIDO · ${USERNAME_HINT}`),
  );
// Internal path only: starts with "/" but not "//" (nor "/\", which browsers treat alike).
export const nextSchema = z
  .string()
  .refine(
    (s) => s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\"),
  );
export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export const signUpSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});
export const resetRequestSchema = z.object({ email: emailSchema });
export const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "LAS CONTRASEÑAS NO COINCIDEN",
  });
/** Returns `value` if it is a safe internal path, or `/biblioteca` otherwise. */
export function safeNext(value: unknown): string {
  const parsed = nextSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_NEXT;
}
/** First message per field of a failed parse, keyed by field name. */
export function fieldErrors(
  error: z.ZodError,
): Partial<Record<string, string>> {
  const fields: Partial<Record<string, string>> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    fields[key] ??= issue.message;
  }
  return fields;
}
