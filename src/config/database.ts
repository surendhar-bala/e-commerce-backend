import pg from 'pg'
import { env } from './env.js'

const { Pool, Client } = pg

type PoolConfig = pg.PoolConfig

let pool: pg.Pool | undefined
let useHyperdriveClient = false

/** Use Hyperdrive's per-request client mode on Cloudflare Workers. */
export function enableHyperdriveClientMode() {
  useHyperdriveClient = true
  pool = undefined
}

function getConnectionString(): string {
  return env.databaseUrl
}

function isRemoteDatabase(connectionString: string): boolean {
  return (
    env.nodeEnv === 'production' ||
    /neon\.tech|hyperdrive|supabase|render\.com|railway\.app|sslmode=/i.test(connectionString)
  )
}

/**
 * pg requires `password` to be a string for SCRAM auth.
 * Hyperdrive/Neon URLs should be passed through as connectionString without extra SSL options.
 */
function buildPoolConfig(): PoolConfig {
  const connectionString = getConnectionString()

  if (isRemoteDatabase(connectionString)) {
    return {
      connectionString,
      max: 5,
    }
  }

  try {
    const url = new URL(connectionString.replace(/^postgresql:\/\//i, 'postgres://'))
    const database = url.pathname.replace(/^\//, '')

    return {
      host: url.hostname || 'localhost',
      port: url.port ? Number(url.port) : 5432,
      user: decodeURIComponent(url.username || 'postgres'),
      password: decodeURIComponent(url.password || ''),
      database: database || 'postgres',
    }
  } catch {
    return { connectionString }
  }
}

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool(buildPoolConfig())
  }
  return pool
}

async function queryWithHyperdriveClient<T extends pg.QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  const client = new Client({ connectionString: getConnectionString() })

  try {
    await client.connect()
    return await client.query<T>(text, params)
  } finally {
    await client.end()
  }
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  if (useHyperdriveClient) {
    return queryWithHyperdriveClient<T>(text, params)
  }

  return getPool().query<T>(text, params)
}

export function formatDatabaseStartupHint(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error)

  if (
    message.includes('password must be a string') ||
    message.includes('ECONNREFUSED') ||
    message.includes('does not exist') ||
    message.includes('password authentication failed') ||
    message.includes('relation') ||
    message.includes('SSL')
  ) {
    return [
      '',
      'Database connection failed.',
      message,
      '1. Verify Hyperdrive is linked to your Neon database in Cloudflare.',
      '2. Run sql/schema.sql against Neon: npm run db:schema',
      '',
    ].join('\n')
  }

  return null
}
