"use client";
// /login/recuperar (SPEC 15): asks for the reset link. The answer is the same
// neutral message whether or not the email has an account.
import Link from "next/link";
import { useActionState, useState } from "react";
import { requestPasswordReset } from "@/app/login/actions";
import {
  AUTH_ERROR_TEXT,
  AuthAlert,
  AuthField,
} from "@/components/auth/fields";
export default function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  const [email, setEmail] = useState("");
  const failed = state?.ok === false ? state : null;
  return (
    <>
      {state?.ok ? (
        <div className="auth-sent" role="status">
          <h3 className="neon-green">ENLACE EN CAMINO</h3>
          <p>
            SI EXISTE UNA CUENTA CON ESE CORREO, TE HEMOS ENVIADO UN ENLACE
            <span className="caret">_</span>
          </p>
        </div>
      ) : (
        <form action={action} noValidate className="mt-[18px]">
          <p className="auth-intro">
            Escribe el correo de tu cuenta y te enviaremos un enlace para elegir
            una contraseña nueva.
          </p>
          <AuthField
            id="reset-email"
            name="email"
            type="email"
            label="Correo electrónico"
            autoComplete="email"
            placeholder="jugador@vault.gg"
            value={email}
            onChange={setEmail}
            error={
              failed?.error === "validation" ? failed.fields?.email : undefined
            }
          />
          <AuthAlert
            message={
              failed && failed.error !== "validation"
                ? AUTH_ERROR_TEXT[failed.error]
                : null
            }
          />
          <button
            className="btn lg mt-2 w-full"
            type="submit"
            disabled={pending}
          >
            {pending ? "PROCESANDO…" : "ENVIAR ENLACE"}
          </button>
        </form>
      )}
      <Link href="/login" className="btn ghost mt-2.5 w-full">
        VOLVER
      </Link>
    </>
  );
}
