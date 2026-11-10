"use server";
// Auth Server Actions (SPEC 15). Each one is used with useActionState, so it
// receives the previous state first and the FormData second.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_NEXT,
  fieldErrors,
  newPasswordSchema,
  resetRequestSchema,
  signInSchema,
  signUpSchema,
  usernameSchema,
} from "@/lib/auth/schemas";
export type AuthError =
  "validation" | "credentials" | "unconfirmed" | "taken" | "rate" | "unknown";
export type AuthResult =
  | { ok: true }
  | { ok: false; error: AuthError; fields?: Partial<Record<string, string>> };
type SupabaseAuthError = { message: string; status?: number; code?: string };
const fail = (error: AuthError): AuthResult => ({ ok: false, error });
// Rate limits → "rate"; anything unexpected is logged and becomes "unknown".
function mapAuthError(where: string, err: SupabaseAuthError): AuthResult {
  if (
    err.status === 429 ||
    err.code === "over_email_send_rate_limit" ||
    err.code === "over_request_rate_limit"
  ) {
    return fail("rate");
  }
  console.error(`[auth] ${where}:`, err.status, err.code, err.message);
  return fail("unknown");
}
function siteUrl(where: string): string | null {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (!url) console.error(`[auth] ${where}: falta NEXT_PUBLIC_SITE_URL`);
  return url || null;
}
const field = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};
export async function signIn(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = signInSchema.safeParse({
    email: field(formData, "email"),
    password: field(formData, "password"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation",
      fields: fieldErrors(parsed.error),
    };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (
      error.code === "invalid_credentials" ||
      error.message === "Invalid login credentials"
    ) {
      return fail("credentials");
    }
    if (
      error.code === "email_not_confirmed" ||
      error.message === "Email not confirmed"
    ) {
      return fail("unconfirmed");
    }
    return mapAuthError("signIn", error);
  }
  redirect(DEFAULT_NEXT);
}
export async function signUp(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = signUpSchema.safeParse({
    username: field(formData, "username"),
    email: field(formData, "email"),
    password: field(formData, "password"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation",
      fields: fieldErrors(parsed.error),
    };
  }
  const { username, email, password } = parsed.data;
  const site = siteUrl("signUp");
  if (!site) return fail("unknown");
  const supabase = await createClient();
  // Clear error in the normal case; the unique constraint in the trigger covers races.
  const { data: existing, error: lookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (lookupError) {
    console.error(
      "[auth] signUp lookup:",
      lookupError.code,
      lookupError.message,
    );
    return fail("unknown");
  }
  if (existing) {
    return {
      ok: false,
      error: "taken",
      fields: { username: "ESE USUARIO YA EXISTE" },
    };
  }
  // An already registered email also "succeeds": Supabase doesn't reveal it.
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${site}/auth/confirm`,
    },
  });
  if (error) return mapAuthError("signUp", error);
  return { ok: true };
}
const PROVIDERS = ["google", "github"] as const;
type Provider = (typeof PROVIDERS)[number];
// Plain form action (no useActionState): it always ends in a redirect, to the
// provider on success or back to /login with the OAuth notice on failure.
export async function signInWithProvider(formData: FormData): Promise<void> {
  const provider = field(formData, "provider");
  const site = siteUrl("signInWithProvider");
  if (!PROVIDERS.includes(provider as Provider) || !site) {
    if (site) console.error("[auth] signInWithProvider: proveedor inválido");
    redirect("/login?aviso=error-oauth");
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as Provider,
    options: { redirectTo: `${site}/auth/callback` },
  });
  if (error || !data.url) {
    if (error) mapAuthError("signInWithProvider", error);
    redirect("/login?aviso=error-oauth");
  }
  redirect(data.url);
}
// Neutral: the same { ok: true } whether or not the email has an account.
export async function requestPasswordReset(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = resetRequestSchema.safeParse({
    email: field(formData, "email"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation",
      fields: fieldErrors(parsed.error),
    };
  }
  const supabase = await createClient();
  // The "Reset password" template links to /auth/confirm?type=recovery itself.
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
  );
  if (error) {
    const mapped = mapAuthError("requestPasswordReset", error);
    if (!mapped.ok && mapped.error === "rate") return mapped;
  }
  return { ok: true };
}
// Reached from the recovery link: /auth/confirm has already opened a session.
export async function updatePassword(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?aviso=enlace-invalido");
  const parsed = newPasswordSchema.safeParse({
    password: field(formData, "password"),
    confirm: field(formData, "confirm"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation",
      fields: fieldErrors(parsed.error),
    };
  }
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    // Field-level problems Supabase can still report on the new password.
    if (error.code === "same_password") {
      return {
        ok: false,
        error: "validation",
        fields: { password: "DEBE SER DISTINTA DE LA ACTUAL" },
      };
    }
    if (error.code === "weak_password") {
      return {
        ok: false,
        error: "validation",
        fields: { password: "CONTRASEÑA DEMASIADO DÉBIL" },
      };
    }
    return mapAuthError("updatePassword", error);
  }
  redirect(DEFAULT_NEXT);
}
// Sets the username once (RLS only allows it while it is null), e.g. after the
// first OAuth login or when the trigger lost a race for the name.
export async function chooseUsername(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  const parsed = usernameSchema.safeParse(field(formData, "username"));
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation",
      fields: { username: parsed.error.issues[0]?.message },
    };
  }
  const { data: rows, error } = await supabase
    .from("profiles")
    .update({ username: parsed.data })
    .eq("id", userId)
    .select("id");
  if (error) {
    if (error.code === "23505") return fail("taken");
    console.error("[auth] chooseUsername:", error.code, error.message);
    return fail("unknown");
  }
  // No row updated: the username was already chosen, nothing left to do here.
  if (!rows?.length) console.warn("[auth] chooseUsername: username ya elegido");
  redirect(DEFAULT_NEXT);
}
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error)
    console.error("[auth] signOut:", error.status, error.code, error.message);
  redirect("/");
}
