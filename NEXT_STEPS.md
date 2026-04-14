# Next Steps

Work items to take this from demo-ready to production-ready, roughly ordered
by impact.

## Security
- [ ] Replace the demo-user bootstrap with real SSO or properly provisioned
      accounts.
- [ ] Tighten RLS policies per table, driven by `user_profiles.role` joined
      through `auth_user_id`.
- [ ] Add MFA.
- [ ] Audit log table capturing every write from `dataService` mutations,
      keyed by `actor_id`.

## Integrations
- [ ] Replace `registrationLookupService` with the DMV API client.
- [ ] Replace `ftpQueueService` with a real SFTP submitter + return-file
      listener that updates `lookup_queue_records.result_status` and
      `result_payload`.
- [ ] Replace `noticeService` with a PDF renderer and SFTP push to the
      printing vendor.
- [ ] Wire Supabase Storage for document uploads.

## Backend migration path (.NET API + SQL Server)
This is designed for. Everything UI-facing routes through
`src/services/dataService.ts`. To migrate:
1. Stand up a .NET 8 Web API project with EF Core pointed at SQL Server.
2. Port the schema in [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql)
   to EF migrations.
3. Implement endpoints that match the methods on `dataService` (shape of
   request/response should match the TS types in `src/domain/models.ts`).
4. Create `src/services/dotnetApiDataService.ts` with the same exported
   shape as `dataService.ts`, using `fetch` instead of Supabase.
5. Swap the import in places that use `dataService` (or better, rename
   `dataService.ts` to `supabaseDataService.ts` and export the chosen
   implementation from `index.ts`).

No UI file should need to change.

## UX polish
- [ ] Global keyboard shortcuts (`/` focus search, `g d` dashboard, `g s` search).
- [ ] Command palette.
- [ ] Keyboard-navigable tables via arrow keys.
- [ ] Loading skeletons (currently uses plain "Loading…" text).
- [ ] Sticky table headers inside `Card` components.
- [ ] Print view for Master Case Detail (clean PDF export).

## Data model extensions
- [ ] Split `violation_description` into a reference `violation_codes` table
      so fines are driven by code.
- [ ] Track `actor_id` on every mutation path — currently most writes don't
      populate `created_by` / `updated_by`.
- [ ] Partial refunds and waivers need dedicated UI beyond the ledger view.

## Testing
- [ ] Vitest unit tests for `rules/` once those are extracted from
      `dataService` (`transferLiability`, `recordPayment`, ledger balance
      computation).
- [ ] Playwright end-to-end tests for the demo script in the plan file
      (login → search → case detail → accept payment → transfer liability).

## Observability
- [ ] Client-side error reporting (Sentry).
- [ ] Performance tracing on the heavy `getCaseDetail` query which does ~10
      parallel Supabase calls.
