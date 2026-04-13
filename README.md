# POD Case Management

Web-based parking case management system.

## Stack

- React 18 + TypeScript + Vite
- Supabase (current backend) — abstracted behind `src/services/dataService.ts` so it can later be swapped for a .NET API + SQL Server.

## Getting started

```bash
npm install
cp .env.example .env   # fill in Supabase URL + anon key (optional — falls back to in-memory data)
npm run dev
```

## Architecture notes

All data access goes through `dataService`. Today it points at Supabase (or local sample data if env vars are absent). To switch to a .NET API later, add a new implementation of the `DataService` interface and swap the export — UI code does not change.
