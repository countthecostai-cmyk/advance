import { createHmac, timingSafeEqual } from 'crypto'

// Server-only. The long-lived link an iPhone automation uses to ask "is anything
// due?". It only ever lets the holder start campaigns THIS person already
// scheduled. Signed under a "sched:" prefix so it can't be confused with the
// other tokens that share SHORTCUT_TOKEN_SECRET. Revoked by rotating the
// person's schedule_nonce.
function secret(): string {
  const v = process.env.SHORTCUT_TOKEN_SECRET
  if (!v) throw new Error('SHORTCUT_TOKEN_SECRET is not configured on the server')
  return v
}

function sign(encoded: string): string {
  return createHmac('sha256', secret()).update(`sched:${encoded}`).digest('base64url')
}

export function createScheduleToken(userId: string, nonce: string): string {
  const encoded = Buffer.from(JSON.stringify({ u: userId, n: nonce })).toString('base64url')
  return `${encoded}.${sign(encoded)}`
}

export function verifyScheduleToken(token: string): { userId: string; nonce: string } | null {
  const parts = token.split('.')
  const [encoded, signature] = parts
  if (parts.length !== 2 || !encoded || !signature) return null
  const expected = Buffer.from(sign(encoded))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const p = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (typeof p.u !== 'string' || typeof p.n !== 'string') return null
    return { userId: p.u, nonce: p.n }
  } catch {
    return null
  }
}
