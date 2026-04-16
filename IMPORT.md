# POD Data Import Guide

All importers are idempotent — re-running the same file is safe.
Every script reads `DATABASE_URL` from `.env` (except `--dry-run` runs).

## One-time setup

1. Open the Supabase dashboard → **Project Settings → Database → Connection pooler**
2. Copy the **Session mode** URI (not Transaction mode)
3. Add it to `.env` at the repo root:
   ```
   DATABASE_URL=postgresql://postgres.<ref>:<password>@<host>:5432/postgres
   ```

---

## Importers

### 1. Citations / Cases — `import:pvs`

| | |
|---|---|
| **Source file** | `PVS3805-*.TXT` (tab-delimited) |
| **Target tables** | `plates`, `citations`, `ledger_entries`, `docket_entries` |
| **Conflict key** | `citations.citation_number`; ledger/docket by `(case_id, source_key)` |

```bash
npm run import:pvs -- --file <path> [options]
npm run import:pvs -- --help
```

| Flag | Default | Description |
|---|---|---|
| `--file <path>` | required | Path to the PVS tab-delimited citation file |
| `--dry-run` | off | Parse and validate only; no DB writes |
| `--limit <n>` | none | Stop after N rows (test runs) |
| `--batch-size <n>` | 500 | Rows per upsert batch |
| `--from-line <n>` | 2 | Resume from line N (1-based; use after a crash) |
| `--error-log <path>` | `./import-errors.log` | Per-row error log |
| `--source <tag>` | `PVS3805` | Written to `citations.legacy_source` |

**Business rules:**
- Each PVS row becomes one `citations` row (upsert by `citation_number`)
- Synthetic `ledger_entries` are created for each non-zero amount bucket: `Fine`, `CourtFee`, `Adjustment`, `CollectionFee`, `Payment` — keyed by `source_key` so re-runs upsert in place
- Two `docket_entries` per citation: `CitationIssued` at incident date, `CitationEntered` as import marker
- User-authored rows (`source = 'user'`) are **never touched**
- Rows missing from a later import are **left alone** — no deletes
- Script exits with code 1 if more than 10% of rows error

---

### 2. Collection Agencies — `import:agencies`

| | |
|---|---|
| **Source file** | `PVS3831-TBLDATA1-CAGENCY.TXT` |
| **Target table** | `collection_agencies` |
| **Conflict key** | `agency_code` |

```bash
npm run import:agencies -- --file <path> [options]
npm run import:agencies -- --help
```

| Flag | Default | Description |
|---|---|---|
| `--file <path>` | required | Path to the agencies file |
| `--dry-run` | off | Parse and print only; no DB writes |

**Business rules:**
- Two agencies in source data: `H` (Linebarger Law Firm) and `L` (PAM)
- `commission_pct` and `allocation` are imported as numeric values
- `effective_start` / `effective_end` are YYYYMMDD dates → ISO format; `00000000` becomes `null`
- Upsert updates all fields except `agency_code` on conflict

---

### 3. Statutes — `import:statutes`

| | |
|---|---|
| **Source file** | `PVS3831-TBLDATA1-STATUTE.TXT` |
| **Target table** | `statutes` |
| **Conflict key** | `(vio_code, statute)` |

```bash
npm run import:statutes -- --file <path> [options]
npm run import:statutes -- --help
```

| Flag | Default | Description |
|---|---|---|
| `--file <path>` | required | Path to the statutes file |
| `--dry-run` | off | Parse and print only; no DB writes |

**Business rules:**
- Source file has ~200 statute rows across 22 violation codes (vio 014 is absent from source)
- `vio_code` leading zeros are stripped: `"001"` → `"1"`
- Date ranges are **computed from vio_code**, not stored in the source file:

| vio_code | start_date | end_date | Meaning |
|---|---|---|---|
| 1 – 10 | 2000-01-01 | 2021-10-01 | Original ordinance, superseded Oct 2021 |
| 11 – 23 | 2021-10-01 | *(open)* | Revised ordinance, currently active |

---

### 4. Disposition Codes — `import:dispositions`

| | |
|---|---|
| **Source file** | `PVS3832-TBLDATA2-CRTDISP.TXT` |
| **Target table** | `disposition_codes` |
| **Conflict key** | `crtdisp` |

```bash
npm run import:dispositions -- --file <path> [options]
npm run import:dispositions -- --help
```

| Flag | Default | Description |
|---|---|---|
| `--file <path>` | required | Path to the disposition codes file |
| `--dry-run` | off | Parse and print only; no DB writes |

**Business rules:**
- 37 codes total (18 active, 19 inactive) in source data
- `PVSWE-3832-CD-ACTIVE` field: `"Y"` → `active = true`, anything else → `false`
- `last_update_date` is YYYYMMDD → ISO; `00000000` becomes `null`

---

### 5. Court Locations — `import:court-locations`

| | |
|---|---|
| **Source file** | `PVS3852-CRTLOC.TXT` |
| **Target table** | `court_locations` |
| **Conflict key** | `code` |

```bash
npm run import:court-locations -- --file <path> [options]
npm run import:court-locations -- --help
```

| Flag | Default | Description |
|---|---|---|
| `--file <path>` | required | Path to the court locations file |
| `--dry-run` | off | Parse and print only; no DB writes |

**Business rules:**
- 5 locations in source data: `ND`, `PVB`, `MJB`, `MB`, `REM`
- `last_chgd_date` is YYYYMMDD → ISO; `00000000` becomes `null`

---

### 6. Registration Records — `import:owner`

| | |
|---|---|
| **Source file** | `PVS3848-OWNER.TXT` (~1.7M rows, 611 MB) |
| **Target table** | `registration_records` |
| **Conflict key** | `(plate_number, plate_state, stored_date, stored_time)` |

```bash
npm run import:owner -- --file <path> [options]
npm run import:owner -- --help
```

| Flag | Default | Description |
|---|---|---|
| `--file <path>` | required | Path to the PVS owner file |
| `--dry-run` | off | Parse and validate only; no DB writes |
| `--limit <n>` | none | Stop after N rows (for test runs) |
| `--batch-size <n>` | 200 | Rows per upsert batch |
| `--throttle-ms <n>` | 0 | Sleep (ms) between batches — use `50` for live runs to avoid saturating the pooler |

**Business rules:**
- All historical records are kept — plates appear multiple times when the owner or vehicle changes
- `is_current = true` is set on the most recent snapshot per `(plate_number, plate_state)`, determined by `stored_date DESC, stored_time DESC`
- **Two-pass strategy** to avoid a post-import full-table UPDATE (which times out on 1.7M rows):
  - *Pass 1* — streams the file once, builds an in-memory map of the latest `(stored_date, stored_time)` per plate (~40 MB RAM)
  - *Pass 2* — streams the file again; each row is tagged `is_current` before upserting
- 11 source fields are dropped (internal COBOL fields, mostly empty):
  `STORE-PGM`, `MINOR-COLOR`, `OWN1-NAME-FORMAT`, `REG1-NAME-FORMAT`, `REG-STOPS`, `PREV-TITLE-ISSUE-DT`, `PREV-TITLE-STATE`, `SOURCE-DOC`, `RET-MAIL-DATE`, `LAST-CHGD-TERM`, `LAST-CHGD-PGM`
- COBOL name overflow: 20-char fixed fields cause long names to spill across `LNAME`/`FNAME`/`MNAME`. All non-empty parts are joined into `owner_full_name` and `registrant_full_name`:
  - `"HYUNDAI LEASE TITLIN"` + `"G TRUST"` → `"HYUNDAI LEASE TITLING TRUST"`
- For the full 1.7M row file, the recommended run:
  ```bash
  npm run import:owner -- --file <path> --throttle-ms 50
  ```

---

## Common patterns

### Dry run first
Always do a dry run before writing to the DB:
```bash
npm run import:owner -- --file <path> --dry-run --limit 20
```

### Date parsing
All importers convert YYYYMMDD strings to ISO `YYYY-MM-DD`. A value of `00000000` or empty becomes `null`.

### Idempotency
Every importer uses `INSERT ... ON CONFLICT DO UPDATE`. Re-running the same file produces the same result — no duplicates are created.

### Recommended import order
Reference tables should be imported before citations so that foreign-key lookups work correctly in the app:

1. `import:agencies`
2. `import:statutes`
3. `import:dispositions`
4. `import:court-locations`
5. `import:pvs` (citations/cases)
6. `import:owner` (registration records — largest file, run last)
