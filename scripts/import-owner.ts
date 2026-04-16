#!/usr/bin/env node
/**
 * Vehicle registration records importer (PVS3848-OWNER).
 *
 * Usage:
 *   npx tsx scripts/import-owner.ts --file <path> [--dry-run] [--limit N] [--batch-size N] [--throttle-ms N]
 *
 * Flags:
 *   --file <path>        Required. Path to the PVS tab-delimited owner file.
 *   --dry-run            Parse and validate only; no DB writes. Prints is_current assignments.
 *   --limit <n>          Stop after N data rows (useful for test runs).
 *   --batch-size <n>     Rows per upsert batch. Default 200.
 *   --throttle-ms <n>    Milliseconds to sleep between batches. Default 0. Use 50 for live runs.
 *
 * Strategy: two-pass.
 *   Pass 1 — stream the file, build an in-memory map of the latest (stored_date, stored_time)
 *            per (plate_number, plate_state). ~40 MB RAM for 1M unique plates.
 *   Pass 2 — stream the file again; each row is tagged is_current=true if it matches the
 *            latest map entry, false otherwise. Batch-upsert into registration_records.
 *
 * This avoids a post-import full-table UPDATE that times out on large datasets.
 *
 * Upsert key: (plate_number, plate_state, stored_date, stored_time)
 *
 * Requires DATABASE_URL in .env — Supabase Project Settings → Database → Connection pooler
 * (Session mode URI).
 */

import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { resolve as pathResolve } from 'node:path'
import { Client } from 'pg'

// ---------- args ---------------------------------------------------------------

interface Args {
  file: string
  dryRun: boolean
  limit: number | null
  batchSize: number
  throttleMs: number
}

function printHelp(): void {
  console.log(`
Usage: npm run import:owner -- --file <path> [options]

Import vehicle registration records (PVS3848-OWNER.TXT) into the
registration_records table. Upserts on (plate_number, plate_state, stored_date, stored_time).

Uses a two-pass strategy to set is_current without a post-import DB update:
  Pass 1 — scans the file to find the latest (stored_date, stored_time) per plate (~40 MB RAM).
  Pass 2 — re-streams and upserts each row with is_current already set.

Options:
  --file <path>       Required. Path to the PVS tab-delimited owner file.
  --dry-run           Parse and validate only; no DB writes. Prints is_current counts.
  --limit <n>         Stop after N rows (for test runs).
  --batch-size <n>    Rows per upsert batch. Default: 200.
  --throttle-ms <n>   Sleep (ms) between batches. Default: 0. Use 50 for live runs.
  --help, -h          Show this help message.

Recommended full-file run:
  npm run import:owner -- --file <path> --throttle-ms 50

Requires DATABASE_URL in .env (Supabase → Settings → Database → Connection pooler, Session mode).
`.trim())
}

function parseArgs(argv: string[]): Args {
  const args: Args = { file: '', dryRun: false, limit: null, batchSize: 200, throttleMs: 0 }
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--file':         args.file = argv[++i]; break
      case '--dry-run':      args.dryRun = true; break
      case '--limit':        args.limit = Number(argv[++i]); break
      case '--batch-size':   args.batchSize = Number(argv[++i]); break
      case '--throttle-ms':  args.throttleMs = Number(argv[++i]); break
      case '--help': case '-h': printHelp(); process.exit(0)
    }
  }
  if (!args.file) { console.error('Error: --file is required\nRun with --help for usage.'); process.exit(1) }
  return args
}

// ---------- env ----------------------------------------------------------------

function loadDotEnv(): void {
  const path = pathResolve(process.cwd(), '.env')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = val
  }
}

// ---------- column map ---------------------------------------------------------

const COLUMNS = [
  'PVS-TAGID-LICENSE',        //  1
  'PVS-TAGID-STATE',          //  2
  'PVS-OW-OWN1-LNAME',        //  3
  'PVS-OW-OWN1-FNAME',        //  4
  'PVS-OW-OWN1-MNAME',        //  5
  'PVS-OW-REG1-LNAME',        //  6
  'PVS-OW-REG1-FNAME',        //  7
  'PVS-OW-REG1-MNAME',        //  8
  'PVS-OW-STORE-DATE',        //  9
  'PVS-OW-STORE-TIME',        // 10
  // 11 PVS-OW-STORE-PGM — dropped
  'PVS-OW-VIN',               // 12
  'PVS-OW-YEAR-MAKE',         // 13
  'PVS-OW-MAKE',              // 14
  'PVS-OW-VEH-TYPE',          // 15
  'PVS-OW-BODY',              // 16
  'PVS-OW-VEH-USE',           // 17
  'PVS-OW-MAJOR-COLOR',       // 18
  // 19 PVS-OW-MINOR-COLOR — dropped
  'PVS-OW-OWN1-CUST-TYPE',    // 20
  // 21 PVS-OW-OWN1-NAME-FORMAT — dropped
  'PVS-OW-OWN1-STREET-ADDR',  // 22
  'PVS-OW-OWN1-APT-NO',       // 23
  'PVS-OW-OWN1-CITY',         // 24
  'PVS-OW-OWN1-STATE',        // 25
  'PVS-OW-OWN1-ZIPCODE',      // 26
  'PVS-OW-OWN1-COUNTRY',      // 27
  'PVS-OW-OWN1-DOB',          // 28
  'PVS-OW-OWN1-SEX',          // 29
  'PVS-OW-REG1-CUST-TYPE',    // 30
  // 31 PVS-OW-REG1-NAME-FORMAT — dropped
  'PVS-OW-REG1-STREET-ADDR',  // 32
  'PVS-OW-REG1-APT-NO',       // 33
  'PVS-OW-REG1-CITY',         // 34
  'PVS-OW-REG1-STATE',        // 35
  'PVS-OW-REG1-ZIPCODE',      // 36
  'PVS-OW-REG1-COUNTRY',      // 37
  'PVS-OW-REG1-DRIVER-LIC',   // 38
  'PVS-OW-REG1-DRIVER-LIC-ST',// 39
  'PVS-OW-REG1-DOB',          // 40
  'PVS-OW-REG1-SEX',          // 41
  'PVS-OW-REG-EFFECT-DATE',   // 42
  'PVS-OW-REG-EXP-DATE',      // 43
  'PVS-OW-PLATE-ISSUE-DATE',  // 44
  'PVS-OW-DECAL-NUMBER',      // 45
  'PVS-OW-DECAL-YEAR',        // 46
  // 47 PVS-OW-REG-STOPS — dropped
  'PVS-OW-REG-USE',           // 48
  'PVS-OW-ACTIVITY-DATE',     // 49
  'PVS-OW-TAG-TITLE-NUM',     // 50
  'PVS-OW-TITLE-ISSUE-DATE',  // 51
  // 52 PVS-OW-PREV-TITLE-ISSUE-DT — dropped
  // 53 PVS-OW-PREV-TITLE-STATE — dropped
  'PVS-OW-SOURCE',            // 54
  // 55 PVS-OW-SOURCE-DOC — dropped
  // 56 PVS-OW-RET-MAIL-DATE — dropped
  'PVS-OW-LAST-CHGD-ID',      // 57
  'PVS-OW-LAST-CHGD-DATE',    // 58
  'PVS-OW-LAST-CHGD-TIME',    // 59
  // 60 PVS-OW-LAST-CHGD-TERM — dropped
  // 61 PVS-OW-LAST-CHGD-PGM — dropped
] as const

// ---------- parse helpers ------------------------------------------------------

function parseDate(val: string): string | null {
  const s = val.trim()
  if (!s || s === '00000000') return null
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  return null
}

function parseYear(val: string): number | null {
  const n = parseInt(val.trim(), 10)
  return n && n > 0 ? n : null
}

function fullName(...parts: string[]): string | null {
  const joined = parts.map((p) => p.trim()).filter(Boolean).join(' ')
  return joined || null
}

// ---------- row type -----------------------------------------------------------

interface OwnerRow {
  plate_number:         string
  plate_state:          string
  stored_date:          string | null
  stored_time:          string | null
  is_current:           boolean
  vin:                  string | null
  vehicle_year:         number | null
  vehicle_make:         string | null
  vehicle_type:         string | null
  body_style:           string | null
  vehicle_use:          string | null
  color_primary:        string | null
  owner_lname:          string | null
  owner_fname:          string | null
  owner_mname:          string | null
  owner_full_name:      string | null
  owner_type:           string | null
  owner_address:        string | null
  owner_apt:            string | null
  owner_city:           string | null
  owner_state:          string | null
  owner_zip:            string | null
  owner_country:        string | null
  owner_dob:            string | null
  owner_sex:            string | null
  registrant_lname:     string | null
  registrant_fname:     string | null
  registrant_mname:     string | null
  registrant_full_name: string | null
  registrant_type:      string | null
  registrant_address:   string | null
  registrant_apt:       string | null
  registrant_city:      string | null
  registrant_state:     string | null
  registrant_zip:       string | null
  registrant_country:   string | null
  registrant_dl:        string | null
  registrant_dl_state:  string | null
  registrant_dob:       string | null
  registrant_sex:       string | null
  reg_effective_date:   string | null
  reg_exp_date:         string | null
  reg_use:              string | null
  plate_issue_date:     string | null
  decal_number:         string | null
  decal_year:           number | null
  activity_date:        string | null
  title_number:         string | null
  title_issue_date:     string | null
  source:               string | null
  last_chgd_id:         string | null
  last_chgd_date:       string | null
  last_chgd_time:       string | null
}

function parseRow(tokens: string[], col: Record<string, number>, isCurrent: boolean): OwnerRow | null {
  const g = (name: string) => (tokens[col[name]] ?? '').trim()

  const plateNumber = g('PVS-TAGID-LICENSE')
  if (!plateNumber) return null

  const ownerLname  = g('PVS-OW-OWN1-LNAME')
  const ownerFname  = g('PVS-OW-OWN1-FNAME')
  const ownerMname  = g('PVS-OW-OWN1-MNAME')
  const regLname    = g('PVS-OW-REG1-LNAME')
  const regFname    = g('PVS-OW-REG1-FNAME')
  const regMname    = g('PVS-OW-REG1-MNAME')

  return {
    plate_number:         plateNumber,
    plate_state:          g('PVS-TAGID-STATE') || null!,
    stored_date:          parseDate(g('PVS-OW-STORE-DATE')),
    stored_time:          g('PVS-OW-STORE-TIME') || null,
    is_current:           isCurrent,
    vin:                  g('PVS-OW-VIN') || null,
    vehicle_year:         parseYear(g('PVS-OW-YEAR-MAKE')),
    vehicle_make:         g('PVS-OW-MAKE') || null,
    vehicle_type:         g('PVS-OW-VEH-TYPE') || null,
    body_style:           g('PVS-OW-BODY') || null,
    vehicle_use:          g('PVS-OW-VEH-USE') || null,
    color_primary:        g('PVS-OW-MAJOR-COLOR') || null,
    owner_lname:          ownerLname || null,
    owner_fname:          ownerFname || null,
    owner_mname:          ownerMname || null,
    owner_full_name:      fullName(ownerLname, ownerFname, ownerMname),
    owner_type:           g('PVS-OW-OWN1-CUST-TYPE') || null,
    owner_address:        g('PVS-OW-OWN1-STREET-ADDR') || null,
    owner_apt:            g('PVS-OW-OWN1-APT-NO') || null,
    owner_city:           g('PVS-OW-OWN1-CITY') || null,
    owner_state:          g('PVS-OW-OWN1-STATE') || null,
    owner_zip:            g('PVS-OW-OWN1-ZIPCODE') || null,
    owner_country:        g('PVS-OW-OWN1-COUNTRY') || null,
    owner_dob:            parseDate(g('PVS-OW-OWN1-DOB')),
    owner_sex:            g('PVS-OW-OWN1-SEX') || null,
    registrant_lname:     regLname || null,
    registrant_fname:     regFname || null,
    registrant_mname:     regMname || null,
    registrant_full_name: fullName(regLname, regFname, regMname),
    registrant_type:      g('PVS-OW-REG1-CUST-TYPE') || null,
    registrant_address:   g('PVS-OW-REG1-STREET-ADDR') || null,
    registrant_apt:       g('PVS-OW-REG1-APT-NO') || null,
    registrant_city:      g('PVS-OW-REG1-CITY') || null,
    registrant_state:     g('PVS-OW-REG1-STATE') || null,
    registrant_zip:       g('PVS-OW-REG1-ZIPCODE') || null,
    registrant_country:   g('PVS-OW-REG1-COUNTRY') || null,
    registrant_dl:        g('PVS-OW-REG1-DRIVER-LIC') || null,
    registrant_dl_state:  g('PVS-OW-REG1-DRIVER-LIC-ST') || null,
    registrant_dob:       parseDate(g('PVS-OW-REG1-DOB')),
    registrant_sex:       g('PVS-OW-REG1-SEX') || null,
    reg_effective_date:   parseDate(g('PVS-OW-REG-EFFECT-DATE')),
    reg_exp_date:         parseDate(g('PVS-OW-REG-EXP-DATE')),
    reg_use:              g('PVS-OW-REG-USE') || null,
    plate_issue_date:     parseDate(g('PVS-OW-PLATE-ISSUE-DATE')),
    decal_number:         g('PVS-OW-DECAL-NUMBER') || null,
    decal_year:           parseYear(g('PVS-OW-DECAL-YEAR')),
    activity_date:        parseDate(g('PVS-OW-ACTIVITY-DATE')),
    title_number:         g('PVS-OW-TAG-TITLE-NUM') || null,
    title_issue_date:     parseDate(g('PVS-OW-TITLE-ISSUE-DATE')),
    source:               g('PVS-OW-SOURCE') || null,
    last_chgd_id:         g('PVS-OW-LAST-CHGD-ID') || null,
    last_chgd_date:       parseDate(g('PVS-OW-LAST-CHGD-DATE')),
    last_chgd_time:       g('PVS-OW-LAST-CHGD-TIME') || null,
  }
}

// ---------- upsert -------------------------------------------------------------

const FIELDS: (keyof OwnerRow)[] = [
  'plate_number', 'plate_state', 'stored_date', 'stored_time', 'is_current',
  'vin', 'vehicle_year', 'vehicle_make', 'vehicle_type', 'body_style', 'vehicle_use', 'color_primary',
  'owner_lname', 'owner_fname', 'owner_mname', 'owner_full_name', 'owner_type',
  'owner_address', 'owner_apt', 'owner_city', 'owner_state', 'owner_zip', 'owner_country',
  'owner_dob', 'owner_sex',
  'registrant_lname', 'registrant_fname', 'registrant_mname', 'registrant_full_name', 'registrant_type',
  'registrant_address', 'registrant_apt', 'registrant_city', 'registrant_state', 'registrant_zip',
  'registrant_country', 'registrant_dl', 'registrant_dl_state', 'registrant_dob', 'registrant_sex',
  'reg_effective_date', 'reg_exp_date', 'reg_use',
  'plate_issue_date', 'decal_number', 'decal_year', 'activity_date',
  'title_number', 'title_issue_date',
  'source', 'last_chgd_id', 'last_chgd_date', 'last_chgd_time',
]

const N = FIELDS.length
const CONFLICT_COLS = '(plate_number, plate_state, stored_date, stored_time)'
const UPDATE_COLS = FIELDS
  .filter((f) => !['plate_number', 'plate_state', 'stored_date', 'stored_time'].includes(f))
  .map((f) => `${f} = excluded.${f}`)
  .join(', ')

async function upsertBatch(client: Client, rows: OwnerRow[]): Promise<void> {
  if (rows.length === 0) return

  // Deduplicate within the batch — keep last occurrence of each conflict key.
  const seen = new Map<string, OwnerRow>()
  for (const r of rows) {
    const key = `${r.plate_number}|${r.plate_state}|${r.stored_date ?? ''}|${r.stored_time ?? ''}`
    seen.set(key, r)
  }
  rows = [...seen.values()]

  const placeholders = rows.map((_, i) =>
    `(${FIELDS.map((_, j) => `$${i * N + j + 1}`).join(',')})`
  ).join(',')

  const params: unknown[] = []
  for (const r of rows) {
    for (const f of FIELDS) params.push(r[f] ?? null)
  }

  await client.query(`
    insert into public.registration_records (${FIELDS.join(',')})
    values ${placeholders}
    on conflict ${CONFLICT_COLS} do update set
      ${UPDATE_COLS},
      updated_at = now()
  `, params)
}

// ---------- pass 1: build latest-per-plate map ---------------------------------

interface LatestEntry { stored_date: string | null; stored_time: string | null }

function isLater(a: LatestEntry, b: LatestEntry): boolean {
  // mirrors: ORDER BY stored_date DESC NULLS LAST, stored_time DESC NULLS LAST
  const aDate = a.stored_date ?? '0000-00-00'
  const bDate = b.stored_date ?? '0000-00-00'
  if (aDate !== bDate) return aDate > bDate
  const aTime = a.stored_time ?? ''
  const bTime = b.stored_time ?? ''
  return aTime > bTime
}

async function buildLatestMap(file: string, limit: number | null): Promise<Map<string, LatestEntry>> {
  const map = new Map<string, LatestEntry>()
  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity })

  let headerParsed = false
  let colMap: Record<string, number> = {}
  let rowCount = 0

  for await (const rawLine of rl) {
    const line = rawLine.replace(/^\uFEFF/, '')

    if (!headerParsed) {
      line.split('\t').forEach((name, idx) => { colMap[name.trim()] = idx })
      headerParsed = true
      continue
    }

    if (!line.trim()) continue
    if (limit !== null && rowCount >= limit) break
    rowCount++

    const tokens = line.split('\t')
    const g = (name: string) => (tokens[colMap[name]] ?? '').trim()

    const plateNumber = g('PVS-TAGID-LICENSE')
    if (!plateNumber) continue

    const plateState  = g('PVS-TAGID-STATE')
    const stored_date = parseDate(g('PVS-OW-STORE-DATE'))
    const stored_time = g('PVS-OW-STORE-TIME') || null
    const key         = `${plateNumber}|${plateState}`
    const entry       = map.get(key)
    const candidate   = { stored_date, stored_time }

    if (!entry || isLater(candidate, entry)) {
      map.set(key, candidate)
    }
  }

  return map
}

// ---------- main ---------------------------------------------------------------

async function main() {
  loadDotEnv()
  const args = parseArgs(process.argv.slice(2))

  if (!args.dryRun) {
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) { console.error('Error: DATABASE_URL not set in .env'); process.exit(1) }
  }

  // --- Pass 1 ---
  console.log('Pass 1: scanning for latest record per plate...')
  const latestMap = await buildLatestMap(args.file, args.limit)
  console.log(`  ${latestMap.size.toLocaleString()} unique plates found.\n`)

  // Connect to DB before creating readline — readline starts buffering immediately
  // on creation, so any await between createInterface and for-await risks dropping lines.
  const client = args.dryRun ? null : new Client({ connectionString: process.env.DATABASE_URL! })
  if (client) await client.connect()

  // --- Pass 2 ---
  console.log('Pass 2: importing rows with is_current set...')
  const rl = createInterface({ input: createReadStream(args.file), crlfDelay: Infinity })

  let colMap: Record<string, number> = {}
  let headerParsed = false
  let batch: OwnerRow[] = []
  let totalParsed = 0
  let totalSkipped = 0
  let totalUpserted = 0
  let currentCount = 0

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

  const flushBatch = async () => {
    if (batch.length === 0) return
    if (!args.dryRun && client) {
      await upsertBatch(client, batch)
      totalUpserted += batch.length
    }
    if (args.throttleMs > 0) await sleep(args.throttleMs)
    batch = []
  }

  try {
    for await (const rawLine of rl) {
      const line = rawLine.replace(/^\uFEFF/, '')

      if (!headerParsed) {
        line.split('\t').forEach((name, idx) => { colMap[name.trim()] = idx })
        for (const col of COLUMNS) {
          if (!(col in colMap)) { console.error(`Missing column: ${col}`); process.exit(1) }
        }
        headerParsed = true
        continue
      }

      if (!line.trim()) continue
      if (args.limit !== null && totalParsed >= args.limit) break

      const tokens = line.split('\t')
      const plateNum   = (tokens[colMap['PVS-TAGID-LICENSE']] ?? '').trim()
      const plateState = (tokens[colMap['PVS-TAGID-STATE']]   ?? '').trim()
      const storedDate = parseDate((tokens[colMap['PVS-OW-STORE-DATE']] ?? '').trim())
      const storedTime = (tokens[colMap['PVS-OW-STORE-TIME']] ?? '').trim() || null

      const plateKey = `${plateNum}|${plateState}`
      const entry    = latestMap.get(plateKey)
      const isCurrent = entry !== undefined
        && (storedDate ?? '') === (entry.stored_date ?? '')
        && (storedTime ?? '') === (entry.stored_time ?? '')

      const row = parseRow(tokens, colMap, isCurrent)
      if (!row) { totalSkipped++; continue }

      if (isCurrent) currentCount++
      totalParsed++
      batch.push(row)

      if (batch.length >= args.batchSize) {
        await flushBatch()
        if (totalParsed % 50000 === 0) {
          process.stdout.write(`  ${totalParsed.toLocaleString()} rows processed...\r`)
        }
      }
    }

    await flushBatch()

    console.log(`\nParsed:    ${totalParsed.toLocaleString()} rows`)
    console.log(`Skipped:   ${totalSkipped}`)
    console.log(`is_current: ${currentCount.toLocaleString()} rows marked true`)

    if (args.dryRun) {
      console.log('Dry run — no DB writes.')
      return
    }

    console.log(`Upserted:  ${totalUpserted.toLocaleString()} rows`)
    console.log('Import complete.')
  } finally {
    if (client) await client.end()
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
