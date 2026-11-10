// OAuth return (Google, GitHub): exchanges the PKCE ?code= for a session. It
// always comes back to the same browser, unlike the email links (SPEC 15).
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { DEFAULT_NEXT } from "@/lib/auth/schemas";
import { createClient } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  // Cancelling at the provider returns ?error=… and no code.
  if (!code) {
    const reason = params.get("error_description") ?? params.get("error");
    if (reason) console.error("[auth] callback: proveedor devolvió", reason);
    redirect("/login?aviso=error-oauth");
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    if (error) {
      console.error(
        "[auth] callback:",
        error.status,
        error.code,
        error.message,
      );
    }
    redirect("/login?aviso=error-oauth");
  }
  // First OAuth login: the trigger left username null, so the player picks one.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profileError) {
    console.error(
      "[auth] callback profile:",
      profileError.code,
      profileError.message,
    );
  }
  redirect(profile?.username ? DEFAULT_NEXT : "/login/usuario");
}
