#!/usr/bin/env node
/**
 * Court Disposition Codes reference-table importer (PVS3832-TBLDATA2-CRTDISP).
 *
 * Usage:
 *   npx tsx scripts/import-disposition-codes.ts --file <path> [--dry-run]
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
Usage: npm run import:dispositions -- --file <path> [options]

Import court disposition codes (PVS3832-TBLDATA2-CRTDISP.TXT) into the
disposition_codes table. Upserts on crtdisp.

Options:
  --file <path>   Required. Path to the PVS tab-delimited disposition codes file.
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

interface DispositionRow {
  crtdisp: string
  last_update_date: string | null
  description: string | null
  active: boolean
}

function parseDate(val: string): string | null {
  const s = val.trim()
  if (!s || s === '00000000') return null
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  return null
}

function parseRows(lines: string[]): DispositionRow[] {
  if (lines.length < 2) return []

  const headerTokens = lines[0].split('\t').map((s) => s.trim())
  const col: Record<string, number> = {}
  headerTokens.forEach((name, idx) => { col[name] = idx })

  const required = [
    'PVSWE-3832-CD-TBL-CRTDISP',
    'PVSWE-TBD2-LAST-UPDATE-DATE',
    'PVSWE-3832-CD-DESCRIPTION',
    'PVSWE-3832-CD-ACTIVE',
  ]
  for (const c of required) {
    if (!(c in col)) { console.error(`Missing column: ${c}`); process.exit(1) }
  }

  const get = (tokens: string[], name: string) => (tokens[col[name]] ?? '').trim()

  const rows: DispositionRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const tokens = line.split('\t')

    const crtdisp = get(tokens, 'PVSWE-3832-CD-TBL-CRTDISP')
    if (!crtdisp) { console.warn(`Row ${i + 1}: empty crtdisp, skipping`); continue }

    rows.push({
      crtdisp,
      last_update_date: parseDate(get(tokens, 'PVSWE-TBD2-LAST-UPDATE-DATE')),
      description:      get(tokens, 'PVSWE-3832-CD-DESCRIPTION') || null,
      active:           get(tokens, 'PVSWE-3832-CD-ACTIVE').toUpperCase() === 'Y',
    })
  }
  return rows
}

// ---------- upsert -------------------------------------------------------------

async function upsertBatch(client: Client, rows: DispositionRow[]): Promise<void> {
  if (rows.length === 0) return

  const values = rows.map((_, i) => {
    const b = i * 4
    return `($${b+1},$${b+2},$${b+3},$${b+4})`
  }).join(',')

  const params: unknown[] = []
  for (const r of rows) {
    params.push(r.crtdisp, r.last_update_date, r.description, r.active)
  }

  await client.query(`
    insert into public.disposition_codes (crtdisp, last_update_date, description, active)
    values ${values}
    on conflict (crtdisp) do update set
      last_update_date = excluded.last_update_date,
      description      = excluded.description,
      active           = excluded.active,
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

  const rows = parseRows(lines)
  const active   = rows.filter((r) => r.active).length
  const inactive = rows.length - active

  console.log(`Parsed ${rows.length} disposition codes (${active} active, ${inactive} inactive):`)
  for (const r of rows) {
    console.log(`  [${r.crtdisp}] ${r.description ?? '—'}  active=${r.active}  updated=${r.last_update_date ?? '—'}`)
  }

  if (args.dryRun) {
    console.log('\nDry run — no DB writes.')
    return
  }

  const client = new Client({ connectionString: dbUrl })
  await client.connect()
  try {
    await upsertBatch(client, rows)
    console.log(`\nUpserted ${rows.length} rows into disposition_codes.`)
  } finally {
    await client.end()
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
