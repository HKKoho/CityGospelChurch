# Ecclesia Manager

A church community management platform for **City Gospel Church**. Three user roles (public, congregation, admin) with tab-based navigation, Supabase backend (PostgreSQL + Auth), and Gemini AI integration. Supports both cloud deployment (Vercel) and on-premise deployment (local Express server with self-hosted Supabase).

## Features

### Public Access (no login required)
- **Media Library** — browse sermons, videos, and audio highlights
- **Room Showcase** — view available church spaces with capacity info
- **AI Guidance** — get community engagement tips powered by Gemini AI

### Congregation (requires login + `congregation` or `admin` role)
- **Roll Call** — 4-digit phone number lookup against a worksheet for attendance tracking
- **Room Booking** — reserve church rooms with date/time selection (2-hour default duration)
- **Booking History** — view and manage your past reservations

### Admin (requires `admin` role)
- **User Management** — assign roles (`public`, `congregation`, `admin`) to registered users
- **Booking Approvals** — approve or reject pending room reservations
- **Room Management** — add, edit, and remove bookable spaces
- **Media Management** — upload and organize sermon/media content
- **Worksheet Management** — maintain the 4-digit code-to-name mapping for roll call
- **Seed Demo Data** — populate the database with sample data for testing

### Authentication & RBAC
- Google OAuth sign-in via Supabase Auth
- Role-based access control enforced both client-side (`AuthGuard` component) and server-side (PostgreSQL Row Level Security policies)
- New users default to `public` role; admins promote users through the admin panel

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Client (Browser)               │
│                                                   │
│  React 19 + TypeScript + Tailwind CSS 4           │
│  Tab-based routing: Public | Congregation | Admin │
│                                                   │
│  Supabase Client ── PostgreSQL (real-time sync)   │
│  Supabase Client ── Auth (Google OAuth)           │
│  fetch()         ── /api/gemini/guidance          │
└──────────────────────┬───────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼                         ▼
┌──────────────────┐    ┌─────────────────────┐
│   Supabase       │    │   API Server        │
│   (hosted or     │    │   (Vercel Serverless │
│    self-hosted)  │    │    OR Express local) │
│                  │    │                     │
│  PostgreSQL DB   │    │  Proxies Gemini     │
│  Auth service    │    │  calls, keeps API   │
│  Realtime engine │    │  key private        │
└──────────────────┘    └──────────┬──────────┘
                                   │
                                   ▼
                           Google Gemini API
```

### Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 6 |
| Styling | Tailwind CSS 4, shadcn/base-ui components |
| Database | PostgreSQL via Supabase (with Realtime) |
| Auth | Supabase Auth (Google OAuth) |
| AI | Gemini AI (`gemini-3-flash-preview`) |
| API | Vercel serverless function OR Express server |

### Data Flow
- All data flows through **Supabase Realtime** (`postgres_changes`) — components subscribe on mount and unsubscribe on cleanup
- Mutations use `supabase.from('table').insert()`, `.update()`, `.delete()` directly from components
- The Gemini AI endpoint is the only server-side API — it keeps the API key private
- Security enforced at the database level via PostgreSQL Row Level Security (RLS) policies

## File Structure

```
CityGospelChurch/
├── api/
│   └── gemini/
│       └── guidance.ts              # Vercel serverless function for Gemini AI
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql   # PostgreSQL schema, RLS policies, realtime config
├── src/
│   ├── components/
│   │   ├── ui/                      # shadcn/base-ui primitives (button, card, etc.)
│   │   ├── AdminView.tsx            # Admin dashboard — users, bookings, rooms, media
│   │   ├── Auth.tsx                 # AuthProvider, AuthContext, AuthGuard components
│   │   ├── CongregationView.tsx     # Roll call, room booking, booking history
│   │   ├── GeminiGuidance.tsx       # AI guidance card (calls /api/gemini/guidance)
│   │   └── PublicView.tsx           # Media highlights, room showcase, AI guidance
│   ├── lib/
│   │   ├── supabase.ts              # Supabase client initialization
│   │   └── utils.ts                 # Tailwind `cn()` merge helper
│   ├── App.tsx                      # Root component — AuthProvider + tab navigation
│   ├── index.css                    # Tailwind config + custom glass/grid styles
│   ├── main.tsx                     # React DOM entry point
│   └── types.ts                     # TypeScript interfaces (UserProfile, Room, Booking, etc.)
├── vercel.json                      # Vercel deployment config
├── vite.config.ts                   # Vite build config + path aliases
├── tsconfig.json                    # TypeScript config
├── package.json                     # Dependencies and scripts
└── .env.example                     # Environment variable template
```

### PostgreSQL Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `users` | User profiles and roles | `uid`, `name`, `email`, `role`, `last_four_digits` |
| `bookings` | Room reservations | `room_id`, `user_id`, `status` (pending/approved/rejected) |
| `rooms` | Available spaces | `name`, `capacity`, `image_url` |
| `media` | Sermons, videos, audio | `title`, `type`, `url`, `category` |
| `attendance` | Roll call records | `date`, `last_four_digits`, `status` |
| `worksheet` | 4-digit code to name mapping | `last_four_digits`, `name` |

Full schema with RLS policies: `supabase/migrations/001_initial_schema.sql`

## Supabase Setup

### Option A: Hosted Supabase (recommended for getting started)

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/migrations/001_initial_schema.sql`
3. Go to **Authentication > Providers > Google** and enable it:
   - Add your Google OAuth Client ID and Secret
   - Copy the callback URL and add it to your Google Cloud Console's authorized redirect URIs
4. Go to **Database > Replication** and confirm Realtime is enabled for all 6 tables
5. Copy your **Project URL** and **anon key** from **Project Settings > API**

### Option B: Self-Hosted Supabase (for on-premise / data sovereignty)

Self-hosted Supabase runs entirely on your own hardware — no data leaves your network.

1. Install Docker and Docker Compose on your server

2. Clone the Supabase Docker setup:
   ```bash
   git clone --depth 1 https://github.com/supabase/supabase
   cd supabase/docker
   cp .env.example .env
   ```

3. Edit `.env` — set your own secrets for `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, `POSTGRES_PASSWORD`, etc. Generate keys with:
   ```bash
   openssl rand -base64 32
   ```

4. Start Supabase:
   ```bash
   docker compose up -d
   ```

5. Access the Supabase dashboard at `http://localhost:8000` (default)

6. Run the migration SQL in the SQL Editor (or connect directly to Postgres on port 5432):
   ```bash
   psql -h localhost -p 5432 -U postgres -d postgres -f supabase/migrations/001_initial_schema.sql
   ```

7. Configure Google OAuth in the Supabase dashboard under **Authentication > Providers > Google**

8. Your Supabase URL is `http://localhost:8000` and the anon key is from your `.env` file

## Deployment

### Option 1: Vercel (Cloud)

Hosted Supabase + Vercel serverless. The simplest deployment.

**Prerequisites:** Node.js, a Vercel account, a Supabase project (see setup above)

1. Install the Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Set environment variables in Vercel:
   ```bash
   vercel env add GEMINI_API_KEY
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   ```
   Note: `VITE_` variables are embedded at build time. `GEMINI_API_KEY` is server-side only.

4. Redeploy for the env vars to take effect:
   ```bash
   vercel --prod
   ```

5. In Supabase dashboard, add your Vercel URL to **Authentication > URL Configuration > Site URL** and **Redirect URLs**.

**Custom domain:** Add your domain in the Vercel dashboard under **Project Settings > Domains**.

---

### Option 2: Local Server (On-Premise)

Self-hosted Supabase (Docker) + Express server. All data stays on your hardware.

**Prerequisites:** Node.js 18+, Docker, a machine that stays on

#### Step 1: Set up self-hosted Supabase

Follow the "Self-Hosted Supabase" instructions above.

#### Step 2: Build the frontend

```bash
npm install
npm run build
```

This outputs static files to `dist/`.

#### Step 3: Create the Express server

Create a file called `server.js` in the project root:

```js
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// --- Gemini AI endpoint ---
app.post('/api/gemini/guidance', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Gemini API is not configured.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents:
        'Provide 3 contemporary tips for improving church community engagement using digital platforms. Focus on room booking efficiency and roll call accuracy.',
      config: {
        systemInstruction:
          'You are a digital transformation consultant for community organizations. Provide concise, actionable advice in markdown format.',
      },
    });

    res.json({ text: response.text || 'No guidance generated.' });
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ error: 'Failed to generate guidance.' });
  }
});

// --- Serve static frontend ---
app.use(express.static(join(__dirname, 'dist')));

// --- SPA fallback (all other routes serve index.html) ---
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ecclesia Manager running at http://localhost:${PORT}`);
});
```

#### Step 4: Set environment variables

Create a `.env` file:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_ANON_KEY=your_anon_key_here
PORT=3000
```

Note: `VITE_` variables must be set **before building** (Step 2), as they are embedded into the frontend at build time.

#### Step 5: Run the server

```bash
node server.js
```

The app is now running at `http://localhost:3000`, connected to your local Supabase instance.

#### Step 6: Expose to the internet (optional)

If you want the app accessible from outside your network:

**Option A: Cloudflare Tunnel (recommended — no port forwarding needed)**

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared

# Create a tunnel (follow the login prompts)
./cloudflared tunnel login
./cloudflared tunnel create ecclesia
./cloudflared tunnel route dns ecclesia app.citygospel.org
./cloudflared tunnel run ecclesia
```

**Option B: Reverse proxy from the church website (Nginx)**

```nginx
location /ecclesia/ {
    proxy_pass http://your-server-ip:3000/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

#### Step 7: Keep the server running

Use `pm2` to keep the process alive and auto-restart on crashes:

```bash
npm install -g pm2
pm2 start server.js --name ecclesia
pm2 save
pm2 startup   # auto-start on system boot
```

---

### Deployment Comparison

| | Vercel + Hosted Supabase | Local Server + Self-Hosted Supabase |
|---|---|---|
| **Data location** | Cloud (Supabase servers) | On your hardware |
| **Setup** | Minimal | Requires Docker + server maintenance |
| **Cost** | Free tiers available | Free (your own hardware) |
| **SSL/HTTPS** | Automatic | Needs Cloudflare Tunnel or manual cert |
| **Uptime** | Managed | Depends on your machine/network |
| **Scaling** | Automatic | Limited to server hardware |
| **Data sovereignty** | No (cloud) | Yes (fully on-premise) |
| **Best for** | Quick deployment, small teams | Organizations requiring data control |

## Development

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server on port 3000
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # TypeScript type-check (tsc --noEmit)
npm run clean        # Remove dist/
```

**Path alias:** `@/*` maps to `./src/*` (configured in `tsconfig.json` and `vite.config.ts`).

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Build time (client) | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Build time (client) | Supabase public anon key |
| `GEMINI_API_KEY` | Server-side only | Google Gemini API key |
| `PORT` | Local server only | Express server port (default: 3000) |

Note: `VITE_` variables are embedded into the JavaScript bundle at build time. The anon key is safe to expose — security is enforced by PostgreSQL RLS policies, not by hiding the key.

## License

Apache-2.0
