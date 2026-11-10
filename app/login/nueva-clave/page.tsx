import { redirect } from "next/navigation";
import AuthCard from "@/components/auth/AuthCard";
import NewPasswordForm from "@/components/auth/NewPasswordForm";
import { createClient } from "@/lib/supabase/server";
// Only reachable with the session opened by the recovery link (/auth/confirm).
export default async function NewPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?aviso=enlace-invalido");
  return (
    <AuthCard subtitle="NUEVA CONTRASEÑA">
      <NewPasswordForm />
    </AuthCard>
  );
}
