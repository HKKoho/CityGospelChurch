# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ecclesia Manager — a church community management platform for City Gospel Church. Three user roles (public, congregation, admin) with tab-based navigation, Supabase backend (PostgreSQL + Auth), and Gemini AI integration. Supports Vercel (cloud) and local Express server (on-premise) deployments.

## Commands

```bash
npm run dev        # Start Vite dev server on port 3000
npm run build      # Production build via Vite
npm run preview    # Preview production build locally
npm run clean      # Remove dist/
npm run lint       # TypeScript type-check only (tsc --noEmit) — no ESLint/Prettier configured
```

## Architecture

### Tech Stack
- **React 19** + TypeScript, built with **Vite 6**
- **Tailwind CSS 4** with shadcn/base-ui components (`src/components/ui/`)
- **Supabase**: Auth (Google OAuth) + PostgreSQL (real-time via `postgres_changes`)
- **Gemini AI** (`gemini-3-flash-preview`) for community engagement tips, accessed via `POST /api/gemini/guidance`
- **Deployment**: Vercel (serverless) OR local Express server (on-premise)

### Routing & Views
No React Router — uses tab-based client-side routing via state in `App.tsx > Navigation`. Three views:
- **PublicView** — media highlights, room showcase, AI guidance (no auth required)
- **CongregationView** — roll call (4-digit phone lookup against worksheet), room booking, history (requires `congregation` or `admin` role)
- **AdminView** — manage users/bookings/rooms/media/worksheets, seed demo data (requires `admin` role)

### Auth & RBAC
- `AuthProvider` in `src/components/Auth.tsx` wraps the app, provides `user`, `profile`, `signIn()`, `logout()` via context
- Google OAuth via `supabase.auth.signInWithOAuth()` (redirect-based, not popup)
- On first sign-in, creates a profile row in `users` table with default role `public`
- `AuthGuard` component gates views by checking `profile.role` against `allowedRoles`
- Hardcoded admin bypass: `phish.econ@gmail.com` in `is_admin()` SQL function

### Data Layer
- All data flows through **Supabase Realtime** (`postgres_changes` channels) — components subscribe on mount, unsubscribe on cleanup
- Mutations via `supabase.from('table').insert()`, `.update()`, `.delete()` directly from components
- No API abstraction layer — Supabase calls are inline in component code
- Security enforced at database level via PostgreSQL Row Level Security (RLS) policies

### PostgreSQL Tables
| Table | Purpose | Key columns |
|---|---|---|
| `users` | User profiles & roles | `uid`, `role`, `last_four_digits` |
| `bookings` | Room reservations | `room_id`, `user_id`, `status` (pending/approved/rejected) |
| `rooms` | Available spaces | `name`, `capacity`, `image_url` |
| `media` | Sermons, videos, audio | `title`, `type`, `url`, `category` |
| `attendance` | Roll call records | `date`, `last_four_digits`, `status` |
| `worksheet` | 4-digit code to name mapping | `last_four_digits`, `name` |

Schema + RLS policies: `supabase/migrations/001_initial_schema.sql`. All type definitions in `src/types.ts` (snake_case field names matching PostgreSQL columns).

### Serverless API (`api/`)
Vercel serverless functions in the `api/` directory. Currently one endpoint:
- `api/gemini/guidance.ts` — `POST /api/gemini/guidance` — proxies Gemini AI calls, keeping the API key server-side only

### Environment Variables
- `VITE_SUPABASE_URL` — Supabase project URL (embedded at build time)
- `VITE_SUPABASE_ANON_KEY` — Supabase public anon key (embedded at build time, safe to expose — RLS enforces security)
- `GEMINI_API_KEY` — used by serverless function / Express server only (never exposed to client)

### Deployment
- **Cloud**: Vercel + hosted Supabase — `vercel.json` builds with Vite, outputs to `dist/`, rewrites `/api/*` to serverless functions
- **On-premise**: Local Express server (`server.js`) + self-hosted Supabase (Docker) — all data stays on local hardware
- See `README.md` for full deployment instructions

### Path Alias
`@/*` maps to `./src/*` (configured in both `tsconfig.json` and `vite.config.ts`).

### Styling
Tailwind 4 with custom CSS classes in `src/index.css`: `.glass-card` (frosted glass), `.technical-grid`/`.technical-cell` (grid layouts), `.micro-label`. Fonts: Playfair Display (headings), Inter/Geist (body), JetBrains Mono (code).

### Notable Design Decisions
- Bookings default to 2-hour duration (hardcoded)
- Room/media images use picsum.photos placeholders — no file upload support
- PostgreSQL RLS policies enforce RBAC server-side (see `supabase/migrations/001_initial_schema.sql`)
- Supabase client initialized in `src/lib/supabase.ts`
