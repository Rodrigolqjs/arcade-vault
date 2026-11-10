// Email links (signup confirmation and password recovery) land here with a
// token_hash. verifyOtp works even if the link opens in another browser (SPEC 15).
import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { safeNext } from "@/lib/auth/schemas";
import { createClient } from "@/lib/supabase/server";
const ALLOWED_TYPES: readonly EmailOtpType[] = ["email", "recovery"];
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const next = safeNext(params.get("next"));
  if (!tokenHash || !type || !ALLOWED_TYPES.includes(type)) {
    redirect("/login?aviso=enlace-invalido");
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });
  if (error) {
    console.error("[auth] confirm:", error.status, error.code, error.message);
    redirect("/login?aviso=enlace-invalido");
  }
  redirect(next);
}
