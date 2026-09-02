import { createHmac, randomBytes, timingSafeEqual, createHash } from 'crypto'

// Server-only module (uses Node's `crypto`). Never import this from a
// 'use client' file.

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function base64urlJson(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url')
}

function parseBase64urlJson<T>(value: string): T | null {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T
  } catch {
    return null
  }
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

// -----------------------------------------------------------------------
// Shortcut session tokens
//
// Format: <base64url(payload json)>.<base64url(hmac)>
// The token itself is never stored — only sha256(token) lives in
// shortcut_sessions.token_hash, so a database leak alone can't be used to
// impersonate a running Shortcut session.
// -----------------------------------------------------------------------

export interface ShortcutTokenPayload {
  uid: string // user id
  cid: string // campaign id
  sid: string // random session id, ties the token to one shortcut_sessions row
  exp: number // unix seconds
}

export function createShortcutToken(payload: Omit<ShortcutTokenPayload, 'sid'>): {
  token: string
  tokenHash: string
  sid: string
} {
  const secret = requireEnv('SHORTCUT_TOKEN_SECRET')
  const sid = randomBytes(16).toString('hex')
  const full: ShortcutTokenPayload = { ...payload, sid }
  const encoded = base64urlJson(full)
  const signature = sign(encoded, secret)
  const token = `${encoded}.${signature}`
  const tokenHash = createHash('sha256').update(token).digest('hex')
  return { token, tokenHash, sid }
}

export function verifyShortcutToken(token: string): ShortcutTokenPayload | null {
  const secret = requireEnv('SHORTCUT_TOKEN_SECRET')
  const parts = token.split('.')
  const [encoded, signature] = parts
  if (parts.length !== 2 || !encoded || !signature) return null
  const expected = sign(encoded, secret)
  if (!safeEqual(signature, expected)) return null

  const payload = parseBase64urlJson<ShortcutTokenPayload>(encoded)
  if (!payload || typeof payload.exp !== 'number') return null
  if (payload.exp < Math.floor(Date.now() / 1000)) return null
  return payload
}

export function hashShortcutToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// -----------------------------------------------------------------------
// Public opt-out link tokens
//
// Embedded in every outgoing message's footer. Deliberately stateless and
// non-expiring (a recipient might tap it weeks after the text arrived) and
// keyed by phone number rather than contact id, so it keeps working even if
// the contact record is later edited, merged, or deleted.
// -----------------------------------------------------------------------

export interface OptOutTokenPayload {
  uid: string // the sending account's user id
  phone: string // E.164
}

export function createOptOutToken(payload: OptOutTokenPayload): string {
  const secret = requireEnv('OPT_OUT_TOKEN_SECRET')
  const encoded = base64urlJson(payload)
  const signature = sign(encoded, secret)
  return `${encoded}.${signature}`
}

export function verifyOptOutToken(token: string): OptOutTokenPayload | null {
  const secret = requireEnv('OPT_OUT_TOKEN_SECRET')
  const parts = token.split('.')
  const [encoded, signature] = parts
  if (parts.length !== 2 || !encoded || !signature) return null
  const expected = sign(encoded, secret)
  if (!safeEqual(signature, expected)) return null
  return parseBase64urlJson<OptOutTokenPayload>(encoded)
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not configured on the server`)
  return value
}
