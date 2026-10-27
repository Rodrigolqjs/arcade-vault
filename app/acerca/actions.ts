"use server";

import { Resend } from "resend";
import { z } from "zod";

export type ContactInput = {
  name: string;
  email: string;
  msg: string;
  website: string; // honeypot; debe llegar vacío
};

export type ContactResult =
  | { ok: true; name: string }
  | { ok: false; error: "validation" | "config" | "send" };

const ContactSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.email().max(254),
  msg: z.string().trim().min(1).max(2000),
});

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export async function sendContactMessage(
  input: ContactInput,
): Promise<ContactResult> {
  // Un bot rellenó el honeypot: fingimos éxito sin enviar nada
  if (typeof input?.website === "string" && input.website !== "") {
    return {
      ok: true,
      name: typeof input.name === "string" ? input.name.trim() : "",
    };
  }

  const parsed = ContactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const { name, email, msg } = parsed.data;

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !to || !from) {
    console.error("[contact] Faltan variables de entorno de Resend");
    return { ok: false, error: "config" };
  }

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to,
      replyTo: email,
      subject: `[Arcade Vault] Mensaje de ${name}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\n${msg}`,
      html:
        `<p><strong>Nombre:</strong> ${escapeHtml(name)}<br>` +
        `<strong>Correo:</strong> ${escapeHtml(email)}</p>` +
        `<p style="white-space:pre-wrap">${escapeHtml(msg)}</p>`,
    });
    if (error) {
      console.error(
        "[contact] Resend rechazó el envío:",
        error.name,
        error.message,
      );
      return { ok: false, error: "send" };
    }
  } catch (err) {
    console.error(
      "[contact] Error al llamar a Resend:",
      err instanceof Error ? err.message : err,
    );
    return { ok: false, error: "send" };
  }

  return { ok: true, name };
}
