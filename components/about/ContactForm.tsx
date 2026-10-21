"use client";

import { useState, useTransition, type FormEvent } from "react";
import { sendContactMessage, type ContactResult } from "@/app/acerca/actions";

const EMPTY_FORM = { name: "", email: "", msg: "", website: "" };

type ContactError = Extract<ContactResult, { ok: false }>["error"];

const ERROR_MESSAGES: Record<ContactError, string> = {
  validation: "DATOS NO VÁLIDOS. REVISA LOS CAMPOS E INTÉNTALO DE NUEVO.",
  config: "NO PUDIMOS ENVIAR TU MENSAJE. INTÉNTALO DE NUEVO EN UNOS MINUTOS.",
  send: "NO PUDIMOS ENVIAR TU MENSAJE. INTÉNTALO DE NUEVO EN UNOS MINUTOS.",
};

export default function ContactForm() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<ContactError | null>(null);
  const [shake, setShake] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    if (!form.name.trim() || !form.email.trim() || !form.msg.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    startTransition(async () => {
      try {
        const result = await sendContactMessage(form);
        if (result.ok) setSent(result.name);
        else setError(result.error);
      } catch {
        setError("send");
      }
    });
  };

  const reset = () => {
    setSent(null);
    setForm(EMPTY_FORM);
  };

  return (
    <form className={"contact-form" + (shake ? " shake" : "")} onSubmit={onSubmit}>
      {sent === null && error === null ? (
        <>
          <div className="field">
            <label htmlFor="contact-name">NOMBRE</label>
            <input
              id="contact-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="px_kai"
            />
          </div>
          <div className="field">
            <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
            <input
              id="contact-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jugador@vault.gg"
            />
          </div>
          <div className="field">
            <label htmlFor="contact-msg">MENSAJE</label>
            <textarea
              id="contact-msg"
              rows={5}
              value={form.msg}
              onChange={(e) => setForm({ ...form, msg: e.target.value })}
              placeholder="Cuéntanos qué tienes en mente…"
            />
          </div>
          {/* Honeypot: invisible para personas, los bots lo rellenan */}
          <div className="hp-field" aria-hidden="true">
            <label htmlFor="contact-website">WEB</label>
            <input
              id="contact-website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </div>
          <button className="btn xl press w-full" type="submit" disabled={pending}>
            {pending ? "TRANSMITIENDO…" : "▶  ENVIAR MENSAJE"}
          </button>
        </>
      ) : (
        <div className={"terminal-success" + (error ? " error" : "")}>
          <div className="term-bar">
            <span className="dot r" />
            <span className="dot y" />
            <span className="dot g" />
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
            </div>
            {error ? (
              <>
                <div className="line dim">[OK] Conectando con servidor…</div>
                <div className="line err">[ERR] Transmisión fallida.</div>
                <div className="line success">
                  &gt; {ERROR_MESSAGES[error]}
                  <span className="caret">_</span>
                </div>
                <div className="mt-[18px]">
                  <button className="btn ghost" type="button" onClick={() => setError(null)}>
                    REINTENTAR
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="line dim">[OK] Conectando con servidor…</div>
                <div className="line dim">[OK] Validando contenido…</div>
                <div className="line dim">[OK] Transmitiendo paquete…</div>
                <div className="line success">
                  &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {sent?.toUpperCase()}.
                  <span className="caret">_</span>
                </div>
                <div className="mt-[18px]">
                  <button className="btn ghost" type="button" onClick={reset}>
                    ENVIAR OTRO MENSAJE
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
