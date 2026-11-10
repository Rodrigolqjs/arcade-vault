import AuthCard from "@/components/auth/AuthCard";
import ResetRequestForm from "@/components/auth/ResetRequestForm";
export default function RecoverPage() {
  return (
    <AuthCard subtitle="RECUPERAR ACCESO">
      <ResetRequestForm />
    </AuthCard>
  );
}
