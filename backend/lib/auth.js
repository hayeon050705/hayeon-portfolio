/**
 * Admin authentication.
 *
 * A single shared password (ADMIN_PASSWORD, set only as a Vercel
 * environment variable — never in code or in the frontend) protects the
 * admin API. On successful login we hand back a signed, HttpOnly cookie
 * (HMAC-SHA256 with SESSION_SECRET, also env-only) instead of a plain
 * flag, so a client can't forge or read a session on their own.
 */

const crypto = require('crypto');

const COOKIE_NAME = 'admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

function timingSafeEqualStr(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    // still run a compare of equal-length buffers so failure timing doesn't
    // leak the correct password's length
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function checkPassword(candidate) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return timingSafeEqualStr(candidate || '', expected);
}

function sign(payload) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function createSessionToken() {
  const payload = JSON.stringify({ exp: Date.now() + SESSION_TTL_SECONDS * 1000 });
  const encoded = Buffer.from(payload, 'utf-8').toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false;
  const [encoded, signature] = token.split('.');
  let expectedSig;
  try {
    expectedSig = sign(encoded);
  } catch {
    return false;
  }
  if (!timingSafeEqualStr(signature, expectedSig)) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'));
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  header.split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(val);
  });
  return out;
}

function isLocalRequest(req) {
  const host = req.headers.host || '';
  return host.startsWith('localhost') || host.startsWith('127.0.0.1');
}

function setSessionCookie(req, res, token) {
  const secureFlag = isLocalRequest(req) ? '' : ' Secure;';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly;${secureFlag} SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_SECONDS}`
  );
}

function clearSessionCookie(req, res) {
  const secureFlag = isLocalRequest(req) ? '' : ' Secure;';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly;${secureFlag} SameSite=Strict; Path=/; Max-Age=0`
  );
}

function isAuthenticated(req) {
  const cookies = parseCookies(req);
  return verifySessionToken(cookies[COOKIE_NAME]);
}

/** Wrap an API handler so it 401s unless a valid admin session cookie is present. */
function requireAuth(handler) {
  return async (req, res) => {
    if (!isAuthenticated(req)) {
      res.status(401).json({ error: '인증이 필요합니다.' });
      return;
    }
    return handler(req, res);
  };
}

module.exports = {
  checkPassword,
  createSessionToken,
  isAuthenticated,
  setSessionCookie,
  clearSessionCookie,
  requireAuth
};
