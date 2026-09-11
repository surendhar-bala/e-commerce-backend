import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('Set DATABASE_URL to your Neon connection string.')
  process.exit(1)
}

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaPath = path.join(rootDir, 'sql', 'schema.sql')
const sql = fs.readFileSync(schemaPath, 'utf8')

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
})

try {
  await client.connect()
  await client.query(sql)
  console.log('Schema applied successfully.')
} catch (error) {
  console.error('Schema migration failed:', error instanceof Error ? error.message : error)
  process.exit(1)
} finally {
  await client.end()
}
