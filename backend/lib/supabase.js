/**
 * Supabase connection.
 *
 * publicDb()  — publishable key. Row Level Security applies: it can only read
 *               what visitors are allowed to see (published rows).
 * adminDb()   — secret key. Bypasses Row Level Security: server code only
 *               (admin routes, saving reservations). Never send it to the browser.
 *
 * Both read their settings from environment variables, so no key lives in code:
 *   SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY
 */

const { createClient } = require('@supabase/supabase-js');

const OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };
let publicClient = null;
let adminClient = null;

function need(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} 환경변수가 설정되지 않았습니다.`);
  return value;
}

function publicDb() {
  if (!publicClient) {
    publicClient = createClient(need('SUPABASE_URL'), need('SUPABASE_PUBLISHABLE_KEY'), OPTIONS);
  }
  return publicClient;
}

function adminDb() {
  if (!adminClient) {
    adminClient = createClient(need('SUPABASE_URL'), need('SUPABASE_SECRET_KEY'), OPTIONS);
  }
  return adminClient;
}

module.exports = { publicDb, adminDb };
