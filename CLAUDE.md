# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault is an online platform for playing games and competing for the highest score. The game catalog lives in the Supabase table `public.games`; only some games have a real engine, the rest use a simulated player. Real games save scores to `public.scores` (anonymous, with initials), which feed the leaderboards and the Hall of Fame. The README is written in Spanish.

## Commands

```bash
npm run dev            # dev server (Turbopack is the default bundler in Next 16)
npm run build          # production build
npm run start          # serve the production build
npm run lint           # ESLint flat config (`next lint` no longer exists in Next 16)
npx eslint app/page.tsx  # lint a single file
npx tsc --noEmit       # type-check
npx prettier --write <file>  # format (Prettier 3, default config in .prettierrc.json)

# Supabase (CLI is a devDependency; the repo is linked to the remote project)
npx supabase migration new <nombre>   # create supabase/migrations/<timestamp>_<nombre>.sql
npx supabase db push --linked         # apply pending migrations to the remote project
npx supabase migration list --linked  # compare local vs remote migrations
npm run db:types                      # regenerate lib/supabase/database.types.ts after every migration
```

No test framework is set up yet. `npx supabase login` and `npx supabase link --project-ref ptazjmejroiokyfumpav` need the user's token and DB password, so the user runs them (`! <command>`). There is no local Docker stack: development runs against the remote project, the only environment, so review migration SQL before pushing.

## Code style and hooks

- A `PostToolUse` hook (`.claude/settings.json` → `.claude/hooks/format-lint.sh`) runs on every `Write`/`Edit`/`MultiEdit` inside the project: Prettier formats the file, `.css` files get their blank lines stripped, and JS/TS files go through `eslint --fix`. Remaining ESLint errors come back as hook feedback (exit 2) and must be fixed before moving on.
- No blank lines in code: `eslint.config.mjs` sets `no-multiple-empty-lines` to `max: 0` (template literal contents are untouched). Separate blocks with comments, not empty lines.
- ESLint and Prettier both ignore `reference/` (design prototype, not app code) and `lib/supabase/database.types.ts` is ignored by ESLint.
- User-facing UI text is in Spanish.

## Routes

| Route                | What it does                                                                                                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                  | Landing (`components/home/`: `Reveal`, `FloatingSilhouettes`, `MiniCard`, `FeatureIcon`).                                                                                                       |
| `/biblioteca`        | Catalog (`components/Library.tsx`) with `getGames()` + `getAllGameStats()`.                                                                                                                     |
| `/juegos/[id]`       | Game detail with its real leaderboard (`Leaderboard`, `EmptyScores`).                                                                                                                           |
| `/juegos/[id]/jugar` | Player: real engine or simulated `GamePlayer`; `actions.ts` holds `saveScore`.                                                                                                                  |
| `/salon?juego=<id>`  | Hall of Fame (`HallOfFame`, top 12). Missing or unknown `juego` falls back to the first playable game by `sort_order`.                                                                          |
| `/acerca`            | About page with a contact form that sends a real email through Resend.                                                                                                                          |
| `/login`             | `AuthForm`: sign in / sign up (email + password), Google and GitHub, guest mode. With a session it redirects to `/biblioteca`; `?aviso=enlace-invalido` and `?aviso=error-oauth` show a notice. |
| `/login/recuperar`   | `ResetRequestForm`: asks for the password reset link (neutral message whether or not the email exists).                                                                                         |
| `/login/nueva-clave` | `NewPasswordForm`: sets the new password. Without a session it redirects to `/login?aviso=enlace-invalido`.                                                                                     |
| `/login/usuario`     | `UsernameForm`: picks the username once (first OAuth login). No session → `/login`; username already set → `/biblioteca`.                                                                       |
| `/auth/confirm`      | Route Handler for the email links: `verifyOtp({ token_hash, type })` (`email` or `recovery`), then redirects to the validated `next`.                                                           |
| `/auth/callback`     | Route Handler for OAuth: `exchangeCodeForSession(code)`, then `/login/usuario` if the profile has no username, else `/biblioteca`.                                                              |
| `/api/health`        | Supabase health check.                                                                                                                                                                          |

An unknown game id in `/juegos/[id]` or `/juegos/[id]/jugar` calls `notFound()` (`app/not-found.tsx`); database errors go to `app/error.tsx`.

The visual design comes from the prototype in `reference/resources/templates/` (`*.jsx`, `styles.css`, `Arcade Vault.html`), ported screen by screen in specs 01–03.

## Stack and layout

- Next.js 16 (App Router) with React 19.2 and strict TypeScript. Routes live in `app/` at the repo root; there is no `src/`. The `@/*` path alias resolves to the repo root.
- Tailwind CSS v4 is wired through PostCSS (`@tailwindcss/postcss`). There is no `tailwind.config` file: the theme is defined in `app/globals.css` using `@import "tailwindcss"` and an `@theme inline` block that maps CSS variables (`--background`, `--foreground`, and the Geist font variables set in `app/layout.tsx`) to Tailwind tokens.
- Security headers (spec 16): `next.config.ts` sends `securityHeaders` on every response (`source: "/(.*)"`): `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()` and `Strict-Transport-Security: max-age=63072000; includeSubDomains` (no `preload`). There is no CSP yet (it needs nonces in `proxy.ts`; its own spec).
- Next 16 generates global route-type helpers such as `LayoutProps<"/">` and `PageProps<"/route">`; `app/layout.tsx` uses them. They are produced in `.next/types` by `next dev` or `next build`, so type errors about them usually mean the types haven't been generated yet.
- Supabase (`@supabase/supabase-js` + `@supabase/ssr`), configured by `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` (see `.env.example`); auth also needs `NEXT_PUBLIC_SITE_URL`.
  - `lib/supabase/server.ts`: async `createClient()` for Server Components, Server Actions and Route Handlers (`await cookies()`, `getAll`/`setAll`). Create one per request.
  - `lib/supabase/client.ts`: `createClient()` for Client Components.
  - Both clients are typed with `Database` from `lib/supabase/database.types.ts`, generated by `npm run db:types`, committed, and ignored by ESLint so it stays identical to the CLI output.
  - `lib/data/`: server-only reads used by pages. `lib/data/games.ts` exposes `getGames()` (by `sort_order`) and `getGame(id)` (`null` if missing). On a Supabase error they log the detail and throw a generic `Error`, which `app/error.tsx` ("VAULT FUERA DE LÍNEA" + `retry()`) catches.
  - `lib/data/scores.ts`: `getTopScores(gameId, limit)` (score desc, ties by `created_at` asc), `getAllGameStats()` and `getGameStats(gameId)`, read from the `public.game_stats` view (`security_invoker`; `best` is null and `plays` 0 without scores).
  - The app writes `public.scores` only through the `saveScore` Server Action (`app/juegos/[id]/jugar/actions.ts`), which validates initials (`^[A-Z0-9_ ]{1,10}$`), the score (integer, 0–10,000,000) and `isPlayable`, then returns the rank. RLS enforces the same rules for direct API calls with the publishable key: public select, insert only for games with `games.accepts_scores = true`, column grants limited to `game_id`/`name`/`score`, no update or delete.
  - `public.games` is read-only for `anon`/`authenticated` (RLS, select only) and changes only through migrations. RLS is on for every table in `public` (`games`, `scores`, `profiles`); the Supabase-owned event trigger `ensure_rls` (`public.rls_auto_enable()`, `security definer`) enables it on new tables, and `execute` on that function is revoked from `public`/`anon`/`authenticated` (migration `revoke_rls_auto_enable`, spec 16), so it is not exposed through `/rest/v1/rpc`. `lib/games.ts` keeps just the `Game`/`Category`/`GameColor` types and `CATS`.
  - Every page renders dynamically per request (`app/layout.tsx` reads the session for the Nav): no `generateStaticParams`, no caching.
  - `supabase/`: CLI project (`config.toml`, `migrations/`). `supabase/.temp/` holds the local link and is git-ignored. The schema only changes through migrations in `supabase/migrations/`, never directly in the dashboard or via the MCP.
  - `GET /api/health` (`app/api/health/route.ts`) calls `rpc("health")` and returns `200 {ok:true}` or `503 {ok:false}`; error details are only logged server-side.
  - `proxy.ts` (Next 16 convention, at the repo root) calls `updateSession()` from `lib/supabase/proxy.ts`, which validates the JWT with `getClaims()` and writes refreshed auth cookies to the request and the response. Its `matcher` skips `_next/static`, `_next/image`, `favicon.ico` and image files. It never redirects: no route requires a session.
  - `.mcp.json` registers the Supabase MCP server for this project. Use it to inspect tables, logs, advisors and docs; schema changes still go through migrations.
- Contact form (`/acerca`): `components/about/ContactForm.tsx` calls the `sendContactMessage` Server Action (`app/acerca/actions.ts`). It validates with `zod` (name ≤ 80, email, message ≤ 2000), escapes HTML, silently "succeeds" when the `website` honeypot is filled, and returns `{ok:false, error:"validation"|"config"|"send"}` on failure. It needs `RESEND_API_KEY`, `CONTACT_TO_EMAIL` and `CONTACT_FROM_EMAIL`; with the test sender `onboarding@resend.dev`, Resend only delivers to the account owner's address.
- Auth (spec 15): Supabase Auth with email + password (email confirmation required), Google and GitHub, and password recovery. The app stays public: no route requires a session and scores are still anonymous with initials.
  - `public.profiles` (1:1 with `auth.users`, `on delete cascade`): `username` unique, `^[a-z0-9_]{3,16}$`, `null` until chosen. The `on_auth_user_created` trigger (`handle_new_user()`, `security definer`, `execute` revoked from the API roles) creates the row with `raw_user_meta_data->>'username'` lowercased if it is valid and free, otherwise `null`; it never makes a sign-up fail. RLS: public select; the owner may update only `username` and only while it is `null` (it can be set once); no insert or delete from the API.
  - `lib/auth/schemas.ts` (zod, shared by forms and actions): `email` ≤ 254, `password` 8–72 (bcrypt limit), `username` trimmed + lowercased, `safeNext()` accepts only internal paths (`/…`, not `//` or `/\`) and falls back to `/biblioteca`.
  - `app/login/actions.ts`: `signIn`, `signUp` (checks `profiles` first → `taken`), `requestPasswordReset`, `updatePassword`, `chooseUsername` (`23505` → `taken`) take `(prevState, formData)` for `useActionState` and return `{ok:true}` or `{ok:false, error:"validation"|"credentials"|"unconfirmed"|"taken"|"rate"|"unknown", fields?}`, or end in `redirect()`. `signInWithProvider` (`google`|`github`) and `signOut` are plain form actions that always redirect. Rate limits (429, `over_*_rate_limit`) → `rate`; other Supabase errors are logged and become `unknown`.
  - `lib/data/auth.ts`: `getCurrentPlayer()` returns `null` or `{ id, email, username }` (`username` may be `null`) and never throws. `app/layout.tsx` passes it to `<Nav player={player} />`, which shows the username in cyan (or "ELIGE USUARIO" linking to `/login/usuario`) and a "SALIR" form, on desktop and at the end of the mobile panel. Between 961 and 1100 px the decorative credit counter is hidden while signed in so the nav fits.
  - UI: `components/AuthForm.tsx` and `components/auth/` (`AuthCard` frame, `fields.tsx` with `AuthField`/`AuthAlert`/`AUTH_ERROR_TEXT`, `ResetRequestForm`, `NewPasswordForm`, `UsernameForm`). Styles for `.field-hint`, `.field-msg`, `.auth-alert`, `.auth-sent`, `.auth-link` and `.nav-player` live in `app/globals.css`.
  - `NEXT_PUBLIC_SITE_URL` (`http://localhost:3000` in development, see `.env.example`) builds `emailRedirectTo` and the OAuth `redirectTo`; if it is missing those actions return `unknown` and log why.
  - Emails use Supabase's default SMTP: low hourly limit, and it only delivers to addresses of the project's team.
  - Manual dashboard setup (done; repeat it for a new environment or a production URL): Authentication → Email: "Confirm email" on, minimum password length 8. URL Configuration: Site URL `http://localhost:3000`, Redirect URLs `http://localhost:3000/**`. Emails: "Confirm signup" links to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/biblioteca` and "Reset password" to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/login/nueva-clave`. Providers Google and GitHub enabled with their OAuth apps, whose callback URL is `https://ptazjmejroiokyfumpav.supabase.co/auth/v1/callback`. Rate Limits (spec 16): "sign ups and sign ins" at 10 per 5 minutes per IP. It is the refill rate of a token bucket with bursts of up to 30, so a quick burst always passes and only sustained attempts get 429 (`rate`). Supabase sees the Next server's IP (auth runs in Server Actions), so this limit is per player only in development; production needs the client IP forwarded or a higher limit. Attack Protection: "Prevent use of leaked passwords" is still off because the current plan doesn't allow it; `signUp`/`updatePassword` already map `weak_password` with reason `pwned` to "ESA CONTRASEÑA APARECE EN FILTRACIONES · ELIGE OTRA" on the password field, so turning it on needs no code change. `auth_leaked_password_protection` is the only accepted security advisor warning. `supabase/config.toml` is not used for this (no local stack).
- Games: `/juegos/[id]/jugar` mounts a real game when `isPlayable(id)` (`lib/games/registry.ts`) and the simulated `components/GamePlayer.tsx` otherwise.
  - Playable today (`PLAYABLE_GAME_IDS`): `rocas` (Asteroids, `lib/games/asteroids`, spec 05), `caida` (Tetris, `lib/games/tetris`, spec 08), `serpentina` (original Snake, `lib/games/snake`, spec 10), `bloque-buster` (Arkanoid, `lib/games/arkanoid`, spec 09) and `ranaria` (original endless lane-crossing game from the game jam, `lib/games/ranaria`, spec 13). Each has a migration setting `accepts_scores = true`.
  - `lib/games/<game>/`: framework-free canvas engines, ported from `reference/resources/started-games/` (never imported directly). An engine owns its state, input listeners and `requestAnimationFrame` loop, exposes `start/pause/resume/end/destroy`, and reports to React through callbacks (`onHud` only when a value changes, `onGameOver`). Keyboard listeners go on `window`; an engine can also listen for `mousemove` on its own canvas (the Arkanoid in `bloque-buster` does), converting the pointer to logical coordinates with `W / rect.width`. Every listener is removed in `destroy()`.
  - `components/games/<Game>Player.tsx`: Client Component that creates the engine in `useEffect`, destroys it in the cleanup (StrictMode mounts twice in dev), and renders the shared `PlayerHud`, the CRT and `GameOverModal`. `PlayerHud` shows lives by default; games without lives pass the optional `lines` prop, which replaces the "Vidas" cell with "Líneas" (the Tetris in `caida` does this). Games with a clock pass the optional `time` prop, which adds a "Tiempo" cell after "Nivel" that blinks magenta at 5 s or less (RANARIA does this).
  - Skins: every playable game has `clasico` (default), `neon` and `retro`. Shared pieces are `lib/games/skins.ts` (`SKIN_IDS`, `SkinId`, labels, `localStorage` key `av-skin:<game-id>`) and `components/games/SkinSelector.tsx`; each game keeps its palettes in `lib/games/<motor>/skins.ts` and its engine takes a `skin` option plus `setSkin()`. A skin only changes colors, glow and strokes, never gameplay or scores. Status per game: `reference/game-with-themes.md`.
  - Touch controls (spec 11): every engine exposes `press(code)` / `release(code)`, which run the same code path as its `keydown` / `keyup` for that `KeyboardEvent.code`. In touch mode (`useTouchMode()` in `components/games/useTouchMode.ts`: `(pointer: coarse)` or a first `touchstart`) every player mounts `components/games/TouchControls.tsx` with its own `PadButton[]` (d-pad `up/down/left/right` + `a`/`b`, optional `repeat` at 170/50 ms) and `active={phase === "playing"}`, and swaps the start/pause texts to "TOCA…". Styles live in `app/globals.css` (`.touch-pad`, plus a landscape grid under `(orientation: landscape) and (pointer: coarse)`). A new game must do the same.
  - `components/games/RealGamePlayer.tsx`: maps each playable id to its player with `next/dynamic` and `ssr: false`, which only works inside a Client Component.
  - To add a real game: make sure its id exists in `public.games` and set its `accepts_scores = true` (both through a migration), write the engine (with `press`/`release`) and player (with `TouchControls`), add the id to `PLAYABLE_GAME_IDS`, and add its entry to the map in `RealGamePlayer.tsx`. Every playable game must also have its three skins and the `SkinSelector`: once it is playable, run the `skin-designer` agent for it, and then the `mobile-porter` agent.

### Next 16 changes that are easy to get wrong

The full list is in `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`.

- Request APIs are async only: `params`, `searchParams`, `cookies()`, `headers()` and `draftMode()` must be awaited.
- `middleware.ts` is renamed to `proxy.ts`.
- Parallel route slots need an explicit `default.js`.
- `next/image` defaults changed: local images with query strings need `images.localPatterns`, and `images.domains` is deprecated in favor of `remotePatterns`.

## Workflow: spec-driven development

This project uses spec-driven development: every feature is designed and implemented with Fernando Herrera's `/spec` and `/spec-impl` skills (https://github.com/Klerith/fernando-skills), installed in `~/.claude/skills/`. Don't start a feature without a spec. Specs 01–15 are all implemented (15 with email-flow acceptance criteria still pending a manual test, see its note). Spec 16 (basic security) is being implemented on `spec-16-seguridad-basica`, so the next new one is `17-…`.

- `/spec <description>` writes a spec to `specs/NN-slug.md` in the `Draft` state. The user changes the state to approved by hand.
- `/spec-impl NN-slug` only runs on approved specs. It works on a `spec-NN-slug` branch and implements the spec's plan one step at a time. `specs/.spec-config.yml` (`AutoCreateBranch: true`) creates that branch automatically. When it is done, the spec's state is set to `implementada` and the branch is merged into `main` through a PR.
- To make a game playable (port from `reference/resources/started-games/` or a new original engine) run the project skill `/add-game <folder or id>` (`.claude/skills/add-game/`): it writes the Draft spec with the engine, player, registry and `accepts_scores` steps, which `/spec-impl-game` (or plain `/spec-impl`) then implements.
- `/spec-impl-game NN-<id>-jugable` (project, `.claude/skills/spec-impl-game/`) is `/spec-impl` for game specs: it loads the original `~/.claude/skills/spec-impl/SKILL.md` at invocation and follows its phases unchanged, stops if the spec makes no game playable, and after the last step runs the `skin-designer` agent for that game and, once it finishes, the `mobile-porter` agent (sequentially, never in parallel). It never commits.
- If a spec exists for a feature, implement what it says. Proposed changes belong in the spec, not in code that drifts from it.

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario.

| Skill              | Where                                     | What it does                                                                                      |
| ------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `/spec`            | global, `~/.claude/skills/spec/`          | Writes a Draft spec in `specs/NN-slug.md`.                                                        |
| `/spec-impl`       | global, `~/.claude/skills/spec-impl/`     | Implements an approved spec step by step on its `spec-NN-slug` branch.                            |
| `/frontend-design` | global                                    | Required for any UI work.                                                                         |
| `/add-game`        | project, `.claude/skills/add-game/`       | Writes the Draft spec that makes a game playable (`spec-template.md`, `checklist.md`). User-only. |
| `/spec-impl-game`  | project, `.claude/skills/spec-impl-game/` | `/spec-impl` for game specs, then `skin-designer` and `mobile-porter`. User-only, never commits.  |

## Agents

All live in `.claude/agents/<name>.md`; read that file for the full procedure, thresholds and output format. Agents with `memory: project` keep it in `.claude/agent-memory/<name>/`. None of them commits, writes migrations or touches Supabase.

| Agent                      | What it does                                                                                                                                                                | Registry it maintains                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `game-planner`             | Scores 3–5 candidate games (original or genre-based, never clones) and recommends the next one to run `/add-game` on. Writes no code or specs.                              | `reference/game-suggestions-todo.md` |
| `game-jam`                 | Turns a theme into one original game and writes its Draft specs (README, catálogo, jugable, one extension) in `specs/game-jam/<game-id>/`; the user moves them to `specs/`. | —                                    |
| `skin-designer`            | Audits and implements the `clasico`/`neon`/`retro` skins of the named game, with measured contrast. Implements directly, without a spec.                                    | `reference/game-with-themes.md`      |
| `mobile-porter`            | Measures phone/tablet viewports with Playwright and fixes layout and touch controls (spec 11) for a game, a route or "todo", without changing desktop. No spec.             | `reference/mobile-audit.md`          |
| `game-performance-booster` | Measures one playable game (Playwright + CDP, CPU ×1/×4) and applies equivalent-only refactors to reach a steady 60 fps. No spec.                                           | `reference/game-performance.md`      |

With no game or route given, `skin-designer`, `mobile-porter` and `game-performance-booster` only report their registry. Registries and memory folders that don't exist yet are created on the agent's first run.
