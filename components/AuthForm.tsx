"use client";
// /login card (SPEC 15): real sign-in and sign-up through the Server Actions in
// app/login/actions.ts. Each tab owns its useActionState, so switching tabs
// clears the previous result. Inputs are controlled so values survive errors.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import {
  signIn,
  signInWithProvider,
  signUp,
  type AuthResult,
} from "@/app/login/actions";
import {
  AUTH_ERROR_TEXT,
  AuthAlert,
  AuthField,
} from "@/components/auth/fields";
import AuthCard from "@/components/auth/AuthCard";
import { USERNAME_HINT } from "@/lib/auth/schemas";
type Tab = "in" | "up";
function errorText(state: AuthResult | null): string | null {
  if (!state || state.ok || state.error === "validation") return null;
  return AUTH_ERROR_TEXT[state.error];
}
function fieldError(state: AuthResult | null, name: string) {
  if (!state || state.ok) return undefined;
  // "taken" is shown in the alert block, not repeated under the field.
  if (state.error !== "validation") return undefined;
  return state.fields?.[name];
}
function SignInForm({
  email,
  setEmail,
  notice,
}: {
  email: string;
  setEmail: (v: string) => void;
  notice: string | null;
}) {
  const [state, action, pending] = useActionState(signIn, null);
  const [password, setPassword] = useState("");
  return (
    <form action={action} noValidate>
      <AuthField
        id="auth-email"
        name="email"
        type="email"
        label="Correo electrónico"
        autoComplete="email"
        placeholder="jugador@vault.gg"
        value={email}
        onChange={setEmail}
        error={fieldError(state, "email")}
      />
      <AuthField
        id="auth-pass"
        name="password"
        type="password"
        label="Contraseña"
        autoComplete="current-password"
        placeholder="••••••••"
        value={password}
        onChange={setPassword}
        error={fieldError(state, "password")}
      />
      <Link href="/login/recuperar" className="auth-link">
        ¿OLVIDASTE TU CONTRASEÑA?
      </Link>
      {/* The ?aviso= notice only stands until the first attempt. */}
      <AuthAlert message={state ? errorText(state) : notice} />
      <button className="btn lg mt-2 w-full" type="submit" disabled={pending}>
        {pending ? "PROCESANDO…" : "ENTRAR AL VAULT"}
      </button>
    </form>
  );
}
function SignUpForm({
  email,
  setEmail,
  onSent,
}: {
  email: string;
  setEmail: (v: string) => void;
  onSent: (email: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [state, action, pending] = useActionState(
    async (prev: AuthResult | null, formData: FormData) => {
      const result = await signUp(prev, formData);
      if (result.ok) onSent(String(formData.get("email") ?? "").trim());
      return result;
    },
    null,
  );
  return (
    <form action={action} noValidate>
      <AuthField
        id="auth-user"
        name="username"
        label="Usuario"
        autoComplete="username"
        placeholder="px_kai"
        hint={USERNAME_HINT}
        value={username}
        onChange={setUsername}
        error={fieldError(state, "username")}
        invalid={state?.ok === false && state.error === "taken"}
      />
      <AuthField
        id="auth-email"
        name="email"
        type="email"
        label="Correo electrónico"
        autoComplete="email"
        placeholder="jugador@vault.gg"
        value={email}
        onChange={setEmail}
        error={fieldError(state, "email")}
      />
      <AuthField
        id="auth-pass"
        name="password"
        type="password"
        label="Contraseña"
        autoComplete="new-password"
        placeholder="••••••••"
        value={password}
        onChange={setPassword}
        error={fieldError(state, "password")}
      />
      <AuthAlert message={errorText(state)} />
      <button className="btn lg mt-2 w-full" type="submit" disabled={pending}>
        {pending ? "PROCESANDO…" : "CREAR Y JUGAR"}
      </button>
    </form>
  );
}
function CheckEmail({ email, onBack }: { email: string; onBack: () => void }) {
  return (
    <div className="auth-sent" role="status">
      <h3 className="neon-green">REVISA TU CORREO</h3>
      <p>Te hemos enviado un enlace de confirmación a</p>
      <p className="addr">{email}</p>
      <p>
        Ábrelo para activar tu cuenta. Si no lo ves en unos minutos, mira en la
        carpeta de spam.<span className="caret">_</span>
      </p>
      <button className="btn ghost mt-4 w-full" type="button" onClick={onBack}>
        VOLVER A INICIAR SESIÓN
      </button>
    </div>
  );
}
export default function AuthForm({
  notice = null,
}: {
  notice?: string | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("in");
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  return (
    <AuthCard subtitle="ACCESO AL SISTEMA · v2.6">
      {sentTo !== null ? (
        <CheckEmail
          email={sentTo}
          onBack={() => {
            setSentTo(null);
            setTab("in");
          }}
        />
      ) : (
        <>
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "in"}
              className={tab === "in" ? "on" : ""}
              onClick={() => setTab("in")}
            >
              INICIAR SESIÓN
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "up"}
              className={tab === "up" ? "on" : ""}
              onClick={() => setTab("up")}
            >
              CREAR CUENTA
            </button>
          </div>
          {tab === "in" ? (
            <SignInForm email={email} setEmail={setEmail} notice={notice} />
          ) : (
            <SignUpForm email={email} setEmail={setEmail} onSent={setSentTo} />
          )}
          <button
            type="button"
            className="btn ghost mt-2.5 w-full"
            onClick={() => router.push("/biblioteca")}
          >
            JUGAR COMO INVITADO
          </button>
          <div className="auth-divider">O CONTINÚA CON</div>
          <form action={signInWithProvider} className="social">
            <button
              className="btn ghost"
              type="submit"
              name="provider"
              value="google"
            >
              ◆ GOOGLE
            </button>
            <button
              className="btn ghost"
              type="submit"
              name="provider"
              value="github"
            >
              ▣ GITHUB
            </button>
          </form>
        </>
      )}
      <div className="mt-[18px] text-center text-[11px] tracking-[0.1em] text-ink-faint">
        AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
      </div>
    </AuthCard>
  );
}
