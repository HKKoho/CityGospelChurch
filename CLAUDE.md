# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ecclesia Manager — a church community management platform for City Gospel Church. Three user roles (public, congregation, admin) with tab-based navigation, Firebase backend, and Gemini AI integration. Deployed on Vercel.

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
- **Firebase 12**: Auth (Google OAuth only) + Firestore (real-time NoSQL)
- **Gemini AI** (`gemini-3-flash-preview`) for community engagement tips, accessed via `POST /api/gemini/guidance`
- **Vercel** for hosting — frontend as static build, Gemini endpoint as serverless function

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

### Serverless API (`api/`)
Vercel serverless functions in the `api/` directory. Currently one endpoint:
- `api/gemini/guidance.ts` — `POST /api/gemini/guidance` — proxies Gemini AI calls, keeping the API key server-side only

### Environment Variables
- `GEMINI_API_KEY` — used by serverless function only (set in Vercel dashboard, never exposed to client)
- `DISABLE_HMR=true` — disables hot module replacement (for AI Studio)

### Deployment
- **Platform**: Vercel
- **Config**: `vercel.json` — builds with Vite, outputs to `dist/`, rewrites `/api/*` to serverless functions and everything else to `index.html`
- **Environment**: Set `GEMINI_API_KEY` in Vercel project settings > Environment Variables

### Path Alias
`@/*` maps to `./src/*` (configured in both `tsconfig.json` and `vite.config.ts`).

### Styling
Tailwind 4 with custom CSS classes in `src/index.css`: `.glass-card` (frosted glass), `.technical-grid`/`.technical-cell` (grid layouts), `.micro-label`. Fonts: Playfair Display (headings), Inter/Geist (body), JetBrains Mono (code).

### Notable Design Decisions
- Bookings default to 2-hour duration (hardcoded)
- Room/media images use picsum.photos placeholders — no file upload support
- Firestore security rules enforce RBAC server-side (see `firestore.rules`)
- Firebase config lives in `firebase-applet-config.json` (loaded by `src/lib/firebase.ts`)
