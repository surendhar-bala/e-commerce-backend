import pg from 'pg'
import { env } from './env.js'

const { Pool } = pg

type PoolConfig = pg.PoolConfig

/**
 * pg requires `password` to be a string for SCRAM auth.
 * A bare connection URL like postgresql://localhost:5432/db leaves it undefined.
 */
function buildPoolConfig(): PoolConfig {
  const connectionString = env.databaseUrl

  try {
    const url = new URL(connectionString.replace(/^postgresql:\/\//i, 'postgres://'))
    const database = url.pathname.replace(/^\//, '')

    return {
      host: url.hostname || 'localhost',
      port: url.port ? Number(url.port) : 5432,
      user: decodeURIComponent(url.username || 'postgres'),
      password: decodeURIComponent(url.password),
      database: database || 'postgres',
      ssl: env.nodeEnv === 'production' ? { rejectUnauthorized: false } : undefined,
    }
  } catch {
    return {
      connectionString,
      ssl: env.nodeEnv === 'production' ? { rejectUnauthorized: false } : undefined,
    }
  }
}

let pool: pg.Pool | undefined

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool(buildPoolConfig())
  }
  return pool
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  return getPool().query<T>(text, params)
}

export function formatDatabaseStartupHint(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error)

  if (
    message.includes('password must be a string') ||
    message.includes('ECONNREFUSED') ||
    message.includes('does not exist') ||
    message.includes('password authentication failed')
  ) {
    return [
      '',
      'Database connection failed.',
      '1. Copy .env.example to .env in e-commerce-backend/',
      '2. Set DATABASE_URL with your PostgreSQL username and password, for example:',
      '   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/ecommerce',
      '3. Create the database and run: psql -U postgres -d ecommerce -f sql/schema.sql',
      '',
    ].join('\n')
  }

  return null
}
