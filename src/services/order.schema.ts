import { query } from '../config/database.js'

export async function ensureOrderSchema() {
  await query(`
    ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20);
  `)
}
