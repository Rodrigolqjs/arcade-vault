"use client";
// /login/nueva-clave (SPEC 15): sets the new password for the session opened
// by the recovery link, then updatePassword redirects to /biblioteca.
import { useActionState, useState } from "react";
import { updatePassword } from "@/app/login/actions";
import {
  AUTH_ERROR_TEXT,
  AuthAlert,
  AuthField,
} from "@/components/auth/fields";
export default function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const failed = state?.ok === false ? state : null;
  const fields = failed?.error === "validation" ? failed.fields : undefined;
  return (
    <form action={action} noValidate className="mt-[18px]">
      <AuthField
        id="new-pass"
        name="password"
        type="password"
        label="Contraseña nueva"
        autoComplete="new-password"
        placeholder="••••••••"
        hint="8–72 caracteres"
        value={password}
        onChange={setPassword}
        error={fields?.password}
      />
      <AuthField
        id="new-pass-confirm"
        name="confirm"
        type="password"
        label="Repetir contraseña"
        autoComplete="new-password"
        placeholder="••••••••"
        value={confirm}
        onChange={setConfirm}
        error={fields?.confirm}
      />
      <AuthAlert
        message={
          failed && failed.error !== "validation"
            ? AUTH_ERROR_TEXT[failed.error]
            : null
        }
      />
      <button className="btn lg mt-2 w-full" type="submit" disabled={pending}>
        {pending ? "PROCESANDO…" : "GUARDAR CONTRASEÑA"}
      </button>
    </form>
  );
}
