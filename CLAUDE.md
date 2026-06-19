# The Happy Box — Corporate Gifting Portal

@AGENTS.md

## Project

A production-grade **B2B corporate gifting portal** for **The Happy Box**, a Canadian
curated gift-box company. The portal lets **corporate clients** browse, configure, and
order curated gift boxes **at scale** — think bulk and recurring orders, multiple
recipients, and account-level history rather than one-off consumer checkout.

## Stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **npm** as the package manager
- **Node pinned via Volta** (`node 22.15.1` / `npm 10.9.2` in `package.json` → `"volta"`).
  No nvm — Volta keeps everyone on the same versions automatically.

> ⚠️ This Next.js version has breaking changes vs. older knowledge. Before writing any
> Next.js code, read the relevant guide in `node_modules/next/dist/docs/` (see `AGENTS.md`).

### Folder structure (`src/`)

| Path               | Purpose                                                        |
| ------------------ | ------------------------------------------------------------- |
| `src/app/`         | Routes, layouts, and pages (App Router).                       |
| `src/components/`  | Reusable React components shared across pages.                 |
| `src/components/ui/` | Low-level UI primitives (buttons, inputs, cards, etc.).     |
| `src/lib/`         | Utilities, helpers, and external-service clients.             |
| `src/hooks/`       | Custom React hooks.                                           |
| `src/types/`       | Shared TypeScript types and interfaces.                       |
| `src/styles/`      | Global and additional styling (Tailwind layers, etc.).        |

## Working rules

- **Plan first.** For any non-trivial feature, propose a plan and get approval *before*
  writing code.
- **One feature at a time.** Keep each change tightly scoped to a single feature; don't
  mix unrelated work.
- **Never commit secrets.** All secret values live in `.env` files, which are git-ignored.
  `.env.example` is the tracked template — update it whenever a new variable is introduced.
- **Handle errors explicitly.** Never let failures pass silently. Catch, surface, and
  handle errors (and show the user something sensible) rather than swallowing them.
- **Explain for a non-developer founder.** Write explanations and summaries so a
  non-technical founder can follow what changed and why — plain language, no unexplained
  jargon.

## Git workflow

- **`main` is production and is sacred.** Never commit feature work directly to `main`.
- **One branch per feature.** Build each feature on its own branch, then merge into `main`.
- **Clear commit messages.** Write concise, descriptive messages that explain the *what*
  and *why*.

## Security

This app will handle **real corporate client data** — contacts, shipping addresses, and
order history. Treat it accordingly:

- **Never hand-roll authentication or payments.** When we reach those features, use
  established, reputable providers (e.g. a managed auth provider and a managed payment
  processor) rather than building our own.
- Be deliberate about where client data is stored, logged, and transmitted.
