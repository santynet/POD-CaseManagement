#!/usr/bin/env node
/**
 * Collection Agency reference-table importer (PVS3831-TBLDATA1-CAGENCY).
 *
 * Usage:
 *   npx tsx scripts/import-agencies.ts --file <path> [--dry-run]
 *
 * Requires DATABASE_URL in .env — copy from Supabase dashboard under
 *   Project Settings → Database → Connection pooler → Session mode URI.
 */

import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { resolve as pathResolve } from 'node:path'
import { Client } from 'pg'

// ---------- args ---------------------------------------------------------------

interface Args {
  file: string
  dryRun: boolean
}

function printHelp(): void {
  console.log(`
Usage: npm run import:agencies -- --file <path> [options]

Import collection agencies (PVS3831-TBLDATA1-CAGENCY.TXT) into the
collection_agencies table. Upserts on agency_code.

Options:
  --file <path>   Required. Path to the PVS tab-delimited agencies file.
  --dry-run       Parse and print only; no DB writes.
  --help, -h      Show this help message.

Requires DATABASE_URL in .env (Supabase → Settings → Database → Connection pooler, Session mode).
`.trim())
}

function parseArgs(argv: string[]): Args {
  const args: Args = { file: '', dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--file':       args.file = argv[++i]; break
      case '--dry-run':    args.dryRun = true; break
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

// ---------- parse --------------------------------------------------------------

interface AgencyRow {
  agency_code: string
  name: string
  short_name: string | null
  address: string | null
  city: string | null
  short_city: string | null
  state: string | null
  zipcode: string | null
  phone: string | null
  commission_pct: number | null
  allocation: number | null
  effective_start: string | null   // ISO date
  effective_end: string | null     // ISO date
}

const COLUMNS = [
  'PVS-TBL-NAME',
  'PVS-TBD1-NAME',
  'PVSWE-3831-CAGENCY-TBL-CODE',
  'FILLER',
  'PVSWE-3831-CAGENCY-NAME',
  'PVSWE-3831-CAGENCY-ADDRESS',
  'PVSWE-3831-CAGENCY-CITY',
  'PVSWE-3831-CAGENCY-STATE',
  'PVSWE-3831-CAGENCY-ZIPCODE',
  'PVSWE-3831-CAGENCY-PHONE',
  'PVSWE-3831-CAGENCY-COMMISSION',
  'PVSWE-3831-CAGENCY-ALLOCATION',
  'PVSWE-3831-CAGENCY-SHORT-NAME',
  'PVSWE-3831-CAGENCY-SHORT-CITY',
  'PVSWE-3831-CAGENCY-START-DATE',
  'PVSWE-3831-CAGENCY-END-DATE',
] as const

function parseDate(val: string): string | null {
  const s = val.trim()
  if (!s || s === '00000000') return null
  // YYYYMMDD → YYYY-MM-DD
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  return null
}

function parseRow(tokens: string[], colMap: Record<string, number>): AgencyRow {
  const get = (col: string) => (tokens[colMap[col]] ?? '').trim()

  const commRaw = get('PVSWE-3831-CAGENCY-COMMISSION')
  const allocRaw = get('PVSWE-3831-CAGENCY-ALLOCATION')

  return {
    agency_code:     get('PVSWE-3831-CAGENCY-TBL-CODE'),
    name:            get('PVSWE-3831-CAGENCY-NAME'),
    short_name:      get('PVSWE-3831-CAGENCY-SHORT-NAME') || null,
    address:         get('PVSWE-3831-CAGENCY-ADDRESS') || null,
    city:            get('PVSWE-3831-CAGENCY-CITY') || null,
    short_city:      get('PVSWE-3831-CAGENCY-SHORT-CITY') || null,
    state:           get('PVSWE-3831-CAGENCY-STATE') || null,
    zipcode:         get('PVSWE-3831-CAGENCY-ZIPCODE') || null,
    phone:           get('PVSWE-3831-CAGENCY-PHONE') || null,
    commission_pct:  commRaw ? Number(commRaw) : null,
    allocation:      allocRaw ? Number(allocRaw) : null,
    effective_start: parseDate(get('PVSWE-3831-CAGENCY-START-DATE')),
    effective_end:   parseDate(get('PVSWE-3831-CAGENCY-END-DATE')),
  }
}

// ---------- upsert -------------------------------------------------------------

async function upsert(client: Client, rows: AgencyRow[]): Promise<void> {
  if (rows.length === 0) return

  const values = rows.map((r, i) => {
    const b = i * 13
    return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9},$${b+10},$${b+11},$${b+12},$${b+13})`
  }).join(',')

  const params: unknown[] = []
  for (const r of rows) {
    params.push(
      r.agency_code, r.name, r.short_name, r.address, r.city,
      r.short_city, r.state, r.zipcode, r.phone,
      r.commission_pct, r.allocation, r.effective_start, r.effective_end,
    )
  }

  await client.query(`
    insert into public.collection_agencies
      (agency_code, name, short_name, address, city, short_city, state, zipcode, phone,
       commission_pct, allocation, effective_start, effective_end)
    values ${values}
    on conflict (agency_code) do update set
      name             = excluded.name,
      short_name       = excluded.short_name,
      address          = excluded.address,
      city             = excluded.city,
      short_city       = excluded.short_city,
      state            = excluded.state,
      zipcode          = excluded.zipcode,
      phone            = excluded.phone,
      commission_pct   = excluded.commission_pct,
      allocation       = excluded.allocation,
      effective_start  = excluded.effective_start,
      effective_end    = excluded.effective_end,
      updated_at       = now()
  `, params)
}

// ---------- main ---------------------------------------------------------------

async function main() {
  loadDotEnv()
  const args = parseArgs(process.argv.slice(2))

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) { console.error('Error: DATABASE_URL not set in .env'); process.exit(1) }

  const rl = createInterface({ input: createReadStream(args.file), crlfDelay: Infinity })
  const lines = await new Promise<string[]>((resolve) => {
    const acc: string[] = []
    rl.on('line', (l) => acc.push(l))
    rl.on('close', () => resolve(acc))
  })

  if (lines.length < 2) { console.error('File has no data rows.'); process.exit(1) }

  // Build column index from header
  const headerTokens = lines[0].split('\t').map((s) => s.trim())
  const colMap: Record<string, number> = {}
  headerTokens.forEach((name, idx) => { colMap[name] = idx })

  for (const col of COLUMNS) {
    if (!(col in colMap)) { console.error(`Missing column in header: ${col}`); process.exit(1) }
  }

  // Parse data rows
  const rows: AgencyRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const tokens = line.split('\t')
    const row = parseRow(tokens, colMap)
    if (!row.agency_code) { console.warn(`Row ${i + 1}: empty agency_code, skipping`); continue }
    rows.push(row)
  }

  console.log(`Parsed ${rows.length} agencies:`)
  for (const r of rows) {
    console.log(`  [${r.agency_code}] ${r.name} — ${r.city ?? ''}, ${r.state ?? ''} (commission: ${r.commission_pct}%)`)
  }

  if (args.dryRun) {
    console.log('\nDry run — no DB writes.')
    return
  }

  const client = new Client({ connectionString: dbUrl })
  await client.connect()
  try {
    await upsert(client, rows)
    console.log(`\nUpserted ${rows.length} agencies into collection_agencies.`)
  } finally {
    await client.end()
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
