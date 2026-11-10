// Shared pieces of the auth forms (SPEC 15): labelled field with hint and
// inline error, the alert block and the user-facing text of each AuthError.
import type { AuthError } from "@/app/login/actions";
export const AUTH_ERROR_TEXT: Record<
  Exclude<AuthError, "validation">,
  string
> = {
  credentials: "EMAIL O CONTRASEÑA INCORRECTOS",
  unconfirmed: "CONFIRMA TU CORREO ANTES DE ENTRAR",
  taken: "ESE USUARIO YA EXISTE",
  rate: "DEMASIADOS INTENTOS · ESPERA UNOS MINUTOS",
  unknown: "ALGO FALLÓ · INTÉNTALO DE NUEVO",
};
type FieldProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  /** Red border without a message (the message lives in the alert block). */
  invalid?: boolean;
};
export function AuthField({
  id,
  name,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
  hint,
  error,
  invalid = false,
}: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={error || invalid ? true : undefined}
        aria-describedby={
          [errorId, hintId].filter(Boolean).join(" ") || undefined
        }
        autoCapitalize={type === "text" ? "none" : undefined}
        spellCheck={false}
      />
      {error && (
        <p id={errorId} className="field-msg">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
    </div>
  );
}
/** Error block above the submit button. Renders nothing without a message. */
export function AuthAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="auth-alert" role="alert">
      <span className="tag">[ERR]</span> {message}
    </div>
  );
}
