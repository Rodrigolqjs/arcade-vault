// Server-side read of the signed-in player (SPEC 15), used by app/layout.tsx for
// the Nav. Never throws: a failure here must not take down every page.
import { createClient } from "@/lib/supabase/server";
export interface CurrentPlayer {
  id: string;
  email: string;
  username: string | null;
}
export async function getCurrentPlayer(): Promise<CurrentPlayer | null> {
  const supabase = await createClient();
  // getClaims() validates the JWT; the proxy has already refreshed it.
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const { sub, email } = data.claims;
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", sub)
    .maybeSingle();
  if (profileError) {
    console.error(
      "[auth] getCurrentPlayer profile:",
      profileError.code,
      profileError.message,
    );
  }
  return {
    id: sub,
    email: typeof email === "string" ? email : "",
    username: profile?.username ?? null,
  };
}
