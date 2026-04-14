#!/usr/bin/env node
/**
 * PVS legacy file importer.
 *
 * Usage:
 *   npx tsx scripts/import-pvs.ts --file path/to/pvs3805.txt [flags]
 *
 * Flags:
 *   --file <path>         Required. Path to the PVS tab-delimited file.
 *   --batch-size <n>      Default 500.
 *   --from-line <n>       Default 2. Resume from a given line (1-based).
 *   --limit <n>           Stop after N data rows.
 *   --dry-run             Parse and validate only; no DB writes.
 *   --error-log <path>    Default ./import-errors.log.
 *   --source <tag>        Default PVS3805.
 *
 * Requires DATABASE_URL in .env — copy from the Supabase dashboard under
 *   Project Settings → Database → Connection pooler → Session mode URI.
 */

import { createReadStream, appendFileSync, writeFileSync, existsSync, unlinkSync, readFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { resolve as pathResolve } from 'node:path'
import { Client } from 'pg'
import { parseHeader, parsePvsRow } from './import/parsePvsRow'
import type { ParsedRow } from './import/types'

// ---------- args --------------------------------------------------------------

interface Args {
  file: string
  batchSize: number
  fromLine: number
  limit: number | null
  dryRun: boolean
  errorLog: string
  source: string
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    file: '',
    batchSize: 500,
    fromLine: 2,
    limit: null,
    dryRun: false,
    errorLog: './import-errors.log',
    source: 'PVS3805',
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = () => argv[++i]
    switch (a) {
      case '--file': args.file = next(); break
      case '--batch-size': args.batchSize = Number(next()); break
      case '--from-line': args.fromLine = Number(next()); break
      case '--limit': args.limit = Number(next()); break
      case '--dry-run': args.dryRun = true; break
      case '--error-log': args.errorLog = next(); break
      case '--source': args.source = next(); break
      case '-h':
      case '--help':
        console.log(
          'Usage: tsx scripts/import-pvs.ts --file <path> [--batch-size N] [--from-line N] [--limit N] [--dry-run] [--error-log path] [--source tag]',
        )
        process.exit(0)
    }
  }
  if (!args.file) {
    console.error('Error: --file is required')
    process.exit(1)
  }
  return args
}

// ---------- env loading (minimal, no dotenv dep) ------------------------------

function loadDotEnv(): void {
  const path = pathResolve(process.cwd(), '.env')
  if (!existsSync(path)) return
  const contents = readFileSync(path, 'utf8')
  for (const line of contents.split(/\r?\n/)) {
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

// ---------- upsert helpers ----------------------------------------------------

async function upsertBatch(client: Client, rows: ParsedRow[]): Promise<void> {
  if (rows.length === 0) return
  await client.query('begin')
  try {
    // 1. Upsert plates, keyed by (plate_number, state).
    const plateKeys = new Map<string, { number: string; state: string }>()
    for (const r of rows) {
      const key = `${r.plate.plate_number}|${r.plate.state}`
      if (!plateKeys.has(key)) {
        plateKeys.set(key, { number: r.plate.plate_number, state: r.plate.state })
      }
    }
    const plateList = Array.from(plateKeys.values())
    const plateParams: unknown[] = []
    const plateVals: string[] = []
    plateList.forEach((p, i) => {
      const base = i * 3
      plateParams.push(p.number, p.state, 'Found')
      plateVals.push(`($${base + 1}, $${base + 2}, $${base + 3})`)
    })
    const plateRes = await client.query(
      `insert into plates (plate_number, state, lookup_status)
       values ${plateVals.join(',')}
       on conflict (plate_number, state) do update set lookup_status = excluded.lookup_status
       returning id, plate_number, state`,
      plateParams,
    )
    const plateIdMap = new Map<string, string>()
    for (const row of plateRes.rows) {
      plateIdMap.set(`${row.plate_number}|${row.state}`, row.id)
    }

    // 2. Upsert citations.
    const citationParams: unknown[] = []
    const citationVals: string[] = []
    rows.forEach((r, i) => {
      const c = r.citation
      const plateId = plateIdMap.get(`${r.plate.plate_number}|${r.plate.state}`)
      const base = i * 26
      citationParams.push(
        c.citation_number,
        c.violation_code,
        c.violation_description,
        c.ordinance_or_statute,
        c.location,
        c.incident_date,
        c.entered_date,
        c.notice_date,
        c.disposition_date,
        c.court_date,
        c.closed_date,
        c.issuing_officer,
        c.agency,
        plateId ?? null,
        c.primary_status,
        c.secondary_disposition,
        c.fine_amount,
        c.balance,
        c.is_in_collections,
        c.vehicle_make,
        c.vehicle_body_style,
        c.vehicle_color,
        c.vehicle_year,
        c.legacy_source,
        c.legacy_disposition_code,
        JSON.stringify({
          operator: c.legacy_operator_id,
          municipality: c.legacy_municipality_code,
          raw: c.legacy_raw,
        }),
      )
      const p = (n: number) => `$${base + n}`
      citationVals.push(
        `(${p(1)},${p(2)},${p(3)},${p(4)},${p(5)},${p(6)},${p(7)},${p(8)},${p(9)},${p(10)},${p(11)},${p(12)},${p(13)},${p(14)},${p(15)}::case_status,${p(16)}::case_disposition,${p(17)},${p(18)},${p(19)},${p(20)},${p(21)},${p(22)},${p(23)},${p(24)},${p(25)},${p(26)}::jsonb)`,
      )
    })
    const citationRes = await client.query(
      `insert into citations (
         citation_number, violation_code, violation_description, ordinance_or_statute,
         location, incident_date, entered_date, notice_date, disposition_date,
         court_date, closed_date, issuing_officer, agency, plate_id,
         primary_status, secondary_disposition, fine_amount, balance, is_in_collections,
         vehicle_make, vehicle_body_style, vehicle_color, vehicle_year,
         legacy_source, legacy_disposition_code, legacy_raw
       )
       values ${citationVals.join(',')}
       on conflict (citation_number) do update set
         violation_code = excluded.violation_code,
         violation_description = excluded.violation_description,
         ordinance_or_statute = excluded.ordinance_or_statute,
         location = excluded.location,
         incident_date = excluded.incident_date,
         entered_date = excluded.entered_date,
         notice_date = excluded.notice_date,
         disposition_date = excluded.disposition_date,
         court_date = excluded.court_date,
         closed_date = excluded.closed_date,
         issuing_officer = excluded.issuing_officer,
         agency = excluded.agency,
         plate_id = excluded.plate_id,
         primary_status = excluded.primary_status,
         secondary_disposition = excluded.secondary_disposition,
         fine_amount = excluded.fine_amount,
         balance = excluded.balance,
         is_in_collections = excluded.is_in_collections,
         vehicle_make = excluded.vehicle_make,
         vehicle_body_style = excluded.vehicle_body_style,
         vehicle_color = excluded.vehicle_color,
         vehicle_year = excluded.vehicle_year,
         legacy_source = excluded.legacy_source,
         legacy_disposition_code = excluded.legacy_disposition_code,
         legacy_raw = excluded.legacy_raw,
         updated_at = now()
       returning id, citation_number`,
      citationParams,
    )
    const caseIdMap = new Map<string, string>()
    for (const row of citationRes.rows) caseIdMap.set(row.citation_number, row.id)

    // 3. Upsert ledger entries (source='import').
    const ledgerParams: unknown[] = []
    const ledgerVals: string[] = []
    let li = 0
    for (const r of rows) {
      const caseId = caseIdMap.get(r.citation.citation_number)
      if (!caseId) continue
      for (const l of r.ledger) {
        const base = li * 7
        ledgerParams.push(caseId, l.entry_type, l.debit, l.credit, l.description, l.entered_at, l.source_key)
        ledgerVals.push(
          `($${base + 1}, $${base + 2}::ledger_entry_type, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, 'import', $${base + 7})`,
        )
        li++
      }
    }
    if (ledgerVals.length) {
      await client.query(
        `insert into ledger_entries (case_id, entry_type, debit, credit, description, entered_at, source, source_key)
         values ${ledgerVals.join(',')}
         on conflict (case_id, source_key) where source = 'import' do update set
           entry_type = excluded.entry_type,
           debit = excluded.debit,
           credit = excluded.credit,
           description = excluded.description,
           entered_at = excluded.entered_at`,
        ledgerParams,
      )
    }

    // 4. Upsert docket entries (source='import').
    const docketParams: unknown[] = []
    const docketVals: string[] = []
    let di = 0
    for (const r of rows) {
      const caseId = caseIdMap.get(r.citation.citation_number)
      if (!caseId) continue
      for (const d of r.docket) {
        const base = di * 6
        docketParams.push(caseId, d.event_type, d.event_at, d.description, JSON.stringify(d.metadata), d.source_key)
        docketVals.push(
          `($${base + 1}, $${base + 2}::docket_event_type, $${base + 3}, $${base + 4}, $${base + 5}::jsonb, 'import', $${base + 6})`,
        )
        di++
      }
    }
    if (docketVals.length) {
      await client.query(
        `insert into docket_entries (case_id, event_type, event_at, description, metadata, source, source_key)
         values ${docketVals.join(',')}
         on conflict (case_id, source_key) where source = 'import' do update set
           event_type = excluded.event_type,
           event_at = excluded.event_at,
           description = excluded.description,
           metadata = excluded.metadata`,
        docketParams,
      )
    }

    await client.query('commit')
  } catch (err) {
    await client.query('rollback')
    throw err
  }
}

// ---------- main --------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2))
  loadDotEnv()

  const dbUrl = process.env.DATABASE_URL
  if (!args.dryRun && !dbUrl) {
    console.error('Error: DATABASE_URL is not set in environment or .env')
    console.error('Get it from Supabase → Project Settings → Database → Connection pooler (Session mode).')
    process.exit(1)
  }

  const client = args.dryRun
    ? null
    : new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
      })

  if (client) {
    await client.connect()
    console.log('Connected to Postgres.')
  }

  // Clear the error log on start.
  if (existsSync(args.errorLog)) unlinkSync(args.errorLog)
  writeFileSync(args.errorLog, '')

  const stream = createReadStream(args.file, { encoding: 'utf8' })
  const rl = createInterface({ input: stream, crlfDelay: Infinity })

  let lineNumber = 0
  let colMap: Record<string, number> | null = null
  const batch: ParsedRow[] = []
  let processed = 0
  let errors = 0
  let parsed = 0
  const importDate = new Date()
  const started = Date.now()
  let shuttingDown = false

  process.on('SIGINT', () => {
    console.log('\nSIGINT received — flushing current batch and exiting.')
    shuttingDown = true
  })

  async function flushBatch() {
    if (batch.length === 0) return
    if (!args.dryRun && client) {
      try {
        await upsertBatch(client, batch)
      } catch (err) {
        errors += batch.length
        const msg = (err as Error).message
        for (const row of batch) {
          appendFileSync(args.errorLog, `line ${row.lineNumber}: ${msg}\n`)
        }
      }
    }
    processed += batch.length
    const elapsed = (Date.now() - started) / 1000
    const rate = Math.round(processed / Math.max(elapsed, 0.001))
    console.log(`  processed=${processed} parsed=${parsed} errors=${errors} rate=${rate}/s`)
    batch.length = 0
  }

  for await (const line of rl) {
    lineNumber++
    if (lineNumber === 1) {
      colMap = parseHeader(line)
      continue
    }
    if (!colMap) throw new Error('internal: header not parsed')
    if (lineNumber < args.fromLine) continue
    if (!line || line.trim().length === 0) continue
    if (args.limit !== null && parsed >= args.limit) break
    if (shuttingDown) break

    const tokens = line.split('\t')
    try {
      const row = parsePvsRow(tokens, colMap, { lineNumber, source: args.source, importDate })
      batch.push(row)
      parsed++
    } catch (err) {
      errors++
      appendFileSync(args.errorLog, `line ${lineNumber}: parse error: ${(err as Error).message}\n`)
    }

    if (batch.length >= args.batchSize) {
      await flushBatch()
    }
  }

  await flushBatch()
  if (client) await client.end()

  const elapsed = ((Date.now() - started) / 1000).toFixed(1)
  console.log(`\nDone. processed=${processed} parsed=${parsed} errors=${errors} elapsed=${elapsed}s`)
  console.log(args.dryRun ? '(dry-run — no DB writes)' : `Errors logged to ${args.errorLog}`)

  if (errors > 0 && errors / Math.max(parsed, 1) > 0.1) {
    console.error('Error rate exceeded 10%.')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
