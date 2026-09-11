import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../config/database.js'
import { env } from '../config/env.js'
import type { UserRole, UserRow } from '../types/index.js'
import { AppError } from '../utils/errors.js'

export type PublicUser = {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
}

export type AuthSession = {
  user: PublicUser
  accessToken: string
}

function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? undefined,
    role: row.role,
  }
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '')
}

function signToken(user: PublicUser) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  })
}

export async function registerUser(input: {
  name: string
  email: string
  phone: string
  password: string
  role?: UserRole
}): Promise<AuthSession> {
  const email = input.email.trim().toLowerCase()
  const phone = normalizePhone(input.phone)
  const role: UserRole = input.role === 'seller' ? 'seller' : 'customer'

  const existing = await query<{ id: string }>(
    'SELECT id FROM users WHERE LOWER(email) = $1 OR phone = $2 LIMIT 1',
    [email, phone],
  )
  if (existing.rows[0]) {
    throw new AppError('An account with this email or phone already exists.', 409, 'EMAIL_TAKEN')
  }

  const passwordHash = await bcrypt.hash(input.password, 10)
  const result = await query<UserRow>(
    `INSERT INTO users (name, email, phone, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.name.trim(), email, phone, passwordHash, role],
  )

  const user = toPublicUser(result.rows[0])
  return { user, accessToken: signToken(user) }
}

export async function loginUser(email: string, password: string): Promise<AuthSession> {
  const result = await query<UserRow>('SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1', [
    email.trim().toLowerCase(),
  ])
  const row = result.rows[0]
  if (!row) {
    throw new AppError('Email or password is incorrect.', 401, 'INVALID_CREDENTIALS')
  }

  const valid = await bcrypt.compare(password, row.password_hash)
  if (!valid) {
    throw new AppError('Email or password is incorrect.', 401, 'INVALID_CREDENTIALS')
  }

  const user = toPublicUser(row)
  return { user, accessToken: signToken(user) }
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  const result = await query<UserRow>('SELECT * FROM users WHERE id = $1 LIMIT 1', [id])
  return result.rows[0] ? toPublicUser(result.rows[0]) : null
}

export async function emailExists(email: string): Promise<boolean> {
  const result = await query<{ id: string }>(
    'SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1',
    [email.trim().toLowerCase()],
  )
  return Boolean(result.rows[0])
}

export async function resetPasswordByEmail(email: string, password: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase()
  const result = await query<{ id: string }>(
    'SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1',
    [normalizedEmail],
  )
  if (!result.rows[0]) {
    throw new AppError('No account found with this email address.', 404, 'EMAIL_NOT_FOUND')
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE LOWER(email) = $2',
    [passwordHash, normalizedEmail],
  )
}

export async function seedDemoSeller() {
  const email = 'seller@velora.studio'
  const existing = await query('SELECT id FROM users WHERE LOWER(email) = $1', [email])
  if (existing.rows[0]) {
    return
  }

  const passwordHash = await bcrypt.hash('sellwell1', 10)
  await query(
    `INSERT INTO users (name, email, phone, password_hash, role)
     VALUES ($1, $2, $3, $4, 'seller')`,
    ['Asha Mehta', email, '9876543210', passwordHash],
  )
}
