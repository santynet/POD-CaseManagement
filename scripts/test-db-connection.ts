/**
 * Minimal Postgres connection diagnostic. Run with:
 *   npx tsx scripts/test-db-connection.ts
 *
 * Reports which phase failed (URL parse, TCP, SSL handshake, auth, query)
 * so we can target the actual problem rather than guessing.
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { Client } from 'pg'

function loadEnv() {
  const path = resolve(process.cwd(), '.env')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (!(k in process.env)) process.env[k] = v
  }
}

async function main() {
  loadEnv()
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('FAIL: DATABASE_URL is not set in .env')
    process.exit(1)
  }

  // Parse the URL by hand so we can print it with the password masked.
  try {
    const u = new URL(url)
    const masked = `${u.protocol}//${u.username}:***@${u.host}${u.pathname}${u.search}`
    console.log(`DATABASE_URL (masked): ${masked}`)
    console.log(`  host: ${u.hostname}`)
    console.log(`  port: ${u.port}`)
    console.log(`  user: ${u.username}`)
    console.log(`  pass length: ${u.password.length} chars`)
    console.log(`  db:   ${u.pathname.replace(/^\//, '')}`)
  } catch (err) {
    console.error('FAIL: URL parse error ->', (err as Error).message)
    process.exit(1)
  }

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    // Short-circuit hanging handshakes so we fail fast.
    connectionTimeoutMillis: 15_000,
    statement_timeout: 10_000,
  })

  console.log('\n[1/3] connecting (TCP + SSL + auth)...')
  try {
    await client.connect()
    console.log('      ok')
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { code?: string }
    console.error(`      FAIL code=${e.code ?? '(none)'} message=${e.message}`)
    console.error(
      '\nInterpretation:\n' +
        '  ECONNRESET       = server or middlebox reset during handshake (SSL or auth)\n' +
        '  28P01            = password authentication failed (wrong password)\n' +
        '  28000            = invalid authorization specification\n' +
        '  ETIMEDOUT        = TCP did not establish (firewall drop)\n' +
        '  ENOTFOUND        = DNS failure\n' +
        '  SELF_SIGNED_CERT = SSL cert validation failed\n',
    )
    process.exit(1)
  }

  console.log('[2/3] running a trivial query...')
  try {
    const res = await client.query('select current_user, current_database(), version()')
    console.log('      ok ->', res.rows[0])
  } catch (err) {
    console.error('      FAIL ->', (err as Error).message)
    await client.end()
    process.exit(1)
  }

  console.log('[3/3] counting citations...')
  try {
    const res = await client.query('select count(*)::int as n from citations')
    console.log(`      ok -> citations.count = ${res.rows[0].n}`)
  } catch (err) {
    console.error('      FAIL ->', (err as Error).message)
  }

  await client.end()
  console.log('\nAll good. The pg client can talk to Supabase. If the import still fails, it is not a connectivity problem.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
