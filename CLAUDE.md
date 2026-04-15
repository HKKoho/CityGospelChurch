# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ecclesia Manager — a church community management platform for City Gospel Church. Three user roles (public, congregation, admin) with tab-based navigation, Firebase backend, and Gemini AI integration.

## Commands

```bash
npm run dev          # Start both backend (port 3001) and Vite frontend (port 3000)
npm run dev:client   # Start Vite frontend only
npm run dev:server   # Start Express backend only (tsx watch with hot reload)
npm run build        # Production build via Vite
npm run preview      # Preview production build locally
npm run clean        # Remove dist/
npm run lint         # TypeScript type-check only (tsc --noEmit) — no ESLint/Prettier configured
```

## Architecture

### Tech Stack
- **React 19** + TypeScript, built with **Vite 6**
- **Tailwind CSS 4** with shadcn/base-ui components (`src/components/ui/`)
- **Firebase 12**: Auth (Google OAuth only) + Firestore (real-time NoSQL)
- **Express** backend (`server/index.ts`) proxying Gemini API calls — keeps API key server-side
- **Gemini AI** (`gemini-3-flash-preview`) for community engagement tips, accessed via `POST /api/gemini/guidance`

### Routing & Views
No React Router — uses tab-based client-side routing via state in `App.tsx > Navigation`. Three views:
- **PublicView** — media highlights, room showcase, AI guidance (no auth required)
- **CongregationView** — roll call (4-digit phone lookup against worksheet), room booking, history (requires `congregation` or `admin` role)
- **AdminView** — manage users/bookings/rooms/media/worksheets, seed demo data (requires `admin` role)

### Auth & RBAC
- `AuthProvider` in `src/components/Auth.tsx` wraps the app, provides `user`, `profile`, `signIn()`, `logout()` via context
- Google Sign-In creates a Firestore profile at `/users/{uid}` with default role `public`
- `AuthGuard` component gates views by checking `profile.role` against `allowedRoles`
- Hardcoded admin bypass: `phish.econ@gmail.com` in Firestore security rules

### Data Layer
- All data flows through **Firestore real-time subscriptions** (`onSnapshot`) — components subscribe on mount, unsubscribe on cleanup
- Mutations via `addDoc()`, `updateDoc()`, `deleteDoc()` directly from components
- No API abstraction layer — Firestore calls are inline in component code

### Firestore Collections
| Collection | Purpose | Key fields |
|---|---|---|
| `users` | User profiles & roles | `uid`, `role`, `lastFourDigits` |
| `bookings` | Room reservations | `roomId`, `userId`, `status` (pending/approved/rejected) |
| `rooms` | Available spaces | `name`, `capacity`, `imageUrl` |
| `media` | Sermons, videos, audio | `title`, `type`, `url`, `category` |
| `attendance` | Roll call records | `date`, `lastFourDigits`, `status` |
| `worksheet` | 4-digit code → name mapping | `lastFourDigits`, `name` |

All type definitions in `src/types.ts`.

### Backend (`server/index.ts`)
Express server on port 3001 (configurable via `SERVER_PORT`). Vite proxies `/api` requests to it in dev. Gemini API calls are made server-side only — the API key never reaches the client bundle.

### Environment Variables
- `GEMINI_API_KEY` — used by the backend server only (never exposed to client)
- `SERVER_PORT` — backend port (default 3001)
- `DISABLE_HMR=true` — disables hot module replacement (for AI Studio)

### Path Alias
`@/*` maps to `./src/*` (configured in both `tsconfig.json` and `vite.config.ts`).

### Styling
Tailwind 4 with custom CSS classes in `src/index.css`: `.glass-card` (frosted glass), `.technical-grid`/`.technical-cell` (grid layouts), `.micro-label`. Fonts: Playfair Display (headings), Inter/Geist (body), JetBrains Mono (code).

### Notable Design Decisions
- Bookings default to 2-hour duration (hardcoded)
- Room/media images use picsum.photos placeholders — no file upload support
- Firestore security rules enforce RBAC server-side (see `firestore.rules`)
- Firebase config lives in `firebase-applet-config.json` (loaded by `src/lib/firebase.ts`)
