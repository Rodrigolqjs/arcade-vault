"use client";
// /login/usuario (SPEC 15): the player picks the username their profile lacks
// (first OAuth login, or a name lost to another sign-up). It can't change later.
import { useActionState, useState } from "react";
import { chooseUsername } from "@/app/login/actions";
import {
  AUTH_ERROR_TEXT,
  AuthAlert,
  AuthField,
} from "@/components/auth/fields";
import { USERNAME_HINT } from "@/lib/auth/schemas";
export default function UsernameForm() {
  const [state, action, pending] = useActionState(chooseUsername, null);
  const [username, setUsername] = useState("");
  const failed = state?.ok === false ? state : null;
  return (
    <form action={action} noValidate className="mt-[18px]">
      <p className="auth-intro">
        Es el nombre con el que te verán los demás jugadores. Elígelo bien: no
        podrás cambiarlo después.
      </p>
      <AuthField
        id="choose-user"
        name="username"
        label="Usuario"
        autoComplete="username"
        placeholder="px_kai"
        hint={USERNAME_HINT}
        value={username}
        onChange={setUsername}
        error={
          failed?.error === "validation" ? failed.fields?.username : undefined
        }
        invalid={failed?.error === "taken"}
      />
      <AuthAlert
        message={
          failed && failed.error !== "validation"
            ? AUTH_ERROR_TEXT[failed.error]
            : null
        }
      />
      <button className="btn lg mt-2 w-full" type="submit" disabled={pending}>
        {pending ? "PROCESANDO…" : "ELEGIR USUARIO"}
      </button>
    </form>
  );
}
