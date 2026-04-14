# POD New System

Desktop-first web application for the Parking Operations Department. Manages
parking citation cases from intake through closure with real-time owner
lookup, registration lookup queues, liability transfer with full historical
preservation, and a chronological docket as the system of record.

## Stack

- **React 18 + TypeScript + Vite** — SPA frontend
- **React Router v6** — nested layouts
- **Tailwind CSS** — design tokens lifted from the Stitch "Civic Ledger" comps
- **TanStack Query** — server state
- **TanStack Table** — dense grids
- **Zustand** — lightweight client state (session)
- **Supabase** — Postgres + Auth, accessed behind a typed `dataService` interface
- **date-fns**, **clsx**, **react-hook-form**, **zod**

The entire Supabase access layer lives in [src/services/dataService.ts](src/services/dataService.ts).
UI components never import `@supabase/supabase-js` directly — swap this file
for a `.NET API` adapter later without touching any screens.

## Getting started

```bash
npm install
npm run dev
```

Requires Node ≥ 20. `.env` must contain:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### First-time login

The seed data creates four user profile rows but cannot create Supabase Auth
users directly. On the login screen, click **Initialize Demo Users** once to
create them:

| Email                    | Password   | Role       |
|--------------------------|------------|------------|
| `admin@pod.local`        | `Demo1234!`| Admin      |
| `clerk@pod.local`        | `Demo1234!`| Clerk      |
| `supervisor@pod.local`   | `Demo1234!`| Supervisor |
| `court@pod.local`        | `Demo1234!`| Court      |

## Folder structure

```
src/
  app/
    AppShell.tsx           # sidebar + topbar layout
    routes/                # one file per screen
  components/
    layout/                # Sidebar, TopBar
    ui/                    # Design-system primitives
    case/                  # Case-detail building blocks + tab panels
    workflows/             # Drawer workflows (payment, hearing, motion)
  domain/
    models.ts              # Canonical TypeScript shapes
  services/
    dataService.ts         # The only file that talks to Supabase
    integrations.ts        # Stubbed: registration lookup, FTP queue, notices
  lib/
    supabase.ts            # Supabase client singleton
    cn.ts                  # class-name helper
    formatters.ts          # currency, dates, plate, party-name
    permissions.ts         # role-based can()
  store/
    sessionStore.ts        # Zustand: current user
  styles/
    index.css              # Tailwind base + body styles
```

## Screens

1. **Login** — Supabase Auth sign-in with seed-user bootstrapping
2. **Dashboard** — KPI grid with live counts from the DB
3. **Global Search** — filterable across Citations / Parties / Plates
4. **Master Case Detail** — asymmetric layout plus 8 tabs (Overview, Parties, Plate & Vehicle, Financials, Hearings, Documents, Docket, Collections)
5. **Party Detail** — personal info, plate history, related cases table
6. **Plate & Vehicle History** — vertical timeline of plate↔party associations
7. **Financial Ledger & Docket** — two-pane ledger with running balance + docket timeline
8. **Transfer Liability** — three-step wizard (Identify → Reason → Review) that writes a `LiabilityTransferred` docket entry and preserves the old liable party as historical
9. **Registration Lookup Queue** — FL/OOS tabs
10. **Notice Queue** — outbound notice print queue

## How to add a screen

1. Create `src/app/routes/MyPage.tsx`
2. Add a `<Route>` under `/` in [src/App.tsx](src/App.tsx) — it will be wrapped by `AppShell`
3. Add a sidebar link in [src/components/layout/Sidebar.tsx](src/components/layout/Sidebar.tsx)
4. Read data via `dataService.*` and wrap with `useQuery` — never talk to Supabase directly from the component

## Integrations (stubbed)

All three live in [src/services/integrations.ts](src/services/integrations.ts)
with typed interfaces. They persist results into the DB so the UI flows still
work end-to-end.

| Service                  | Purpose                                            |
|--------------------------|----------------------------------------------------|
| `registrationLookupService` | Real-time plate → owner lookup (70% hit rate)    |
| `ftpQueueService`           | Submits plate to FL or OOS FTP-driven queue      |
| `noticeService`             | Generates outbound notices for the print vendor  |

Replace each with real HTTP/FTP clients when available — no other code needs
to change.

## Scripts

- `npm run dev` — Vite dev server
- `npm run build` — typecheck + production build
- `npm run preview` — preview the production build
- `npm run test` — Vitest
