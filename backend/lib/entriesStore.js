/**
 * Persistence for admin-managed project entries (Vercel Blob, private store).
 *
 * Serverless functions can't write to the local filesystem in production,
 * so unlike the legacy /backend/data/*.json files (read-only, bundled at
 * deploy time), these records live in a private Vercel Blob store and can
 * be created/edited at any time through the admin API. "Private" means the
 * blob requires the store's token to read — nothing here is fetchable by a
 * plain URL, and the frontend never sees one; it only ever gets JSON back
 * from /api/entries (published only) or /api/admin/projects (all, auth-gated).
 */

const { put, list, get } = require('@vercel/blob');
const crypto = require('crypto');

const PREFIX = 'admin-entries/';

function pathFor(id) {
  return `${PREFIX}${id}.json`;
}

async function readEntry(pathname) {
  // useCache: false — an admin editing/publishing a record needs to see its
  // own write immediately, not a CDN-cached copy from before the edit.
  const result = await get(pathname, { access: 'private', useCache: false });
  if (!result || !result.stream) return null;
  const text = await new Response(result.stream).text();
  return JSON.parse(text);
}

/** All entries (draft + published), newest edited first — for the admin dashboard. */
async function listAllEntries() {
  const { blobs } = await list({ prefix: PREFIX, access: 'private' });
  const entries = await Promise.all(blobs.map(b => readEntry(b.pathname)));
  return entries
    .filter(Boolean)
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

/** Published-only entries — for the public site. */
async function listPublishedEntries() {
  const all = await listAllEntries();
  return all.filter(e => e.status === 'published');
}

async function getEntry(id) {
  return readEntry(pathFor(id));
}

const REQUIRED_FIELDS = ['title', 'role', 'description', 'date', 'teamSize'];

function validateEntry(entry) {
  if (entry.status !== 'draft' && entry.status !== 'published') {
    return '상태(status)는 draft 또는 published 여야 합니다.';
  }
  if (entry.status === 'published') {
    for (const field of REQUIRED_FIELDS) {
      if (!entry[field] || !String(entry[field]).trim()) {
        return `공개하려면 모든 항목(참고사항 제외)을 입력해야 합니다. (누락: ${field})`;
      }
    }
  }
  return null;
}

/** Create (no id) or update (existing id) an entry. Returns the saved record. */
async function saveEntry(input) {
  const now = new Date().toISOString();
  const id = input.id || crypto.randomUUID();
  const isNew = !input.id;

  const entry = {
    id,
    title: (input.title || '').trim(),
    role: (input.role || '').trim(),
    description: (input.description || '').trim(),
    date: (input.date || '').trim(),
    teamSize: (input.teamSize || '').trim(),
    notes: (input.notes || '').trim(),
    status: input.status === 'published' ? 'published' : 'draft',
    createdAt: isNew ? now : (input.createdAt || now),
    updatedAt: now
  };

  const error = validateEntry(entry);
  if (error) {
    const err = new Error(error);
    err.statusCode = 400;
    throw err;
  }

  await put(pathFor(id), JSON.stringify(entry), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json'
  });

  return entry;
}

module.exports = { listAllEntries, listPublishedEntries, getEntry, saveEntry };
