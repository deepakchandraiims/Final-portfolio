// Cookie-based admin session auth.
// The admin password is NEVER sent back to the client and NEVER stored in
// localStorage — only an opaque, signed, httpOnly session cookie exists in
// the browser, which client-side JS cannot read at all.
import crypto from 'crypto'

export const ADMIN_COOKIE_NAME = 'admin_session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

function getPassword() {
  // Default password is literally "admin" per request. Override with
  // ADMIN_PASSWORD in your Vercel/deploy environment variables — the admin
  // login screen always shows a reminder of this.
  return process.env.ADMIN_PASSWORD || 'admin'
}

function getSecret() {
  // Used only to sign the session cookie (not the password itself).
  // Set ADMIN_SESSION_SECRET in production for a stable, private secret;
  // otherwise one is derived from the password so sessions still work.
  return process.env.ADMIN_SESSION_SECRET || crypto.createHash('sha256').update(`portfolio-session:${getPassword()}`).digest('hex')
}

function sign(payloadObj) {
  const data = Buffer.from(JSON.stringify(payloadObj)).toString('base64url')
  const sig = crypto.createHmac('sha256', getSecret()).update(data).digest('base64url')
  return `${data}.${sig}`
}

function verify(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const [data, sig] = token.split('.')
  try {
    const expected = crypto.createHmac('sha256', getSecret()).update(data).digest('base64url')
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'))
    if (!payload.exp || Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

// Constant-time password check (fixed-length hash comparison — safe even
// when the submitted password has a different length than the real one).
export function checkPassword(candidate) {
  const expected = crypto.createHash('sha256').update(getPassword()).digest()
  const actual = crypto.createHash('sha256').update(String(candidate || '')).digest()
  return crypto.timingSafeEqual(expected, actual)
}

export function buildSessionToken() {
  return sign({ role: 'admin', exp: Date.now() + MAX_AGE_SECONDS * 1000 })
}

export const SESSION_MAX_AGE = MAX_AGE_SECONDS

export function isAdminRequest(request) {
  const token = request.cookies?.get?.(ADMIN_COOKIE_NAME)?.value
  const payload = verify(token)
  return !!payload && payload.role === 'admin'
}

// ---- best-effort in-memory login rate limiting (per server instance) ----
const failures = new Map()
const WINDOW_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 8

export function isRateLimited(ip) {
  const rec = failures.get(ip)
  if (!rec) return false
  if (Date.now() > rec.resetAt) { failures.delete(ip); return false }
  return rec.count >= MAX_ATTEMPTS
}
export function recordFailure(ip) {
  const now = Date.now()
  const rec = failures.get(ip)
  if (!rec || now > rec.resetAt) failures.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  else rec.count += 1
}
export function clearFailures(ip) {
  failures.delete(ip)
}
export function clientIp(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
}
