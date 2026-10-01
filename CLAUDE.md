# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault is an online platform for playing games and competing for the highest score. It is currently the unmodified `create-next-app` scaffold. The README is written in Spanish.

## Commands

```bash
npm run dev            # dev server (Turbopack is the default bundler in Next 16)
npm run build          # production build
npm run start          # serve the production build
npm run lint           # ESLint flat config (`next lint` no longer exists in Next 16)
npx eslint app/page.tsx  # lint a single file
npx tsc --noEmit       # type-check
```

No test framework is set up yet.

## Stack and layout

- Next.js 16 (App Router) with React 19.2 and strict TypeScript. Routes live in `app/` at the repo root; there is no `src/`. The `@/*` path alias resolves to the repo root.
- Tailwind CSS v4 is wired through PostCSS (`@tailwindcss/postcss`). There is no `tailwind.config` file: the theme is defined in `app/globals.css` using `@import "tailwindcss"` and an `@theme inline` block that maps CSS variables (`--background`, `--foreground`, and the Geist font variables set in `app/layout.tsx`) to Tailwind tokens.
- Next 16 generates global route-type helpers such as `LayoutProps<"/">` and `PageProps<"/route">`; `app/layout.tsx` uses them. They are produced in `.next/types` by `next dev` or `next build`, so type errors about them usually mean the types haven't been generated yet.

### Next 16 changes that are easy to get wrong

The full list is in `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`.

- Request APIs are async only: `params`, `searchParams`, `cookies()`, `headers()` and `draftMode()` must be awaited.
- `middleware.ts` is renamed to `proxy.ts`.
- Parallel route slots need an explicit `default.js`.
- `next/image` defaults changed: local images with query strings need `images.localPatterns`, and `images.domains` is deprecated in favor of `remotePatterns`.

## Workflow: spec-driven development

Features are designed and implemented with the user's `/spec` and `/spec-impl` skills. They follow https://github.com/Klerith/fernando-skills.

- `/spec <description>` writes a spec to `specs/NN-slug.md` in the `Draft` state. The user changes the state to approved by hand.
- `/spec-impl NN-slug` only runs on approved specs. It works on a `spec-NN-slug` branch and implements the spec's plan one step at a time. `specs/.spec-config.yml` (`AutoCreateBranch`) controls whether that branch is created automatically.
- If a spec exists for a feature, implement what it says. Proposed changes belong in the spec, not in code that drifts from it.
