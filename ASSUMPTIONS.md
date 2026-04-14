# Assumptions & Stubs

Everything here is working in the demo, but backed by a stub or a simplification.
Each item lists what is simulated and what a production integration would
need.

## Authentication
- **Stub**: First-run "Initialize Demo Users" button calls `supabase.auth.signUp`
  to create four seed accounts with a shared password. Role is resolved by
  email, not by Supabase metadata.
- **Production**: SSO (SAML/OIDC) or at least properly provisioned accounts
  with role stored in `user_profiles.role` linked by `auth_user_id`, plus
  MFA.

## Row-level security
- **Stub**: RLS is enabled with a permissive `authenticated` policy allowing
  full read/write. Role enforcement lives in [src/lib/permissions.ts](src/lib/permissions.ts).
- **Production**: Per-table RLS keyed off `user_profiles.role`, enforced in
  the database so a compromised client cannot bypass it.

## Real-time registration lookup
- **Stub**: `registrationLookupService.lookup` sleeps 400ms and returns a
  hit 70% of the time with fake owner data.
- **Production**: HTTPS call to the jurisdiction's DMV API with retry, circuit
  breaker, and result caching.

## FL / OOS lookup queues
- **Stub**: `ftpQueueService.submit` inserts a `lookup_queue_records` row
  with status `Submitted`. No file is actually generated.
- **Production**: Scheduled job writes a batch file to the vendor's SFTP
  endpoint; inbound listener reads return files and updates
  `result_status` and `result_payload`.

## Outbound notices
- **Stub**: `noticeService.generate` inserts a `notices` row with status
  `Queued`.
- **Production**: Render a PDF from a template (e.g. Handlebars → Puppeteer
  or a service like DocRaptor), batch by delivery method, and push to the
  printing vendor's SFTP.

## Document upload
- **Stub**: Documents exist as seed rows with `url = '#'` — there is no
  actual file storage wired up.
- **Production**: Supabase Storage bucket with signed URLs and virus
  scanning on upload.

## Liability transfer
- Assumes the outgoing party exists and is the current `Liable` role. If the
  case has no liable party yet, the wizard won't render a "from" — this is
  intentional because there is nothing to transfer.

## Payment posting
- Recomputes balance as `max(0, current_balance - amount)`. If it reaches
  zero, the case is auto-closed with disposition `Paid`. Refunds and
  reversals are modeled in the ledger but there is no UI to create them.

## Dates and timezones
- All timestamps in the DB are `timestamptz`. The UI formats with the user's
  local timezone via `date-fns`. The seed data uses fixed EST/EDT offsets.

## Search
- Uses `ilike` across a handful of columns. For production, swap in Postgres
  full-text search (`tsvector`) or a dedicated search service.
