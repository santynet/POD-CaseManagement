#!/usr/bin/env node
/**
 * Court Locations importer (PVS3852-CRTLOC).
 *
 * Usage:
 *   npx tsx scripts/import-court-locations.ts --file <path> [--dry-run]
 *
 * Requires DATABASE_URL in .env — copy from Supabase dashboard under
 *   Project Settings → Database → Connection pooler → Session mode URI.
 */

import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { resolve as pathResolve } from 'node:path'
import { Client } from 'pg'

// ---------- args ---------------------------------------------------------------

interface Args { file: string; dryRun: boolean }

function printHelp(): void {
  console.log(`
Usage: npm run import:court-locations -- --file <path> [options]

Import court locations (PVS3852-CRTLOC.TXT) into the court_locations table.
Upserts on code.

Options:
  --file <path>   Required. Path to the PVS tab-delimited court locations file.
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

interface CourtLocationRow {
  code:           string
  name:           string | null
  address:        string | null
  city:           string | null
  state:          string | null
  zip:            string | null
  phone:          string | null
  last_chgd_id:   string | null
  last_chgd_date: string | null
  last_chgd_time: string | null
}

function parseDate(val: string): string | null {
  const s = val.trim()
  if (!s || s === '00000000') return null
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  return null
}

function parseRows(lines: string[]): CourtLocationRow[] {
  if (lines.length < 2) return []

  const headerTokens = lines[0].split('\t').map((s) => s.trim())
  const col: Record<string, number> = {}
  headerTokens.forEach((name, idx) => { col[name] = idx })

  const required = [
    'PVS-CLOC-CODE', 'PVS-CLOC-NAME', 'PVS-CLOC-ADDRESS', 'PVS-CLOC-CITY',
    'PVS-CLOC-STATE', 'PVS-CLOC-ZIP', 'PVS-CLOC-PHONE',
    'PVS-CLOC-LAST-CHGD-ID', 'PVS-CLOC-LAST-CHGD-DATE', 'PVS-CLOC-LAST-CHGD-TIME',
  ]
  for (const c of required) {
    if (!(c in col)) { console.error(`Missing column: ${c}`); process.exit(1) }
  }

  const get = (tokens: string[], name: string) => (tokens[col[name]] ?? '').trim()

  const rows: CourtLocationRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const tokens = line.split('\t')

    const code = get(tokens, 'PVS-CLOC-CODE')
    if (!code) { console.warn(`Row ${i + 1}: empty code, skipping`); continue }

    rows.push({
      code,
      name:           get(tokens, 'PVS-CLOC-NAME') || null,
      address:        get(tokens, 'PVS-CLOC-ADDRESS') || null,
      city:           get(tokens, 'PVS-CLOC-CITY') || null,
      state:          get(tokens, 'PVS-CLOC-STATE') || null,
      zip:            get(tokens, 'PVS-CLOC-ZIP') || null,
      phone:          get(tokens, 'PVS-CLOC-PHONE') || null,
      last_chgd_id:   get(tokens, 'PVS-CLOC-LAST-CHGD-ID') || null,
      last_chgd_date: parseDate(get(tokens, 'PVS-CLOC-LAST-CHGD-DATE')),
      last_chgd_time: get(tokens, 'PVS-CLOC-LAST-CHGD-TIME') || null,
    })
  }
  return rows
}

// ---------- upsert -------------------------------------------------------------

async function upsert(client: Client, rows: CourtLocationRow[]): Promise<void> {
  if (rows.length === 0) return

  const values = rows.map((_, i) => {
    const b = i * 10
    return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9},$${b+10})`
  }).join(',')

  const params: unknown[] = []
  for (const r of rows) {
    params.push(
      r.code, r.name, r.address, r.city, r.state,
      r.zip, r.phone, r.last_chgd_id, r.last_chgd_date, r.last_chgd_time,
    )
  }

  await client.query(`
    insert into public.court_locations
      (code, name, address, city, state, zip, phone, last_chgd_id, last_chgd_date, last_chgd_time)
    values ${values}
    on conflict (code) do update set
      name           = excluded.name,
      address        = excluded.address,
      city           = excluded.city,
      state          = excluded.state,
      zip            = excluded.zip,
      phone          = excluded.phone,
      last_chgd_id   = excluded.last_chgd_id,
      last_chgd_date = excluded.last_chgd_date,
      last_chgd_time = excluded.last_chgd_time,
      updated_at     = now()
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

  const rows = parseRows(lines)

  console.log(`Parsed ${rows.length} court locations:`)
  for (const r of rows) {
    console.log(`  [${r.code}] ${r.name ?? '—'}  ${r.address ?? '—'}, ${r.city ?? '—'}, ${r.state ?? '—'} ${r.zip ?? ''}`)
  }

  if (args.dryRun) {
    console.log('\nDry run — no DB writes.')
    return
  }

  const client = new Client({ connectionString: dbUrl })
  await client.connect()
  try {
    await upsert(client, rows)
    console.log(`\nUpserted ${rows.length} rows into court_locations.`)
  } finally {
    await client.end()
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
