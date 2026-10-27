# SPEC 03 — Página "Acerca de" con formulario de contacto vía Resend

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-10-21
> **Objetivo:** Portar a `/acerca` la página de `reference/resources/templates/about.jsx` y hacer que su formulario de contacto envíe un correo real al equipo con Resend.

## Por qué existe esta spec

La SPEC 02 dejó fuera la página "Acerca de", su enlace en el Nav y sus estilos (`ABOUT PAGE`). En la plantilla, el formulario solo simula el envío: guarda el nombre en estado y muestra la terminal de éxito. Esta spec porta la página con fidelidad visual y conecta el formulario a Resend mediante una Server Action. La plantilla no tiene estados de carga ni de error, así que esta spec los define con la misma estética de la terminal.

La descripción original citaba `references/templates/home-about/`, que no existe en el repo. La referencia real es `reference/resources/templates/about.jsx`, `nav.jsx` y el bloque `ABOUT PAGE` de `styles.css`.

## Alcance

**Dentro:**

- Nueva ruta `/acerca` con el contenido de `about.jsx`, en este orden:
  - **Hero:** "▸ ACERCA DE", título "ACERCA DE ARCADE VAULT", párrafo de misión y 3 tarjetas destacadas con iconos pixel (HEART magenta, BROWSER cyan, PLANT green) con sus textos literales.
  - **Divisor:** dos barras y 24 píxeles parpadeantes con `animationDelay` de `i * 80` ms.
  - **Contacto:** "▸ CONTACTO", "CONTÁCTANOS", subtítulo, 3 tips con LED (verde, amarillo, magenta) y el formulario (NOMBRE, CORREO ELECTRÓNICO, MENSAJE, botón "▶ ENVIAR MENSAJE"), con los placeholders de la plantilla.
- Animación `.reveal` en el divisor y la sección de contacto, reutilizando `components/home/Reveal.tsx`.
- Validación en cliente igual que la plantilla: si algún campo está vacío tras `trim()`, el formulario hace `shake` durante 400 ms y no se envía. El formato del correo lo valida el navegador (`type="email"`).
- Envío con una Server Action que valida con Zod y manda un único correo al equipo con Resend.
- Estado de carga: mientras se envía, el botón se deshabilita y su texto pasa a "TRANSMITIENDO…".
- Estado de éxito: la terminal VAULT-OS de la plantilla, con "GRACIAS, {NOMBRE}." y el botón "ENVIAR OTRO MENSAJE", que vacía el formulario y lo vuelve a mostrar.
- Estado de error: la misma terminal en modo error (borde y texto magenta, líneas `[ERR]`) y un botón "REINTENTAR" que vuelve al formulario conservando los datos.
- Honeypot: campo oculto `website`. Si llega relleno, la Server Action responde éxito sin llamar a Resend.
- Nav: enlace "Acerca de" después de "Salón de la Fama", en la barra y en el panel móvil, activo en `/acerca`.
- Copiar a `app/globals.css` el bloque `ABOUT PAGE` de `reference/resources/templates/styles.css` (líneas 1071–1146, hasta `.term-body .caret`), más los estilos nuevos del modo error y del honeypot.
- Dependencias nuevas: `resend` y `zod`.
- `.env.example` versionado con `RESEND_API_KEY`, `CONTACT_TO_EMAIL` y `CONTACT_FROM_EMAIL` vacías, y la excepción `!.env.example` en `.gitignore`.

**Fuera de alcance (para futuras specs):**

- Correo de confirmación (acuse) al usuario que escribe.
- Plantilla de correo con React Email.
- Rate limiting, CAPTCHA o cualquier antispam aparte del honeypot.
- Guardar los mensajes en base de datos o panel de administración.
- Verificación de dominio propio en Resend (es configuración de la cuenta, no código).
- Enlace a "Acerca de" en el Footer.
- Estilos `GAMEPAD` y `Theme variants` de la plantilla.

## Modelo de datos

No hay persistencia. Los tipos viven en `app/acerca/actions.ts`:

```ts
// Entrada de la Server Action
type ContactInput = {
  name: string; // 1–80 caracteres tras trim
  email: string; // email válido, máx. 254
  msg: string; // 1–2000 caracteres tras trim
  website: string; // honeypot; debe llegar vacío
};

// Resultado de la Server Action
type ContactResult =
  | { ok: true; name: string }
  | { ok: false; error: "validation" | "config" | "send" };
```

- `validation`: Zod rechaza la entrada (solo ocurre si se salta la validación del cliente).
- `config`: falta alguna de las tres variables de entorno.
- `send`: Resend devuelve `error` o la llamada lanza una excepción.

Variables de entorno (en `.env.local`, nunca versionadas):

```bash
RESEND_API_KEY=            # API key de Resend
CONTACT_TO_EMAIL=          # buzón del equipo que recibe los mensajes
CONTACT_FROM_EMAIL=        # remitente, p. ej. "Arcade Vault <onboarding@resend.dev>"
```

Correo enviado:

- `from`: `CONTACT_FROM_EMAIL`.
- `to`: `CONTACT_TO_EMAIL`.
- `replyTo`: el correo del usuario.
- `subject`: `[Arcade Vault] Mensaje de <nombre>`.
- `text`: nombre, correo y mensaje en texto plano.
- `html`: los mismos datos en HTML simple, con nombre, correo y mensaje escapados.

## Estructura de archivos

```
app/
  acerca/
    page.tsx                     # nuevo: Server Component con hero, divisor y sección de contacto
    actions.ts                   # nuevo: "use server" — sendContactMessage(input): Promise<ContactResult>
  globals.css                    # modificado: bloque ABOUT PAGE + modo error + honeypot
components/
  Nav.tsx                        # modificado: enlace "Acerca de" en barra y panel móvil
  about/
    HighlightIcon.tsx            # nuevo, server: iconos pixel HEART/BROWSER/PLANT
    ContactForm.tsx              # nuevo, client: formulario, shake, carga, éxito y error
.env.example                     # nuevo
.gitignore                       # modificado: !.env.example
package.json                     # modificado: resend, zod
```

## Plan de implementación

Antes de escribir UI se invoca el skill `/frontend-design`, como exige `CLAUDE.md`. El objetivo es fidelidad a la plantilla, no un rediseño.

1. Copiar a `app/globals.css` el bloque `ABOUT PAGE` (líneas 1071–1146 de la plantilla). Crear `app/acerca/page.tsx` con el hero y el divisor, `components/about/HighlightIcon.tsx` y montar `Reveal`. Añadir "Acerca de" al Nav (barra y panel móvil, activo en `/acerca`). Verificación: `/acerca` muestra hero y divisor; el Nav marca "Acerca de".
2. Crear `components/about/ContactForm.tsx` con la sección de contacto y el formulario controlado (`name`, `email`, `msg`). Implementar el shake por campos vacíos y, de momento, la terminal de éxito simulada como en la plantilla. Verificación: enviar vacío hace shake; enviar relleno muestra la terminal y "ENVIAR OTRO MENSAJE" vacía el formulario.
3. Instalar `resend` y `zod`. Crear `.env.example` y añadir `!.env.example` a `.gitignore`. Verificación: `git status` muestra `.env.example` como archivo nuevo y `.env.local` sigue ignorado.
4. Crear `app/acerca/actions.ts` con `sendContactMessage`: comprobar honeypot, validar con Zod, comprobar variables de entorno y enviar con `resend.emails.send`. Los errores se registran con `console.error` sin incluir la API key. Verificación: `npx tsc --noEmit` pasa.
5. Conectar `ContactForm` a la Server Action con `useTransition`: botón deshabilitado con "TRANSMITIENDO…" mientras dura la transición; éxito con la terminal y el nombre que devuelve la acción. Añadir el campo honeypot `website` (fuera de pantalla, `aria-hidden`, `tabIndex={-1}`, `autoComplete="off"`). Verificación: con `.env.local` válido llega el correo a `CONTACT_TO_EMAIL`.
6. Implementar la terminal en modo error y su CSS (`.terminal-success.error`): líneas `[OK] Conectando con servidor…` y `[ERR] Transmisión fallida.`, mensaje final según `error` y botón "REINTENTAR" que vuelve al formulario con los datos intactos. Verificación: sin `RESEND_API_KEY` se ve la terminal de error y "REINTENTAR" conserva los datos.
7. Verificación final con Playwright: comparar `/acerca` con la pantalla About de `reference/resources/templates/arcade-vault-standalone.html` a 1440 px y 375 px, y comprobar que no hay scroll horizontal a 375 px. Ejecutar `npm run lint`, `npx tsc --noEmit` y `npm run build`.

## Criterios de aceptación

- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.
- [ ] `/acerca` muestra hero, divisor y sección de contacto, en ese orden, con los textos literales de `about.jsx`.
- [ ] Las 3 tarjetas destacadas muestran los iconos HEART, BROWSER y PLANT en magenta, cyan y verde.
- [ ] El divisor tiene exactamente 24 píxeles.
- [ ] El Nav muestra "Acerca de" después de "Salón de la Fama", en la barra y en el panel móvil, y solo está activo en `/acerca`.
- [ ] Enviar con algún campo vacío o solo con espacios hace shake y no llama a la Server Action.
- [ ] Mientras se envía, el botón está deshabilitado y dice "TRANSMITIENDO…".
- [ ] Con las tres variables de entorno válidas, enviar el formulario entrega un correo en `CONTACT_TO_EMAIL` con asunto `[Arcade Vault] Mensaje de <nombre>` y `Reply-To` igual al correo del usuario.
- [ ] Tras un envío correcto se muestra la terminal de éxito con "GRACIAS, <NOMBRE EN MAYÚSCULAS>."
- [ ] "ENVIAR OTRO MENSAJE" vuelve al formulario con los tres campos vacíos.
- [ ] Sin `RESEND_API_KEY`, el envío muestra la terminal en modo error y no lanza excepciones sin capturar.
- [ ] "REINTENTAR" vuelve al formulario con nombre, correo y mensaje conservados.
- [ ] Un mensaje con `<script>` o etiquetas HTML llega escapado en el cuerpo HTML del correo.
- [ ] Si el campo `website` llega relleno, la acción devuelve éxito y no se envía ningún correo.
- [ ] El campo honeypot no es visible ni alcanzable con Tab.
- [ ] Llamar a la acción con un email inválido o un mensaje de más de 2000 caracteres devuelve `{ ok: false, error: "validation" }`.
- [ ] `.env.example` está versionado y `.env.local` no.
- [ ] La API key no aparece en el bundle del cliente (`grep -r RESEND_API_KEY .next/static` no devuelve nada).
- [ ] A 1440 px, la captura de `/acerca` coincide visualmente con la pantalla About de la plantilla.
- [ ] Con un ancho de 375 px, `/acerca` no tiene scroll horizontal.
- [ ] Con `prefers-reduced-motion: reduce`, el divisor y el contacto son visibles sin hacer scroll.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en `/acerca`.

## Decisiones

- **Sí:** ruta `/acerca`. Sigue la convención de rutas en español (`/biblioteca`, `/salon`, `/juegos`).
- **No:** `/about` o `/acerca-de`. El primero rompe la convención; el segundo es más largo sin aportar nada.
- **Sí:** Server Action en `app/acerca/actions.ts`. Idiomático en Next 16 y sin endpoint público adicional.
- **No:** Route Handler `/api/contact`. Solo compensa si otro cliente necesita el endpoint.
- **Sí:** `useTransition` y llamada directa a la acción desde `onSubmit`, con estado local para formulario, éxito y error. Permite mantener el formulario controlado de la plantilla, conservar los datos al reintentar y vaciarlos con "ENVIAR OTRO MENSAJE".
- **No:** `useActionState` con `<form action>`. React reinicia los formularios tras la acción y el estado devuelto no se puede limpiar para "ENVIAR OTRO MENSAJE" sin trucos.
- **Sí:** remitente, destinatario y API key en variables de entorno, con `replyTo` del usuario. Cambiar de buzón o dominio no requiere tocar código.
- **No:** destinatario fijo en código.
- **Sí:** correo en texto plano + HTML simple con contenido escapado. Sin dependencias aparte de `resend`.
- **No:** React Email. Más dependencias y trabajo para un correo interno.
- **Sí:** un único correo al equipo, sin acuse al usuario. Con el dominio de pruebas de Resend solo se puede enviar al dueño de la cuenta.
- **Sí:** validación en cliente igual que la plantilla y validación en servidor con Zod. El cliente no es de fiar.
- **No:** validar en servidor sin librería. Zod deja las reglas en un solo esquema legible.
- **Sí:** honeypot como única protección antispam. Sin coste ni servicios externos.
- **No:** rate limit en memoria. No funciona con varias instancias serverless; si hace falta, va en otra spec.
- **Sí:** terminal en modo error con "REINTENTAR". Es la única desviación visual respecto a la plantilla, que no contempla el fallo.
- **Sí:** botón "TRANSMITIENDO…" deshabilitado durante el envío. Evita doble envío.
- **No:** terminal animada durante el envío. Se aleja de la plantilla.
- **Sí:** `.env.example` versionado con excepción en `.gitignore`. Hoy `.gitignore` ignora `.env*`.
- **Sí:** reutilizar `components/home/Reveal.tsx`. Ya hace exactamente lo que necesita la página.
- **Sí:** `app/acerca/page.tsx` como Server Component; solo `ContactForm.tsx` es Client Component.
- **Sí:** esta spec añade a `globals.css` los selectores `.about`, `.contact-*`, `.highlight` y `.terminal-success` que la SPEC 02 excluía. Ese criterio de la SPEC 02 deja de aplicarse.

## Riesgos

| Riesgo                                                                                                    | Mitigación                                                                                                          |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Con el dominio de pruebas (`onboarding@resend.dev`), Resend solo entrega al correo del dueño de la cuenta | `CONTACT_TO_EMAIL` debe ser ese correo hasta verificar un dominio. Se documenta en `.env.example`.                  |
| Faltan variables de entorno en producción                                                                 | La acción devuelve `error: "config"` y se ve la terminal de error; nunca un 500.                                    |
| Inyección de HTML en el correo a través del mensaje o el nombre                                           | Escapar `&`, `<`, `>`, `"` y `'` antes de construir el `html`. Criterio de aceptación explícito.                    |
| Abuso del formulario por bots que ignoran el honeypot                                                     | Aceptado para esta versión. Rate limit o CAPTCHA en otra spec si aparece spam.                                      |
| Fuga de la API key al cliente                                                                             | Solo se lee en `actions.ts` (`"use server"`). Criterio con `grep` sobre `.next/static`.                             |
| API de Zod distinta entre v3 y v4 (`z.string().email()` frente a `z.email()`)                             | Usar la API de la versión instalada en el paso 3.                                                                   |
| `.reveal` empieza con `opacity: 0`; si el JS falla, la sección de contacto queda invisible                | Igual que en la SPEC 02: `Reveal` es mínimo y la regla de reduced-motion de `globals.css` ya muestra los `.reveal`. |

## Lo que **no** entra en esta spec

- Acuse de recibo al usuario.
- React Email.
- Rate limit, CAPTCHA u otro antispam aparte del honeypot.
- Persistencia de mensajes o panel de administración.
- Enlace en el Footer.
- Estilos `GAMEPAD` y `Theme variants`.

Cada uno de estos, si llega, va en su propia spec.
