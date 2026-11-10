import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { DEFAULT_NEXT } from "@/lib/auth/schemas";
import { createClient } from "@/lib/supabase/server";
// Notices set by /auth/confirm and /auth/callback through ?aviso=.
const NOTICES: Record<string, string> = {
  "enlace-invalido": "EL ENLACE NO ES VÁLIDO O HA CADUCADO",
  "error-oauth": "NO SE PUDO INICIAR SESIÓN CON EL PROVEEDOR",
};
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect(DEFAULT_NEXT);
  const { aviso } = await searchParams;
  const notice = typeof aviso === "string" ? (NOTICES[aviso] ?? null) : null;
  return <AuthForm notice={notice} />;
}
