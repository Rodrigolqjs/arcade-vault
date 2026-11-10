import { redirect } from "next/navigation";
import AuthCard from "@/components/auth/AuthCard";
import UsernameForm from "@/components/auth/UsernameForm";
import { DEFAULT_NEXT } from "@/lib/auth/schemas";
import { getCurrentPlayer } from "@/lib/data/auth";
export default async function ChooseUsernamePage() {
  const player = await getCurrentPlayer();
  if (!player) redirect("/login");
  if (player.username !== null) redirect(DEFAULT_NEXT);
  return (
    <AuthCard subtitle="ELIGE TU USUARIO">
      <UsernameForm />
    </AuthCard>
  );
}
