#!/usr/bin/env node
/**
 * Statute reference-table importer (PVS3831-TBLDATA1-STATUTE).
 *
 * Usage:
 *   npx tsx scripts/import-statutes.ts --file <path> [--dry-run]
 *
 * Date rules applied during import:
 *   vio_code 001–010  → start_date 2000-01-01, end_date 2021-10-01
 *   vio_code 011–023  → start_date 2021-10-01, end_date null
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

function parseArgs(argv: string[]): Args {
  const args: Args = { file: '', dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--file': args.file = argv[++i]; break
      case '--dry-run': args.dryRun = true; break
    }
  }
  if (!args.file) { console.error('Error: --file is required'); process.exit(1) }
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

// ---------- date rules ---------------------------------------------------------

function resolveDates(vioCode: string): { start_date: string; end_date: string | null } {
  const n = parseInt(vioCode, 10)
  if (n >= 1 && n <= 10) return { start_date: '2000-01-01', end_date: '2021-10-01' }
  return { start_date: '2021-10-01', end_date: null }
}

// ---------- parse --------------------------------------------------------------

interface StatuteRow {
  vio_code: string
  statute: string
  description: string | null
  start_date: string
  end_date: string | null
}

function parseRows(lines: string[]): StatuteRow[] {
  if (lines.length < 2) return []

  const headerTokens = lines[0].split('\t').map((s) => s.trim())
  const col: Record<string, number> = {}
  headerTokens.forEach((name, idx) => { col[name] = idx })

  const required = ['PVSWE-3831-VIO', 'PVSWE-3831-CODE', 'PVSWE-3831-STATUTE-DESC']
  for (const c of required) {
    if (!(c in col)) { console.error(`Missing column: ${c}`); process.exit(1) }
  }

  const get = (tokens: string[], name: string) => (tokens[col[name]] ?? '').trim()

  const rows: StatuteRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const tokens = line.split('\t')
    const vioCode = get(tokens, 'PVSWE-3831-VIO').replace(/^0+/, '') || '0' // strip leading zeros → "001" → "1"
    const statute  = get(tokens, 'PVSWE-3831-CODE')
    const desc     = get(tokens, 'PVSWE-3831-STATUTE-DESC') || null

    if (!vioCode) { console.warn(`Row ${i + 1}: empty vio_code, skipping`); continue }

    const { start_date, end_date } = resolveDates(vioCode)
    rows.push({ vio_code: vioCode, statute, description: desc, start_date, end_date })
  }

  return rows
}

// ---------- upsert -------------------------------------------------------------

const BATCH = 200

async function upsertBatch(client: Client, rows: StatuteRow[]): Promise<void> {
  if (rows.length === 0) return

  const values = rows.map((_, i) => {
    const b = i * 5
    return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5})`
  }).join(',')

  const params: unknown[] = []
  for (const r of rows) {
    params.push(r.vio_code, r.statute, r.description, r.start_date, r.end_date)
  }

  await client.query(`
    insert into public.statutes (vio_code, statute, description, start_date, end_date)
    values ${values}
    on conflict (vio_code, statute) do update set
      description = excluded.description,
      start_date  = excluded.start_date,
      end_date    = excluded.end_date,
      updated_at  = now()
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

  // Summary by vio_code
  const byCode = new Map<string, number>()
  for (const r of rows) byCode.set(r.vio_code, (byCode.get(r.vio_code) ?? 0) + 1)
  console.log(`Parsed ${rows.length} statute rows across ${byCode.size} violation codes:`)
  for (const [code, count] of [...byCode.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))) {
    const { start_date, end_date } = resolveDates(code)
    console.log(`  vio ${code.padStart(3)}: ${count} statutes  [${start_date} → ${end_date ?? 'open'}]`)
  }

  if (args.dryRun) {
    console.log('\nDry run — no DB writes.')
    return
  }

  const client = new Client({ connectionString: dbUrl })
  await client.connect()
  try {
    for (let i = 0; i < rows.length; i += BATCH) {
      await upsertBatch(client, rows.slice(i, i + BATCH))
    }
    console.log(`\nUpserted ${rows.length} rows into statutes.`)
  } finally {
    await client.end()
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
