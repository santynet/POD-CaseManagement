# PVS legacy importer

Streams a tab-delimited PVS3805 export file into the POD Supabase database.
Idempotent — re-runs upsert by `citation_number` and by synthetic
`source_key` for ledger/docket rows, so imports can be repeated safely.

## One-time setup

1. Get the **direct Postgres connection string** from the Supabase
   Dashboard → Project Settings → Database → Connection pooler → **Session
   mode** URI. It looks like `postgresql://postgres.<ref>:<password>@<host>:5432/postgres`.
2. Add it to `.env` at the repo root:
   ```
   DATABASE_URL=postgresql://postgres.cwoq...:<password>@...pooler.supabase.com:5432/postgres
   ```
3. Apply the legacy-import schema migration (already applied in the shared
   project; for new environments, run `supabase/migrations/*.sql` in order).

## Running the importer

```bash
# Dry run — parses everything, no DB writes
npm run import:pvs -- --file pvs3805-case-sample.txt --dry-run

# Real run, small limit for a smoke test
npm run import:pvs -- --file pvs3805-case-sample.txt --limit 5

# Full file
npm run import:pvs -- --file pvs3805-full.txt

# Resume from a specific line after a connection drop
npm run import:pvs -- --file pvs3805-full.txt --from-line 450000

# Custom batch size and source tag
npm run import:pvs -- --file pvs3805-q1.txt --batch-size 1000 --source PVS3805-Q1
```

### Flags

| Flag | Default | Meaning |
|---|---|---|
| `--file <path>` | _(required)_ | PVS tab-delimited file |
| `--batch-size <n>` | 500 | Rows per upsert batch |
| `--from-line <n>` | 2 | Start line (1-based; header is line 1) |
| `--limit <n>` | _(none)_ | Stop after N data rows |
| `--dry-run` | off | Parse only, no DB writes |
| `--error-log <path>` | `./import-errors.log` | Where to write per-row errors |
| `--source <tag>` | `PVS3805` | Written to `citations.legacy_source` |

## What the importer writes

For each PVS row, in one transaction per batch:

1. **plates** — upsert by `(plate_number, state)`
2. **citations** — upsert by `citation_number`. Populates legacy date
   columns, denormalized vehicle columns, and the raw row JSON in
   `legacy_raw`.
3. **ledger_entries** (`source='import'`) — one per non-zero amount bucket
   (`Fine`, `CourtFee`, `Adjustment`, `CollectionFee`, `Payment`). Keyed by
   `source_key` so re-runs upsert in place and user-authored entries are
   never touched.
4. **docket_entries** (`source='import'`) — `CitationIssued` at the
   incident date, and `CitationEntered` with description
   "Imported from &lt;source&gt; on &lt;date&gt;" as the legacy-import
   marker.

## Idempotency rules

- Re-importing the same file → every row upserts in place. No duplicates.
- User-authored rows in `ledger_entries`/`docket_entries` have
  `source='user'` (the default) and are **never** deleted or modified by
  the importer.
- Rows that exist in the DB but are missing from a later import are
  **left alone** — no deletes.

## Parse / skip errors

- Rows that fail to parse are written to `--error-log` with their line
  number and the error message, then skipped.
- Rows that fail their SQL batch tag the whole batch with the error and
  continue with the next batch.
- The script exits with code 1 if more than 10% of rows error.

## Out of scope for this importer

- Owner / party matching (companion file, later)
- Code dictionaries (municipality name, violation 1–23 description,
  collection agency name, M/P/A collection status)
- Notice queue reconstruction from `PVS-CAS-NOTICE-DATE`
- Registration holds / tow orders beyond the booleans on citations
