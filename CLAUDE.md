# POD New System — Claude guide

Desktop-first web app for the Parking Operations Department. Manages parking
citation cases end-to-end: intake → plate lookup → owner matching → liability
transfer → hearings/motions → collections → closure, with a chronological
docket as the system of record.

## Stack

- **Frontend**: React 18 + TypeScript + Vite, React Router v6, Tailwind CSS,
  TanStack Query, TanStack Table, Zustand (session), React Hook Form + Zod,
  date-fns, clsx
- **Backend**: Supabase (Postgres + Auth). **Never import
  `@supabase/supabase-js` from a component.** All DB access must go through
  [src/services/dataService.ts](src/services/dataService.ts). This is the
  single file that has to change when we eventually migrate to a .NET API +
  SQL Server.
- **Design tokens**: lifted verbatim from the Stitch "Civic Ledger" comps
  into [tailwind.config.js](tailwind.config.js). Don't introduce new palette
  colors — use the token names (`primary`, `surface-container-lowest`,
  `on-surface-variant`, etc.). No 1px solid borders for sectioning; use
  tonal background shifts.
- **Icons**: Material Symbols Outlined via the `<Icon>` helper or
  `<span className="material-symbols-outlined">name</span>`.
- **Node**: ≥ 20 required.

## Repo layout

```
src/
  app/
    AppShell.tsx         Sidebar + TopBar layout used by every auth route
    routes/              One file per screen (10 screens)
  components/
    layout/              Sidebar, TopBar
    ui/                  Design-system primitives (Button, Card, StatusPill, …)
    case/                Master Case Detail building blocks and tab panels
    workflows/           Drawer workflows (AcceptPayment, RequestHearing, RequestMotion)
  domain/
    models.ts            Canonical TypeScript shapes
  services/
    dataService.ts       The only Supabase-aware layer
    integrations.ts      Stubbed: registrationLookup, ftpQueue, noticeService
  lib/
    supabase.ts          Supabase client singleton (the only file that imports @supabase/supabase-js)
    cn.ts                clsx wrapper
    formatters.ts        currency, dates, plate, party-name
    permissions.ts       role-based can()
  store/
    sessionStore.ts      Zustand: current user (persisted)
  styles/index.css       Tailwind base + body styles
```

## Screens (10)

1. **Login** — Supabase Auth password sign-in
2. **Dashboard** — KPI grid
3. **Global Search** — Citations / Parties / Plates tabs
4. **Master Case Detail** — asymmetric header + 8 tabs (Overview, Parties,
   Plate & Vehicle, Financials, Hearings, Documents, Docket, Collections)
5. **Party Detail** — personal info, plate history, related cases
6. **Plate & Vehicle History** — vertical timeline
7. **Ledger & Docket** — financial ledger + docket timeline (also embedded
   as tabs on the case detail)
8. **Transfer Liability** — 3-step wizard (Identify → Reason → Review)
9. **Registration Lookup Queue** — FL/OOS tabs
10. **Notice Queue** — outbound notices

## Core business rules (respect these when editing)

- A citation begins tied to a **plate**. Party matching happens later.
- If no party matches in real time, the citation goes into the FL or OOS
  **registration lookup queue**.
- `case_party` is m:n and effective-dated — **never overwrite** a liable
  party; mark the old row `is_current = false`, `role = 'Historical'`, set
  `effective_end`, then insert a new current row.
- Every meaningful case event **must** append a `DocketEntry`. The docket is
  the source of truth. Mutations in `dataService` already do this (see
  `recordPayment`, `requestHearing`, `requestMotion`, `transferLiability`).
- Primary status (`Open` / `Closed` / `Dismissed`) and secondary disposition
  (`Awaiting Court` / `In Collections` / `Paid` / `Liability Transferred` /
  …) are independent fields — the header shows both.
- Related cases: by **party** if a liable party exists on the current case,
  otherwise by **tag** (plate). Don't conflate these.
- Holds (`RegistrationHold`, `TowOrder`) and `CollectionAssignment` have
  their own tables; the boolean flags on `citations` are summary indicators
  the UI reads for alert chips.

## Patterns to follow

- **Data fetching**: `useQuery({ queryKey: [...], queryFn: () => dataService.xxx() })`.
  Cache key should include all parameters. After a mutation, call
  `queryClient.invalidateQueries({ queryKey: [...] })` on the affected key.
- **Mutations**: add the method to `dataService`, not to the component. Every
  mutation that changes case state must also call `dataService.appendDocket`.
- **Styling**: reach for an existing UI primitive first (`Card`, `Button`,
  `StatusPill`, `AlertChip`, `DataTable`, `Timeline`, `Drawer`, `Stepper`,
  `InputField`, `SelectField`, `EmptyState`). Compose, don't copy.
- **Permissions**: gate actions with `can(user.role, 'case.transferLiability')`
  from [src/lib/permissions.ts](src/lib/permissions.ts). Don't hard-code
  role checks inline.
- **Tables**: use `<DataTable>` for anything data-grid-ish. For bespoke
  result tables (search, party detail), we use a hand-rolled `<table>` — if
  you need sorting/filtering, switch to `<DataTable>`.
- **Files to never touch without a reason**: `tailwind.config.js` (design
  tokens are locked), `supabase/migrations/0001_init.sql` (schema frozen —
  add new migrations instead), `src/lib/supabase.ts` (client config).

## Supabase project

- Project ID: **cwoqsudvzwdowspypozi** ("POD-CaseManagement" in org
  "Doggy Canvas")
- URL and anon key live in `.env` (gitignored)
- RLS is **permissive for authenticated users** right now — role enforcement
  is client-side via `permissions.ts`. Tightening RLS is tracked in
  [NEXT_STEPS.md](NEXT_STEPS.md).
- The `user_profiles` table is populated by seed; Supabase `auth.users` is
  populated manually (see Demo users below).

## Demo users

Four accounts, password `Demo1234!`:

| Email                  | Role       |
|------------------------|------------|
| `admin@pod.local`      | Admin      |
| `clerk@pod.local`      | Clerk      |
| `supervisor@pod.local` | Supervisor |
| `court@pod.local`      | Court      |

These were inserted directly into `auth.users` via SQL because Supabase's
default signup rejects `.local` domains. If you need to recreate them, the
SQL is in this conversation's history or just re-run the same `insert into
auth.users (…) select … crypt('Demo1234!', gen_salt('bf')) …` pattern and
make sure every token column is `''` (empty string, not NULL) or GoTrue
returns "Database error querying schema".

## Hero case for demos

- Citation **#08662452** (Kurt Eyre, plate **RITP63**, Mercedes-Benz GLE, FL)
- Currently in collections, has a registration hold, partial payments
- Full docket (10 entries), ledger (5 entries), 4 documents, 3 notices
- Plate RITP63 has 3 historical plate-party associations on the timeline
- Great for demoing search → case detail → accept payment → transfer
  liability → party detail → plate history

## Running locally

```bash
npm install            # once
npm run dev            # Vite dev server on :5173
npm run build          # tsc + vite build
```

Windows PowerShell note: if `npm run dev` is blocked by execution policy,
either use `npm.cmd run dev` or run
`Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` once.

## Integrations (all stubbed)

In [src/services/integrations.ts](src/services/integrations.ts):

- `registrationLookupService.lookup()` — 70% hit rate, 400ms latency
- `ftpQueueService.submit()` — inserts a `lookup_queue_records` row
- `noticeService.generate()` — inserts a `notices` row

Replace each with a real client when available — nothing else needs to
change. See [ASSUMPTIONS.md](ASSUMPTIONS.md) for the full list of stubs and
[NEXT_STEPS.md](NEXT_STEPS.md) for the production migration path (including
the route to swap Supabase for a .NET API + SQL Server).

## Legacy data import (PVS3805)

- A CLI importer lives at [scripts/import-pvs.ts](scripts/import-pvs.ts).
  Run it with `npm run import:pvs -- --file <path> [--dry-run] [--limit N]`.
- Pure parser is at [scripts/import/parsePvsRow.ts](scripts/import/parsePvsRow.ts)
  with unit tests in [scripts/import/__tests__/parsePvsRow.test.ts](scripts/import/__tests__/parsePvsRow.test.ts).
- Requires `DATABASE_URL` in `.env` — the direct Postgres URI from
  Supabase → Project Settings → Database → Connection pooler (Session
  mode). The importer uses `pg` directly, not the Supabase JS client, so
  it can do multi-row upserts at full speed.
- Schema additions for legacy fields are in [supabase/migrations/0003_legacy_import.sql](supabase/migrations/0003_legacy_import.sql).
  `citations` gained `ordinance_or_statute`, `notice_date`,
  `disposition_date`, `court_date`, `closed_date`, denormalized
  `vehicle_make`/`body_style`/`color`/`year`, and `legacy_*` fields.
  `ledger_entries` and `docket_entries` gained `source` (default `'user'`)
  and `source_key` with partial unique indexes on `source='import'`.
- Full flag reference and quirks in [scripts/import/README.md](scripts/import/README.md).

### Importer invariants

- Re-runs upsert by `citation_number` and by `(case_id, source_key)` for
  synthetic ledger/docket rows. **User-authored rows (`source='user'`) are
  never touched.**
- Missing rows on a subsequent import are left alone — no deletes.
- Plate resolution follows the user's rule: origin-tag wins, else
  strip-trailing-digits when `HH-DECAL-NBR` is a prefix, else raw tag.
- Disposition mapping is in [scripts/import/mapDisposition.ts](scripts/import/mapDisposition.ts)
  — update the dictionary there when new codes arrive.

## Things the plan explicitly deferred

- Real auth / SSO / MFA
- Per-role RLS policies in Postgres
- Real registration lookup, FTP queue submission, notice PDF rendering
- Document file storage (Supabase Storage) — URLs are placeholder `#`
- Audit trail table (we rely on the docket for visible events only)
- Unit tests for business rules (planned in `rules/` extraction)
- Playwright end-to-end tests
