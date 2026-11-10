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

- A `PostToolUse` hook (`.claude/settings.json` → `.claude/hooks/format-lint.sh`) runs on every `Write`/`Edit` inside the project: Prettier formats the file, `.css` files get their blank lines stripped, and JS/TS files go through `eslint --fix`. Remaining ESLint errors come back as hook feedback (exit 2) and must be fixed before moving on.
- No blank lines in code: `eslint.config.mjs` sets `no-multiple-empty-lines` to `max: 0` (template literal contents are untouched). Separate blocks with comments, not empty lines.
- ESLint and Prettier both ignore `reference/` (design prototype, not app code) and `lib/supabase/database.types.ts` is ignored by ESLint.
- User-facing UI text is in Spanish.

## Routes

| Route                | What it does                                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `/`                  | Landing (`components/home/`: `Reveal`, `FloatingSilhouettes`, `MiniCard`, `FeatureIcon`).                              |
| `/biblioteca`        | Catalog (`components/Library.tsx`) with `getGames()` + `getAllGameStats()`.                                            |
| `/juegos/[id]`       | Game detail with its real leaderboard (`Leaderboard`, `EmptyScores`).                                                  |
| `/juegos/[id]/jugar` | Player: real engine or simulated `GamePlayer`; `actions.ts` holds `saveScore`.                                         |
| `/salon?juego=<id>`  | Hall of Fame (`HallOfFame`, top 12). Missing or unknown `juego` falls back to the first playable game by `sort_order`. |
| `/acerca`            | About page with a contact form that sends a real email through Resend.                                                 |
| `/login`             | `AuthForm` UI only: there is no real auth yet, it just navigates to `/biblioteca`.                                     |
| `/api/health`        | Supabase health check.                                                                                                 |

The visual design comes from the prototype in `reference/resources/templates/` (`*.jsx`, `styles.css`, `Arcade Vault.html`), ported screen by screen in specs 01–03.

## Stack and layout

- Next.js 16 (App Router) with React 19.2 and strict TypeScript. Routes live in `app/` at the repo root; there is no `src/`. The `@/*` path alias resolves to the repo root.
- Tailwind CSS v4 is wired through PostCSS (`@tailwindcss/postcss`). There is no `tailwind.config` file: the theme is defined in `app/globals.css` using `@import "tailwindcss"` and an `@theme inline` block that maps CSS variables (`--background`, `--foreground`, and the Geist font variables set in `app/layout.tsx`) to Tailwind tokens.
- Next 16 generates global route-type helpers such as `LayoutProps<"/">` and `PageProps<"/route">`; `app/layout.tsx` uses them. They are produced in `.next/types` by `next dev` or `next build`, so type errors about them usually mean the types haven't been generated yet.
- Supabase (`@supabase/supabase-js` + `@supabase/ssr`), configured by `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` (see `.env.example`).
  - `lib/supabase/server.ts`: async `createClient()` for Server Components, Server Actions and Route Handlers (`await cookies()`, `getAll`/`setAll`). Create one per request.
  - `lib/supabase/client.ts`: `createClient()` for Client Components.
  - Both clients are typed with `Database` from `lib/supabase/database.types.ts`, generated by `npm run db:types`, committed, and ignored by ESLint so it stays identical to the CLI output.
  - `lib/data/`: server-only reads used by pages. `lib/data/games.ts` exposes `getGames()` (by `sort_order`) and `getGame(id)` (`null` if missing). On a Supabase error they log the detail and throw a generic `Error`, which `app/error.tsx` ("VAULT FUERA DE LÍNEA" + `retry()`) catches.
  - `lib/data/scores.ts`: `getTopScores(gameId, limit)` (score desc, ties by `created_at` asc), `getAllGameStats()` and `getGameStats(gameId)`, read from the `public.game_stats` view (`security_invoker`; `best` is null and `plays` 0 without scores).
  - The app writes `public.scores` only through the `saveScore` Server Action (`app/juegos/[id]/jugar/actions.ts`), which validates initials (`^[A-Z0-9_ ]{1,10}$`), the score (integer, 0–10,000,000) and `isPlayable`, then returns the rank. RLS enforces the same rules for direct API calls with the publishable key: public select, insert only for games with `games.accepts_scores = true`, column grants limited to `game_id`/`name`/`score`, no update or delete.
  - `public.games` is read-only for `anon`/`authenticated` (RLS, select only) and changes only through migrations. `lib/games.ts` keeps just the `Game`/`Category`/`GameColor` types and `CATS`.
  - Pages that read the database render dynamically per request: no `generateStaticParams`, no caching.
  - `supabase/`: CLI project (`config.toml`, `migrations/`). `supabase/.temp/` holds the local link and is git-ignored. The schema only changes through migrations in `supabase/migrations/`, never directly in the dashboard or via the MCP.
  - `GET /api/health` (`app/api/health/route.ts`) calls `rpc("health")` and returns `200 {ok:true}` or `503 {ok:false}`; error details are only logged server-side.
  - There is no `proxy.ts` yet; session refresh arrives with the auth spec.
  - `.mcp.json` registers the Supabase MCP server for this project. Use it to inspect tables, logs, advisors and docs; schema changes still go through migrations.
- Contact form (`/acerca`): `components/about/ContactForm.tsx` calls the `sendContactMessage` Server Action (`app/acerca/actions.ts`). It validates with `zod` (name ≤ 80, email, message ≤ 2000), escapes HTML, silently "succeeds" when the `website` honeypot is filled, and returns `{ok:false, error:"validation"|"config"|"send"}` on failure. It needs `RESEND_API_KEY`, `CONTACT_TO_EMAIL` and `CONTACT_FROM_EMAIL`; with the test sender `onboarding@resend.dev`, Resend only delivers to the account owner's address.
- Games: `/juegos/[id]/jugar` mounts a real game when `isPlayable(id)` (`lib/games/registry.ts`) and the simulated `components/GamePlayer.tsx` otherwise.
  - Playable today (`PLAYABLE_GAME_IDS`): `rocas` (Asteroids, `lib/games/asteroids`, spec 05), `caida` (Tetris, `lib/games/tetris`, spec 08), `serpentina` (original Snake, `lib/games/snake`, spec 10) and `bloque-buster` (Arkanoid, `lib/games/arkanoid`, spec 09). Each has a migration setting `accepts_scores = true`.
  - `lib/games/<game>/`: framework-free canvas engines, ported from `reference/resources/started-games/` (never imported directly). An engine owns its state, input listeners and `requestAnimationFrame` loop, exposes `start/pause/resume/end/destroy`, and reports to React through callbacks (`onHud` only when a value changes, `onGameOver`). Keyboard listeners go on `window`; an engine can also listen for `mousemove` on its own canvas (the Arkanoid in `bloque-buster` does), converting the pointer to logical coordinates with `W / rect.width`. Every listener is removed in `destroy()`.
  - `components/games/<Game>Player.tsx`: Client Component that creates the engine in `useEffect`, destroys it in the cleanup (StrictMode mounts twice in dev), and renders the shared `PlayerHud`, the CRT and `GameOverModal`. `PlayerHud` shows lives by default; games without lives pass the optional `lines` prop, which replaces the "Vidas" cell with "Líneas" (the Tetris in `caida` does this).
  - Touch controls (spec 11): every engine exposes `press(code)` / `release(code)`, which run the same code path as its `keydown` / `keyup` for that `KeyboardEvent.code`. In touch mode (`useTouchMode()`: `(pointer: coarse)` or a first `touchstart`) every player mounts `components/games/TouchControls.tsx` with its own `PadButton[]` (d-pad `up/down/left/right` + `a`/`b`, optional `repeat` at 170/50 ms) and `active={phase === "playing"}`, and swaps the start/pause texts to "TOCA…". Styles live in `app/globals.css` (`.touch-pad`, plus a landscape grid under `(orientation: landscape) and (pointer: coarse)`). A new game must do the same.
  - `components/games/RealGamePlayer.tsx`: maps each playable id to its player with `next/dynamic` and `ssr: false`, which only works inside a Client Component.
  - To add a real game: make sure its id exists in `public.games` and set its `accepts_scores = true` (both through a migration), write the engine (with `press`/`release`) and player (with `TouchControls`), add the id to `PLAYABLE_GAME_IDS`, and add its entry to the map in `RealGamePlayer.tsx`. Every playable game must also have its three skins and the `SkinSelector`: once it is playable, run the `skin-designer` agent for it, and then the `mobile-porter` agent.

### Next 16 changes that are easy to get wrong

The full list is in `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`.

- Request APIs are async only: `params`, `searchParams`, `cookies()`, `headers()` and `draftMode()` must be awaited.
- `middleware.ts` is renamed to `proxy.ts`.
- Parallel route slots need an explicit `default.js`.
- `next/image` defaults changed: local images with query strings need `images.localPatterns`, and `images.domains` is deprecated in favor of `remotePatterns`.

## Workflow: spec-driven development

This project uses spec-driven development: every feature is designed and implemented with Fernando Herrera's `/spec` and `/spec-impl` skills (https://github.com/Klerith/fernando-skills), installed in `~/.claude/skills/`. Don't start a feature without a spec. Specs 01–10 are all implemented, so the next one is `11-…`.

- `/spec <description>` writes a spec to `specs/NN-slug.md` in the `Draft` state. The user changes the state to approved by hand.
- `/spec-impl NN-slug` only runs on approved specs. It works on a `spec-NN-slug` branch and implements the spec's plan one step at a time. `specs/.spec-config.yml` (`AutoCreateBranch: true`) creates that branch automatically. When it is done, the spec's state is set to `implementada` and the branch is merged into `main` through a PR.
- To make a game playable (port from `reference/resources/started-games/` or a new original engine) run the project skill `/add-game <folder or id>` (`.claude/skills/add-game/`): it writes the Draft spec with the engine, player, registry and `accepts_scores` steps, which `/spec-impl` then implements.
- If a spec exists for a feature, implement what it says. Proposed changes belong in the spec, not in code that drifts from it.

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario.

- `/spec` and `/spec-impl` (global, `~/.claude/skills/`): design and implement features.
- `/add-game <folder or id>` (project, `.claude/skills/add-game/`, with `spec-template.md` and `checklist.md`): writes the spec that makes a game playable. Only the user can invoke it (`disable-model-invocation`).
- `/frontend-design`: required for any UI work.

## Agents

- `game-planner` (project, `.claude/agents/game-planner.md`): plans and decides which game fits the platform next. It reads the catalog (migrations of `public.games`), `PLAYABLE_GAME_IDS`, `reference/resources/started-games/` and `specs/`, scores 3–5 candidates (original or genre-based, never clones of a specific commercial game) and recommends one with its next step, `/add-game <id>`. It writes no code or specs.
  - Memory: `memory: project`, stored in `.claude/agent-memory/game-planner/` (`MEMORY.md` index plus `suggestions.md`, a log of every suggestion with its state), so it doesn't repeat or reopen discarded ideas.
  - To Do: on every run it creates or updates `reference/game-suggestions-todo.md` (Recomendado ahora / Pendientes / En curso / Hechas / Descartadas). It edits the file in place and respects boxes the user ticks by hand.
  - It only writes to its memory folder and that To Do file.
- `game-jam` (project, `.claude/agents/game-jam.md`): given a theme, designs one original game that turns the theme into its core mechanic and writes, without asking questions, its specs in `specs/game-jam/<game-id>/`: `README.md` (concept, index, open questions), `01-<id>-catalogo.md` (migration inserting the new id into `public.games` with `accepts_scores = false` + a CSS `cover-*`), `02-<id>-jugable.md` (engine, player, registry, `accepts_scores = true`, in the format of specs 08–10) and `03-<id>-<slug>.md` (one scoped extension). All are `Borrador`; the user reviews them, approves them and moves them to `specs/` with the next free number before `/spec-impl`. It only writes inside its `specs/game-jam/<game-id>/` folder.
- `skin-designer` (project, `.claude/agents/skin-designer.md`): works on the game the user names (e.g. "skins para serpentina"), or on several one after another; it never touches games it was not asked for. It audits that the game has at least three skins, `clasico` (default, today's `COLORS`; changed only with the user's approval), `neon` and `retro`, and that each one reads well on the dark CRT background, measured with a WCAG contrast script (entities ≥ 4.5:1, decor 1.2–3:1, scanline and vignette dimming, color-blind-safe pairs, glow limits). It implements the skins directly, without a spec (an agreed exception to the spec-driven workflow, since skins are purely visual): the shared `lib/games/skins.ts` (`SkinId`, `localStorage` key `av-skin:<game-id>`) and `components/games/SkinSelector.tsx` if they don't exist, the game's `lib/games/<motor>/skins.ts` palettes, the engine's `skin` option and `setSkin()`, and the selector in its player, then runs `tsc`/`lint`/`build`. Skins never change gameplay or scores, and need no migration. It never commits. Every playable game must have a skin selector; with "todos los que faltan" it does every game whose player lacks `SkinSelector`, one after another.
  - Registry: `reference/game-with-themes.md` records which playable games already have skins (`sin skins` → `implementada` → `con skins ✅`). Each run updates only the requested game's row and section. With no game named, the agent just reports that table.
  - Memory: `memory: project`, in `.claude/agent-memory/skin-designer/` (`MEMORY.md` + `palettes.md` with every palette, its measured contrast and its state).
  - It only writes to the requested game's engine and player, the shared skin files, `reference/game-with-themes.md` and its memory folder.
- `mobile-porter` (project, `.claude/agents/mobile-porter.md`): makes the site look and work well in the phone/tablet browser (no PWA) without changing desktop. Input: one game, one route, "todo", or nothing (just reports its registry).
  - It measures with Playwright MCP at 360×740, 390×844, 844×390, 820×1180, 1180×820 (CDP touch emulation so `(pointer: coarse)` matches) plus 1440×900 as a desktop control. It uses a `browser_evaluate` script that reports horizontal overflow, tap targets (≥ 44 px, inline links ≥ 24 px), input font ≥ 16 px, text ≥ 14 px, and pad/CRT fit.
  - Games must pass the spec 11 acceptance checklist (`press`/`release`, `TouchControls` with the table's buttons ≥ 56 px, "TOCA…" texts, layout in both orientations).
  - It implements fixes directly, without a spec (an agreed exception to the spec-driven workflow, like skins): `@media` blocks in `app/globals.css`, markup/classes of pages and players, and only `press`/`release` in engines. It never changes gameplay, skins, data, Supabase or specs, and never commits.
  - It uses a running dev server or starts one and stops it; `npm run build` only runs with no `next dev` alive. Once a game is playable, run it for that game too.
  - Registry: `reference/mobile-audit.md` (games and routes × viewports; `sin revisar` → `implementada` → `ok ✅`). Memory: `.claude/agent-memory/mobile-porter/` (`MEMORY.md` + `findings.md`).
